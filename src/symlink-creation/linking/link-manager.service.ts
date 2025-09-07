import { injectable } from 'tsyringe';
import { LoggerService } from '../../logging';
import { createLink } from './link-manager/create-link.function';
import { DirectoryLinkOptions, FileLinkOptions } from './types/link-creation-options.interface';
import { LinkingOperationResult } from './types/linking-operation-result.interface';

/**
 * Service class for file and directory link management operations.
 * Orchestrates calls to functions for link operations.
 */
@injectable()
export class LinkManagerService {
    private readonly logger: LoggerService;

    /**
     * Constructs a new LinkManagerService with injected logger dependency.
     * 
     * @param loggerService LoggerService instance injected via DI container for operation logging
     */
    public constructor(loggerService: LoggerService) {
        this.logger = loggerService;
    }

    /**
     * Creates a file symlink at the target path pointing to the source file.
     * Preserves folder structure and handles cross-platform considerations.
     * 
     * @param sourcePath Absolute path to the source file that will be linked
     * @param targetPath Absolute path where the symlink will be created
     * @param options Configuration options for symlink creation behavior
     * @returns Promise resolving to LinkingOperationResult with operation details
     * @throws {DomainError} When symlink creation fails due to permissions, invalid paths, or filesystem errors
     */
    public async createFileLink(
        sourcePath: string, 
        targetPath: string, 
        options: FileLinkOptions
    ): Promise<LinkingOperationResult> {
        this.logger.debug(`Creating file symlink: ${sourcePath} -> ${targetPath}`, {
            operation: 'createSymlink',
            filePath: sourcePath,
            targetPath: targetPath,
        });
        const result = await createLink(sourcePath, targetPath, options);
        this.logger.info(`File symlink created successfully: ${targetPath}`, {
            operation: 'createSymlink',
            filePath: sourcePath,
            targetPath: targetPath,
        });
        return result;
    }

    /**
     * Creates a directory link at the target path pointing to the source directory.
     * Uses platform-specific mechanisms (Windows junctions for directories, Linux symlinks).
     * 
     * @param sourcePath Absolute path to the source directory that will be linked
     * @param targetPath Absolute path where the directory link will be created
     * @param options Configuration options for directory link creation behavior
     * @returns Promise resolving to LinkingOperationResult with operation details
     * @throws {DomainError} When directory link creation fails due to permissions, invalid paths, or filesystem errors
     */
    public async createDirectorySymlink(
        sourcePath: string, 
        targetPath: string, 
        options: DirectoryLinkOptions
    ): Promise<LinkingOperationResult> {
        this.logger.debug(`Creating directory link: ${sourcePath} -> ${targetPath}`, {
            operation: 'createDirectoryLink',
            filePath: sourcePath,
            targetPath: targetPath,
        });

        const result = await createLink(sourcePath, targetPath, options);
        this.logger.info(`Directory link created successfully: ${targetPath}`, {
            operation: 'createDirectoryLink',
            filePath: sourcePath,
            targetPath: targetPath,
        });
        return result;
    }
}