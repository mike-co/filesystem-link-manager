import { ProgressLocation, window, workspace } from 'vscode';
import { DomainError } from '../../../common';
import { executeWorkflow } from './execute-workflow.function';
import { readJson } from 'fs-extra';
import type { ExecuteUnifiedWorkflowParams } from '../types/execute-unified-workflow-params.interface';

/**
 * Execute workflow using configuration from either external JSON file or VS Code settings.
 * Coordinates complete symlink creation workflow with unified logic for both config sources.
 * 
 * This function provides a unified interface for executing workflows regardless of configuration source,
 * handling configuration loading, validation, and delegating to the core workflow execution logic.
 * 
 * @param params - Configuration and service parameters for workflow execution
 * @param params.configSource - Source of configuration ('file' or 'settings')
 * @param params.configPath - Path to configuration file (required when configSource is 'file')
 * @param params.logger - Logger service for operation logging
 * @param params.configParserService - Service for parsing and validating configuration
 * @param params.copyManagerService - Service for file and directory copy operations
 * @param params.linkManagerService - Service for symlink creation operations
 * @param params.commandExecutorService - Service for executing post-workflow commands
 * @param params.fileDiscoveryService - Service for discovering files and directories
 * @param params.attributeAdjustmentService - Service for adjusting file attributes
 * @returns Promise resolving to true if workflow executed successfully, false otherwise
 * @throws {DomainError} When configuration validation fails or workflow execution encounters errors
 */
export async function executeUnifiedWorkflow(
    params: ExecuteUnifiedWorkflowParams
): Promise<boolean> {
    const {
        configSource,
        configPath,
        logger,
        configParserService,
        copyManagerService,
        linkManagerService,
        commandExecutorService,
        fileDiscoveryService,
        attributeAdjustmentService
    } = params;

    const operationName = configSource === 'file' ? 'executeConfigFileWorkflow' : 'executeSettingsWorkflow';
    const sourceDescription = configSource === 'file' ? 'config file' : 'settings';
    const progressTitle = `FS link manager: Executing workflow from ${sourceDescription}`;

    logger.info(`Workflow execution from ${sourceDescription} initiated`, {
        operation: operationName,
        ...(configSource === 'file' && configPath && { filePath: configPath }),
    });

    return window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: progressTitle,
            cancellable: false,
        },
        async (progress) => {
            try {
                // Step 1: Load configuration data based on source
                progress.report({ increment: 0, message: 'Loading configuration...' });

                let configData: unknown;

                if (configSource === 'file') {
                    if (!configPath) {
                        throw new DomainError({
                            key: 'CONFIG_FILE_PATH_MISSING',
                            message: 'Configuration file path is required for file-based workflow',
                            description: 'configPath parameter must be provided when configSource is "file"'
                        });
                    }

                    // Read JSON configuration file
                    configData = await readJson(configPath);

                    logger.debug('Configuration file read successfully', {
                        operation: operationName,
                        filePath: configPath,
                    });
                } else {
                    // Read configuration from VS Code settings
                    const configuration = workspace.getConfiguration('filesystemLinkManager');
                    configData = configuration.get<unknown>('config');
                }

                progress.report({ increment: 10, message: 'Configuration loaded successfully' });

                // Get workspace root directory for path resolution
                const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;

                // Step 2: Execute workflow with configuration parsing and validation
                const workflowResult = await executeWorkflow({
                    configData,
                    logger,
                    configParserService,
                    copyManagerService,
                    linkManagerService,
                    commandExecutorService,
                    progress,
                    initialProgressIncrement: 10,
                    workspaceRoot,
                    fileDiscoveryService,
                    attributeAdjustmentService
                });

                if (!workflowResult) {
                    return false;
                }

                // Show non-blocking success notification
                window.showInformationMessage(
                    `FS link manager workflow executed successfully from ${sourceDescription}!`,
                    'Show Output'
                ).then(selection => {
                    if (selection === 'Show Output') {
                        // Could open output channel here if needed
                        logger.info('User requested to show output', {
                            operation: operationName,
                        });
                    }
                });

                logger.info(`Workflow execution from ${sourceDescription} completed successfully`, {
                    operation: operationName,
                    ...(configSource === 'file' && configPath && { filePath: configPath }),
                });

                return true;
            } catch (error) {
                progress.report({ increment: 100, message: 'Workflow failed' });

                if (error instanceof Error && error.name === 'ZodError') {
                    throw new DomainError({
                        key: 'CONFIG_VALIDATION_ERROR',
                        message: `Configuration validation failed: ${error.message}`,
                        description: 'The configuration file does not match the expected schema',
                    }, { cause: error });
                }

                throw error;
            }
        }
    );
}
