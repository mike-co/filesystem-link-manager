import { pathExists } from 'fs-extra';
import * as path from 'path';
import { injectable } from 'tsyringe';
import { LoggerService } from '../../logging';
import type { DirectoryToCopy, FileSystemOperationConfig, FileToCopy } from '../config';
import { copyFileOrDirectory } from './copy-manager/copy-file-or-directory.function';
import { handleOverwrite } from './copy-manager/handle-overwrite.function';
import { CopyOperationResult } from './copy-operation-result.interface';
import { DomainError } from '../../common/domain.error';
import { COPYING_DOMAIN_ERRORS } from './copying-domain-errors.const';

/**
 * Service class for file and directory copy management operations.
 */
@injectable()
export class CopyManagerService {
    /**
     * Constructs a new CopyManagerService with injected dependencies.
     * 
     * @param loggerService - LoggerService instance injected via DI container
     */
    public constructor(private readonly loggerService: LoggerService) {}
    /**
     * Copy files to destination paths relative to target directory.
     * Orchestrates file copying operations using pure functions.
     * 
     * @param targetPath - The target directory path where files will be copied.
     * @param filesToCopy - Array of file copy configurations with source and destination paths.
     * @param silentMode - Whether to operate in silent mode without user prompts.
     * @param defaultOverwriteBehavior - The overwrite behavior ('overwrite' or 'skip').
     * @returns Promise resolving to array of detailed copy operation results.
     */
    public async copyFiles(
        filesToCopy: FileToCopy[],
        silentMode: boolean,
        defaultOverwriteBehavior: FileSystemOperationConfig['defaultOverwriteBehavior']
    ): Promise<CopyOperationResult[]> {
        return this.performCopyOperation(
            filesToCopy,
            silentMode,
            defaultOverwriteBehavior,
            'copyFiles'
        );
    }

    /**
     * Copy directories into target directory preserving structure.
     * Orchestrates directory copying operations using pure functions.
     * 
     * @param targetPath - The target directory path where directories will be copied.
     * @param directoriesToCopy - Array of directory copy configurations with source and destination paths.
     * @param silentMode - Whether to operate in silent mode without user prompts.
     * @param defaultOverwriteBehavior - The overwrite behavior ('overwrite' or 'skip').
     * @returns Promise resolving to array of detailed copy operation results.
     */
    public async copyDirectories(
        directoriesToCopy: DirectoryToCopy[],
        silentMode: boolean,
        defaultOverwriteBehavior: FileSystemOperationConfig['defaultOverwriteBehavior']
    ): Promise<CopyOperationResult[]> {
        return this.performCopyOperation(
            directoriesToCopy,
            silentMode,
            defaultOverwriteBehavior,
            'copyDirectories'
        );
    }

    /**
     * Common copy operation logic for both files and directories.
     * Orchestrates the copy process including overwrite handling and result tracking.
     * 
     * @param targetPath - The target directory path where items will be copied.
     * @param itemsToCopy - Array of copy configurations with source and destination paths.
     * @param silentMode - Whether to operate in silent mode without user prompts.
     * @param defaultOverwriteBehavior - The overwrite behavior ('overwrite' or 'skip').
     * @param operationName - Name of the operation for logging (e.g., 'copyFiles', 'copyDirectories').
     * @param itemOperationName - Name of the individual item operation for logging (e.g., 'copyFile', 'copyDirectory').
     * @returns Promise resolving to array of detailed copy operation results.
     */
    private async performCopyOperation(
        itemsToCopy: FileToCopy[] | DirectoryToCopy[],
        silentMode: boolean,
        defaultOverwriteBehavior: FileSystemOperationConfig['defaultOverwriteBehavior'],
        operationName: string
    ): Promise<CopyOperationResult[]> {
        this.loggerService.info(`${operationName} operation initiated`, {
            operation: operationName
        });

        const results: CopyOperationResult[] = [];

        for (const itemConfig of itemsToCopy) {
            const targetItemPath = itemConfig.destinationPath;
            // Validate that destination path is absolute - throw domain error if not
            if (!path.isAbsolute(targetItemPath)) {
                const message = `Destination path must be absolute: ${targetItemPath}`;
                // Log reason for easier debugging
                this.loggerService.debug('Invalid destination path detected', {
                    operation: operationName,
                    filePath: itemConfig.sourcePath,
                    targetPath: targetItemPath,
                    reason: message,
                });
                // Use COPY_TYPE to indicate invalid type/format for destination path and include cause
                throw new DomainError({ ...COPYING_DOMAIN_ERRORS.COPY_TYPE, message }, { cause: targetItemPath });
            }
            try {
                const targetExists = await pathExists(targetItemPath);
                if (targetExists) {
                    const shouldOverwrite = await this.handleOverwrites(
                        targetItemPath,
                        itemConfig.sourcePath,
                        silentMode,
                        defaultOverwriteBehavior
                    );
                    if (!shouldOverwrite) {
                        results.push({
                            sourcePath: itemConfig.sourcePath,
                            targetPath: targetItemPath,
                            status: 'skipped',
                        });
                        this.loggerService.debug(`${operationName} skipped due to overwrite policy`, {
                            operation: operationName,
                            filePath: itemConfig.sourcePath,
                            targetPath: targetItemPath,
                        });
                        continue;
                    }
                }
                await copyFileOrDirectory(itemConfig.sourcePath, targetItemPath);
                results.push({
                    sourcePath: itemConfig.sourcePath,
                    targetPath: targetItemPath,
                    status: 'success',
                });
                this.loggerService.debug(`${operationName} successful`, {
                    operation: operationName,
                    filePath: itemConfig.sourcePath,
                    targetPath: targetItemPath,
                });
            } catch (error) {
                results.push({
                    sourcePath: itemConfig.sourcePath,
                    targetPath: targetItemPath,
                    status: 'error',
                    error: error instanceof Error ? error : new Error(String(error)),
                });
                this.loggerService.debug(`${operationName} failed`, {
                    operation: operationName,
                    filePath: itemConfig.sourcePath,
                    targetPath: targetItemPath,
                });
            }
        }
        return results;
    }

    /**
     * Handle existing files/directories during copy operations.
     * Orchestrates overwrite behavior based on configuration settings.
     * 
     * @param sourcePath - The source path to copy from.
     * @param targetPath - The target path that may need overwrite handling.
     * @param overwriteBehavior - The overwrite behavior ('overwrite' or 'skip').
     * @returns Promise resolving to true if overwrite should proceed, false otherwise.
     * @throws CopyOverwriteError, CopyTypeError when overwrite handling fails
     */
    private async handleOverwrites(
        targetPath: string,
        sourcePath: string,
        silentMode: boolean,
        defaultOverwriteBehavior: FileSystemOperationConfig['defaultOverwriteBehavior']
    ): Promise<boolean> {
        // LOG-002: Log overwrite handling for audit purposes
        this.loggerService.debug('Overwrite handling operation started', {
            operation: 'handleOverwrites',
            filePath: sourcePath,
            targetPath: targetPath,
        });

        // Convert defaultOverwriteBehavior to the format expected by handleOverwrite function
        const result = await handleOverwrite(sourcePath, targetPath, {
            silentMode,
            defaultOverwriteBehavior,
        });

        this.loggerService.debug('Overwrite handling completed', {
            operation: 'handleOverwrites',
            filePath: sourcePath,
            targetPath: targetPath,
        });

        return result;
    }
}