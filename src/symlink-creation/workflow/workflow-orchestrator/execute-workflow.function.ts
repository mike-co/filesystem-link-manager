import { isAbsolute, relative, resolve } from 'path';
import { Progress, window } from 'vscode';
import { DomainError } from '../../../common';
import { LoggerService } from '../../../logging';
import { FileAttributeAdjustment, FileSystemAction, FileSystemItemType, FileSystemOperationConfig } from '../../config';
import { CopyManagerService, CopyOperationResult } from '../../copying';
import { FileDiscoveryService } from '../../discovery';
import { CommandExecutorService } from '../../execution';
import { AttributeAdjustmentService, FileAttributeAdjustmentEntry } from '../../file-attribute';
import { DirectoryLinkOptions, FileLinkOptions, LinkManagerService } from '../../linking';
import { ExecuteWorkflowParams } from '../types/execute-workflow-params.interface';

/**
 * Execute workflow operations with configuration parsing and validation.
 * 
 * Contains the complete workflow logic including config parsing, file copying, symlink creation, 
 * and post-execution commands. This is the core workflow function that performs the actual
 * operations after configuration has been loaded and validated.
 * 
 * The function executes operations in the following order:
 * 1. Configuration parsing and validation
 * 2. File system operations (copying and linking)
 * 3. File attribute adjustments
 * 4. Post-execution commands
 * 
 * @param params - Required services, configuration data, and progress reporter for workflow execution
 * @returns Promise resolving to true if workflow executed successfully, false if cancelled by user
 * @throws {DomainError} When workflow execution fails due to validation errors or operation failures
 */
export async function executeWorkflow(params: ExecuteWorkflowParams): Promise<boolean> {
    const {
        configData,
        logger,
        configParserService,
        copyManagerService,
        linkManagerService,
        commandExecutorService,
        fileDiscoveryService,
        progress,
        initialProgressIncrement,
        attributeAdjustmentService,
        workspaceRoot
    } = params;

    // Parse and validate configuration
    progress.report({ increment: 0, message: 'Parsing and validating configuration...' });
    const config: FileSystemOperationConfig = await configParserService.parseConfiguration(configData);

    // Convert relative paths to absolute
    resolveTargetPath(config, logger, workspaceRoot);

    progress.report({ increment: 10, message: 'Configuration validation successful' });
    logger.info('Configuration validation successful', {
        operation: 'executeWorkflow',
        targetPath: config.targetDirectoryPath,
    });

    // Calculate total operations for progress tracking
    const totalOperations = calculateTotalOperations(config);

    // Create parameters for step execution functions
    const stepParams: StepExecutionParams = {
        config,
        logger,
        copyManagerService,
        linkManagerService,
        commandExecutorService,
        fileDiscoveryService,
        progress,
        attributeAdjustmentService,
        initialProgressIncrement,
        totalOperations,
        completedOperations: 0
    };

    try {
        // Step 1: Execute operations
        const result = await executeFileSystemOperations(stepParams);
        stepParams.completedOperations = result.completedOperations;

        // Step 2: Execute file attribute adjustments
        stepParams.completedOperations = await executeFileAttributeAdjustments(stepParams, result.orderedOperations);

        // Step 3: Execute post-execution commands
        await executePostExecutionCommands(stepParams);
    } catch (error) {
        if (error instanceof Error && error.message === 'Workflow cancelled by user') {
            return false;
        }
        throw error;
    }

    progress.report({ increment: 100, message: 'Workflow completed successfully' });
    logger.info('Workflow execution completed successfully', {
        operation: 'executeWorkflow',
        processedCount: stepParams.completedOperations,
    });

    return true;
}

/**
 * Interface for pairing operation source with its discovered destination.
 */
interface OperationWithDestination {
    itemType: FileSystemItemType;
    action: FileSystemAction;
    fileAttributeAdjustment?: FileAttributeAdjustment;
    sourcePath: string;
    destinationPath: string;
}

/**
 * Parameters for step execution functions.
 */
interface StepExecutionParams {
    config: FileSystemOperationConfig;
    logger: LoggerService;
    copyManagerService: CopyManagerService;
    linkManagerService: LinkManagerService;
    commandExecutorService: CommandExecutorService;
    attributeAdjustmentService: AttributeAdjustmentService;
    fileDiscoveryService: FileDiscoveryService;
    progress: Progress<{ increment?: number; message?: string }>;
    initialProgressIncrement: number;
    totalOperations: number;
    completedOperations: number;
}

/**
 * Result of workflow operation execution.
 */
interface OperationExecutionResult {
    completedOperations: number;
    orderedOperations: OperationWithDestination[];
}

/**
 * Execute file system operations (copying and linking).
 */
async function executeFileSystemOperations(params: StepExecutionParams): Promise<OperationExecutionResult> {
    const { config, logger, fileDiscoveryService, progress, initialProgressIncrement, totalOperations, completedOperations } = params;

    let currentCompletedOperations = completedOperations;
    const operations = config.operations ?? [];

    if (operations.length === 0) {
        return { completedOperations: currentCompletedOperations, orderedOperations: [] };
    }

    // Discover all files and directories
    const discoveredOperations = await discoverOperations(config, fileDiscoveryService, logger);

    // Organize operations by type
    const {
        directoryCopyOperations,
        directorySymlinkOperations,
        fileCopyOperations,
        fileHardlinkOperations,
        fileSymlinkOperations
    } = organizeOperationsByType(discoveredOperations);

    let finalOperations: {
        directoryCopy: OperationWithDestination[];
        fileCopy: OperationWithDestination[];
        directorySymlink: OperationWithDestination[];
        fileSymlink: OperationWithDestination[];
        fileHardlink: OperationWithDestination[];
    };

    // Perform deduplication if enabled
    if (config.enableSourceDeduplication === true) {
        logger.debug('Operation deduplication started', {
            operation: 'executeWorkflow',
            processedCount: discoveredOperations.length,
        });

        const copyResult = await deduplicateFileDirectoryOperations(
            [...directoryCopyOperations, ...fileCopyOperations],
            logger
        );
        const linkResult = await deduplicateFileDirectoryOperations(
            [...directorySymlinkOperations, ...fileHardlinkOperations, ...fileSymlinkOperations],
            logger
        );
        const copyAndLinkResult = await deduplicateFileDirectoryOperations(
            [...copyResult.directoryOperations, ...linkResult.directoryOperations, ...copyResult.fileOperations, ...linkResult.fileOperations],
            logger
        );

        finalOperations = {
            directoryCopy: copyAndLinkResult.directoryOperations.filter(op => op.action === 'copy'),
            fileCopy: copyAndLinkResult.fileOperations.filter(op => op.action === 'copy'),
            directorySymlink: copyAndLinkResult.directoryOperations.filter(op => op.action === 'symlink'),
            fileSymlink: copyAndLinkResult.fileOperations.filter(op => op.action === 'symlink'),
            fileHardlink: copyAndLinkResult.fileOperations.filter(op => op.action === 'hardlink')
        };

        logger.debug('Operation deduplication finished', {
            operation: 'executeWorkflow',
            processedCount: Object.values(finalOperations).flat().length,
        });
    } else {
        finalOperations = {
            directoryCopy: directoryCopyOperations,
            fileCopy: fileCopyOperations,
            directorySymlink: directorySymlinkOperations,
            fileSymlink: fileSymlinkOperations,
            fileHardlink: fileHardlinkOperations
        };

        logger.debug('Operation deduplication skipped for performance', {
            operation: 'executeWorkflow',
            processedCount: Object.values(finalOperations).flat().length,
        });
    }

    const directoryCopyFileCount = await fileDiscoveryService.countFilesInDirectories(
        finalOperations.directoryCopy.map(op => op.sourcePath)
    );

    const directorySymlinkFileCount = await fileDiscoveryService.countFilesInDirectories(
        finalOperations.directorySymlink.map(op => op.sourcePath)
    );

    const totalFilesCount = directoryCopyFileCount+ directorySymlinkFileCount + finalOperations.fileCopy.length + finalOperations.fileSymlink.length + finalOperations.fileHardlink.length;

    // Check symlink count threshold before proceeding
    if (config.fileCountPromptThreshold && totalFilesCount > config.fileCountPromptThreshold) {
        await confirmFileCount(totalFilesCount, logger);
    }

    // Execute copy operations
    const directoryCopyResults = await executeCopyOperations(finalOperations.directoryCopy, 'directories', params);
    const fileCopyResults = await executeCopyOperations(finalOperations.fileCopy, 'files', params);

    // Aggregate all copy operation errors and handle them
    const allCopyResults = [...directoryCopyResults, ...fileCopyResults];
    const failedCopyOperations = allCopyResults.filter(result => result.status === 'error');
    
    if (failedCopyOperations.length > 0) {
        await handleCopyOperationErrors(failedCopyOperations, logger);
    }

    // Filter out failed copy operations from final operations
    const failedSourcePaths = new Set(failedCopyOperations.map(op => op.sourcePath));
    const successfulDirectoryCopy = finalOperations.directoryCopy.filter(op => !failedSourcePaths.has(op.sourcePath));
    const successfulFileCopy = finalOperations.fileCopy.filter(op => !failedSourcePaths.has(op.sourcePath));
    const finalCopyOperations = [...successfulDirectoryCopy, ...successfulFileCopy];

    // Execute linking operations
    const orderedLinkOperations = [
        ...finalOperations.directorySymlink,
        ...finalOperations.fileHardlink,
        ...finalOperations.fileSymlink
    ];
    if (orderedLinkOperations.length > 0) {
        const totalFilesCount = directorySymlinkFileCount + finalOperations.fileSymlink.length + finalOperations.fileHardlink.length;

        await executeSymlinkOperations(orderedLinkOperations, totalFilesCount, params);
    }

    currentCompletedOperations += operations.length;
    const currentProgress = calculateProgress(currentCompletedOperations, totalOperations, initialProgressIncrement);
    progress.report({
        increment: currentProgress - initialProgressIncrement,
        message: 'File system operations completed'
    });

    logger.info('File system operations completed successfully', {
        operation: 'executeWorkflow',
        processedCount: orderedLinkOperations.length,
    });

    return {
        completedOperations: currentCompletedOperations, 
        orderedOperations: [
            ...finalCopyOperations, 
            ...orderedLinkOperations
        ]
    };
}

/**
 * Calculate progress percentage based on completed operations.
 */
function calculateProgress(completed: number, total: number, initialProgressIncrement: number): number {
    const operationProgressRange = 100 - initialProgressIncrement;
    return total > 0 ? Math.round((completed / total) * operationProgressRange) + initialProgressIncrement : 100;
}

/**
 * Calculate total operations for progress tracking.
 */
function calculateTotalOperations(config: FileSystemOperationConfig): number {
    let totalOperations = 0;

    if (config.operations) {
        totalOperations += config.operations.length;
    }
    // File attribute adjustments count as one operation step
    totalOperations += 1;
    if (config.postExecutionCommands) {
        totalOperations += config.postExecutionCommands.length;
    }

    return totalOperations;
}

/**
 * Convert relative target directory path to absolute using workspace root.
 */
function resolveTargetPath(config: FileSystemOperationConfig, logger: LoggerService, workspaceRoot?: string): void {
    if (!isAbsolute(config.targetDirectoryPath)) {
        if (!workspaceRoot) {
            throw new DomainError({
                key: 'WORKSPACE_ROOT_NOT_FOUND',
                message: 'VS Code workspace root directory not found',
                description: 'FS link manager requires an open workspace to resolve relative paths'
            });
        }
        const originalPath = config.targetDirectoryPath;
        config.targetDirectoryPath = resolve(workspaceRoot, config.targetDirectoryPath);
        logger.debug('Converted relative path to absolute using workspace root', {
            operation: 'executeWorkflow',
            filePath: originalPath,
            targetPath: config.targetDirectoryPath,
            workingDirectory: workspaceRoot,
        });
    }
}

/**
 * Asks user how to proceed when a symlink already exists.
 */
async function handleSymlinkOverwriteBehavior(
    sourcePath: string,
    targetPath: string,
    existingPath: string,
    config: FileSystemOperationConfig
): Promise<FileSystemOperationConfig['defaultOverwriteBehavior']> {
    if (config.silentMode) {
        return config.defaultOverwriteBehavior;
    }

    const message = [
        `A symlink already exists at:`,
        `  ${targetPath} → ${existingPath}`,
        '',
        `Do you want to replace it with:`,
        `  ${targetPath} → ${sourcePath}`,
        '',
        `Choose what to do:`
    ].join('\n');

    const optionMap = {
        'Replace symlink': 'overwrite',
        'Skip (leave existing)': 'skip',
        'Cancel (abort operation)': 'error'
    } as const;

    const result = await window.showInformationMessage(
        message,
        { modal: true },
        ...Object.keys(optionMap)
    );

    return result ? optionMap[result as keyof typeof optionMap] : 'error';
}

/**
 * Asks user how to proceed when backup files already exist during file attribute adjustment.
 */
async function handleFileAttributeBackupOverwriteBehavior(
    backupPaths: string[],
    config: FileSystemOperationConfig
): Promise<FileSystemOperationConfig['defaultOverwriteBehavior']> {
    if (config.silentMode) {
        return config.defaultOverwriteBehavior;
    }

    const pathsList = backupPaths.map(path => `  ${path}`).join('\n');
    const message = [
        `Backup files already exist at:`,
        pathsList,
        '',
        `These files contain previous attribute change records.`,
        `Do you want to replace them with new backup files?`,
        '',
        `Choose what to do:`
    ].join('\n');

    const optionMap = {
        'Replace backup files': 'overwrite',
        'Skip (keep existing)': 'skip'
    } as const;

    const result = await window.showInformationMessage(
        message,
        { modal: true },
        ...Object.keys(optionMap)
    );

    return result ? optionMap[result as keyof typeof optionMap] : 'error';
}

/**
 * Confirm with user before creating large number of symlinks.
 */
async function confirmFileCount(totalFilesCount: number, logger: LoggerService): Promise<void> {
    const result = await window.showInformationMessage(
        `FS link manager will create ${totalFilesCount} links with files. Do you want to continue?`,
        { modal: true },
        'Continue'
    );

    if (result !== 'Continue') {
        logger.info('Workflow cancelled by user during symlink count confirmation', {
            operation: 'executeWorkflow',
            processedCount: totalFilesCount,
        });
        throw new Error('Workflow cancelled by user');
    }
}

/**
 * Ask user how to proceed when copy operations have failed.
 */
async function handleCopyOperationErrors(
    failedOperations: CopyOperationResult[],
    logger: LoggerService
): Promise<void> {
    const failedSources = failedOperations.map(op => op.sourcePath);
    const sourcesList = failedSources.map(path => `  ${path}`).join('\n');
    
    const message = [
        `Some copy operations failed for ${failedOperations.length} items:`,
        sourcesList,
        '',
        'Do you want to continue with the workflow, or abort?',
        '',
        'Note: Failed copy operations will be skipped, but other operations may continue.'
    ].join('\n');

    const result = await window.showInformationMessage(
        message,
        { modal: true },
        'Continue',
        'Show Details'
    );

    if (result === 'Show Details') {
        // Show detailed error information
        const errorDetails = failedOperations.map(op => 
            `${op.sourcePath}: ${op.error?.message || 'Unknown error'}`
        ).join('\n  ');
        
        const detailMessage = [
            `Copy operation failures (${failedOperations.length} items):`,
            `  ${errorDetails}`,
            '',
            'Do you want to continue with the workflow?'
        ].join('\n');
        
        const detailResult = await window.showInformationMessage(
            detailMessage,
            { modal: true },
            'Continue'
        );
        
        if (detailResult !== 'Continue') {
            logger.info('Workflow cancelled by user after viewing copy operation error details', {
                operation: 'executeWorkflow',
                processedCount: failedOperations.length,
            });
            throw new Error('Workflow cancelled by user');
        }
    } else if (result !== 'Continue') {
        logger.info('Workflow cancelled by user due to copy operation failures', {
            operation: 'executeWorkflow',
            processedCount: failedOperations.length,
        });
        throw new Error('Workflow cancelled by user');
    }
    
    // Log that user chose to continue despite errors
    logger.info('User chose to continue workflow despite copy operation failures', {
        operation: 'executeWorkflow',
        processedCount: failedOperations.length,
        failedSources: failedSources,
    });
}

/**
 * Performs basic deduplication based on sourcePath-destinationPath combination.
 */
function performBasicDeduplication(operations: OperationWithDestination[]): Map<string, OperationWithDestination> {
    const operationMap = new Map<string, OperationWithDestination>();

    for (const operation of operations) {
        const operationKey = `${operation.sourcePath}>${operation.destinationPath}`;

        // Only add if not already present (first occurrence wins)
        if (!operationMap.has(operationKey)) {
            operationMap.set(operationKey, {
                sourcePath: operation.sourcePath,
                destinationPath: operation.destinationPath,
                itemType: operation.itemType,
                fileAttributeAdjustment: operation.fileAttributeAdjustment,
                action: operation.action
            });
        }
    }

    return operationMap;
}

/**
 * Removes operations that are covered by other operations based on hierarchical relationships.
 */
async function removeRedundantOperations(
    operationsToFilter: OperationWithDestination[],
    coveringOperations: OperationWithDestination[],
    logger: LoggerService
): Promise<OperationWithDestination[]> {
    return operationsToFilter.filter(operation => {
        // Check if any covering operation would include this operation
        return !coveringOperations.some(coveringOp => {
            // Don't compare with itself (important for directory-directory comparisons)
            if (operation === coveringOp) {
                return false;
            }

            // Check if this operation's source is within the covering operation's source
            const relativeToParent = relative(coveringOp.sourcePath, operation.sourcePath);
            const isWithinSource = !relativeToParent.startsWith('..') && relativeToParent !== '.';

            if (isWithinSource) {
                // Check if this operation's destination would be within the covering operation's destination
                const expectedDestination = resolve(coveringOp.destinationPath, relativeToParent);
                const isDestinationMatching = expectedDestination === operation.destinationPath;

                if (isDestinationMatching) {
                    logger.debug(`Removing redundant ${operation.itemType} operation covered by ${coveringOp.itemType} operation`, {
                        operation: 'executeWorkflow',
                        filePath: operation.sourcePath,
                        targetPath: operation.destinationPath,
                    });
                    return true; // Operation is covered, remove it
                }
            }
            return false;
        });
    });
}

/**
 * Performs comprehensive deduplication of file-directory operations.
 */
async function deduplicateFileDirectoryOperations(
    operations: OperationWithDestination[],
    logger: LoggerService
): Promise<{
    directoryOperations: OperationWithDestination[];
    fileOperations: OperationWithDestination[];
}> {
    // Step 1: Basic deduplication based on sourcePath-destinationPath combination
    const operationMap = performBasicDeduplication(operations);

    // Convert to array and separate directories from files
    const deduplicatedOperations = Array.from(operationMap.values());
    let directoryOperations = deduplicatedOperations.filter(op => op.itemType === 'directory');
    let fileOperations = deduplicatedOperations.filter(op => op.itemType === 'file');

    // Step 2: Advanced deduplication - Remove directory operations covered by other directories
    directoryOperations = await removeRedundantOperations(directoryOperations, directoryOperations, logger);

    // Step 3: Advanced deduplication - Remove file operations covered by directories
    fileOperations = await removeRedundantOperations(fileOperations, directoryOperations, logger);

    return {
        directoryOperations,
        fileOperations
    };
}

/**
 * Discover files and directories for operations.
 */
async function discoverOperations(
    config: FileSystemOperationConfig,
    fileDiscoveryService: FileDiscoveryService,
    logger: LoggerService
): Promise<OperationWithDestination[]> {
    const operations = config.operations ?? [];
    const discoveredOperations: OperationWithDestination[] = [];

    logger.info('Discovering files and directories for operations', {
        operation: 'executeWorkflow',
        processedCount: operations.length,
    });

    // Discover all files and directories from each source
    for (const source of operations) {
        const sourcePaths = new Set<string>();

        if (source.itemType === 'file') {
            // Discover files matching search patterns
            const discoveredFiles = await fileDiscoveryService.discoverFiles(
                source.baseDirectoryPath,
                source.searchPatterns
            );
            discoveredFiles.forEach(file => sourcePaths.add(file));

            logger.debug('Discovered files for operation', {
                operation: 'executeWorkflow',
                filePath: source.baseDirectoryPath,
                processedCount: discoveredFiles.length,
            });
        } else if (source.itemType === 'directory') {
            if (source.searchPatterns) {
                const directoriesToLink = await fileDiscoveryService.discoverDirectories(
                    source.baseDirectoryPath,
                    source.searchPatterns
                );
                directoriesToLink.forEach(dir => sourcePaths.add(dir));
                logger.debug('Added directories for operation from searchPatterns', {
                    operation: 'executeWorkflow',
                    filePath: source.baseDirectoryPath,
                    processedCount: directoriesToLink.length,
                });
            }
        }

        if (sourcePaths.size > 0) {
            for (const sourcePath of sourcePaths) {
                const relativePath = relative(source.baseDirectoryPath, sourcePath);
                // Combine with target directory to get final target path
                const destinationPath = resolve(config.targetDirectoryPath, source.destinationPath ?? '', relativePath);
                discoveredOperations.push({
                    itemType: source.itemType,
                    action: source.action,
                    destinationPath,
                    sourcePath,
                    fileAttributeAdjustment: source.fileAttributeAdjustment
                });
            }
        }
    }

    return discoveredOperations;
}

/**
 * Organize operations by type and action.
 */
function organizeOperationsByType(operations: OperationWithDestination[]): {
    directoryCopyOperations: OperationWithDestination[];
    directorySymlinkOperations: OperationWithDestination[];
    fileCopyOperations: OperationWithDestination[];
    fileHardlinkOperations: OperationWithDestination[];
    fileSymlinkOperations: OperationWithDestination[];
} {
    return {
        directoryCopyOperations: operations.filter(op => op.itemType === 'directory' && op.action === 'copy'),
        directorySymlinkOperations: operations.filter(op => op.itemType === 'directory' && op.action === 'symlink'),
        fileCopyOperations: operations.filter(op => op.itemType === 'file' && op.action === 'copy'),
        fileHardlinkOperations: operations.filter(op => op.itemType === 'file' && op.action === 'hardlink'),
        fileSymlinkOperations: operations.filter(op => op.itemType === 'file' && op.action === 'symlink')
    };
}

/**
 * Execute copy operations for files or directories.
 */
async function executeCopyOperations(
    operations: OperationWithDestination[],
    operationType: 'files' | 'directories',
    params: StepExecutionParams
): Promise<CopyOperationResult[]> {
    const { config, logger, copyManagerService, progress, initialProgressIncrement, totalOperations, completedOperations } = params;

    if (operations.length === 0) {
        return [];
    }

    progress.report({
        increment: 0,
        message: `Copying ${operations.length} ${operationType}...`
    });

    logger.info(`Executing ${operationType} copy operations`, {
        operation: 'executeWorkflow',
        processedCount: operations.length,
    });

    let copyResults: CopyOperationResult[];
    if (operationType === 'directories') {
        copyResults = await copyManagerService.copyDirectories(
            operations,
            config.silentMode || false,
            config.defaultOverwriteBehavior
        );
    } else {
        copyResults = await copyManagerService.copyFiles(
            operations,
            config.silentMode || false,
            config.defaultOverwriteBehavior
        );
    }

    const currentProgress = calculateProgress(completedOperations + operations.length, totalOperations, initialProgressIncrement);
    progress.report({
        increment: currentProgress - initialProgressIncrement,
        message: `${operationType} copy operations completed`
    });

    return copyResults;
}


/**
 * Execute symlink creation operations.
 */
async function executeSymlinkOperations(
    operations: OperationWithDestination[],
    totalFilesCount: number,
    params: StepExecutionParams
): Promise<void> {
    const { config, logger, linkManagerService, progress, initialProgressIncrement, totalOperations, completedOperations } = params;

    progress.report({
        increment: 0,
        message: `${operations.length} steps to creating symlinks (${totalFilesCount} total files)...`
    });

    logger.info('Executing symlink creation operations', {
        operation: 'executeWorkflow',
        processedCount: operations.length,
    });

    let symlinkOperationsCompleted = 0;

    for (const operation of operations) {
        if (operation.itemType === 'directory') {
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
                handleOverwriteBehaviorFunc: (source, target, existing) =>
                    handleSymlinkOverwriteBehavior(source, target, existing, config),
                createParentDirectories: true
            };

            await linkManagerService.createDirectorySymlink(operation.sourcePath, operation.destinationPath, options);
        } else if (operation.itemType === 'file' && operation.action !== 'copy') {
            const options: FileLinkOptions = {
                itemType: 'file',
                handleOverwriteBehaviorFunc: (source, target, existing) =>
                    handleSymlinkOverwriteBehavior(source, target, existing, config),
                createParentDirectories: true,
                action: operation.action
            };

            await linkManagerService.createFileLink(operation.sourcePath, operation.destinationPath, options);
        }

        symlinkOperationsCompleted++;

        // Update progress periodically
        if (symlinkOperationsCompleted % 10 === 0 || symlinkOperationsCompleted === operations.length) {
            const currentProgress = calculateProgress(
                completedOperations + (symlinkOperationsCompleted / operations.length),
                totalOperations,
                initialProgressIncrement
            );
            progress.report({
                increment: currentProgress - initialProgressIncrement,
                message: `Completed steps ${symlinkOperationsCompleted}/${operations.length} to create symlinks...`
            });
        }
    }

    progress.report({
        increment: 0,
        message: `Symlink creation completed (${totalFilesCount} total files linked)`
    });
}

/**
 * Execute file attribute adjustment operations.
 */
async function executeFileAttributeAdjustments(
    params: StepExecutionParams,
    orderedOperations: OperationWithDestination[]
): Promise<number> {
    const { config, logger, progress, attributeAdjustmentService, initialProgressIncrement, totalOperations, completedOperations } = params;

    let currentCompletedOperations = completedOperations;

    // Filter operations that have file attribute adjustments defined
    const operationsWithAdjustments = orderedOperations.filter(
        operation => operation.fileAttributeAdjustment !== undefined
    );

    if (operationsWithAdjustments.length > 0) {
        progress.report({
            increment: 0,
            message: `Processing file attribute adjustments for ${operationsWithAdjustments.length} items...`
        });

        logger.info('Processing file attribute adjustments', {
            operation: 'executeWorkflow',
            processedCount: operationsWithAdjustments.length,
        });

        // Build FileAttributeAdjustmentEntry array from filtered operations
        const adjustmentEntries: FileAttributeAdjustmentEntry[] = operationsWithAdjustments.map(operation => ({
            itemType: operation.itemType,
            action: operation.action,
            fileAttributeAdjustment: operation.fileAttributeAdjustment,
            destinationPath: operation.destinationPath,
            sourcePath: operation.sourcePath,
            targetDirectoryPath: config.targetDirectoryPath,
            handleOverwriteBehaviorFunc: (backupPaths: string[]) =>
                handleFileAttributeBackupOverwriteBehavior(backupPaths, config)
        }));

        // Process file attribute adjustments using the service
        await attributeAdjustmentService.processFileAttributeAdjustments(adjustmentEntries);

        logger.info('File attribute adjustments completed successfully', {
            operation: 'executeWorkflow',
            processedCount: operationsWithAdjustments.length,
        });

        const currentProgress = calculateProgress(currentCompletedOperations + 1, totalOperations, initialProgressIncrement);
        progress.report({
            increment: currentProgress - initialProgressIncrement,
            message: `File attribute adjustments completed for ${operationsWithAdjustments.length} items`
        });
    } else {
        logger.debug('No file attribute adjustments required', {
            operation: 'executeWorkflow',
        });
    }

    // Count as one operation step regardless of number of entries processed
    currentCompletedOperations += 1;

    return currentCompletedOperations;
}

/**
 * Execute post-execution commands.
 */
async function executePostExecutionCommands(params: StepExecutionParams): Promise<number> {
    const { config, logger, commandExecutorService, progress, completedOperations } = params;

    let currentCompletedOperations = completedOperations;

    if (config.postExecutionCommands && config.postExecutionCommands.length > 0) {
        progress.report({
            increment: 0,
            message: `Executing ${config.postExecutionCommands.length} post-commands...`
        });

        logger.info('Executing post-execution commands', {
            operation: 'executeWorkflow',
            processedCount: config.postExecutionCommands.length,
        });

        for (const command of config.postExecutionCommands) {
            let cwdPath = config.targetDirectoryPath;
            if (command.cwd) {
                // Resolve to absolute path if not already absolute
                cwdPath = isAbsolute(command.cwd) ? command.cwd : resolve(config.targetDirectoryPath, command.cwd);
            }

            // Execute the command with target directory as working directory
            const success = await commandExecutorService.executeCommand(config.targetDirectoryPath, {
                ...command,
                cwd: cwdPath
            });

            if (!success) {
                logger.warn('Post-execution command failed', {
                    operation: 'executeWorkflow',
                    command: command.command
                });
            }
        }

        currentCompletedOperations += config.postExecutionCommands.length;
        progress.report({
            increment: 100,
            message: 'Post-execution commands completed'
        });
    }

    return currentCompletedOperations;
}