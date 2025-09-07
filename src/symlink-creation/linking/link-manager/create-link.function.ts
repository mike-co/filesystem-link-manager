import { ensureDir, ensureLink, ensureSymlink, pathExists, readlink, remove, stat } from 'fs-extra';
import { platform } from 'os';
import { dirname, normalize, resolve } from 'path';
import { DomainError } from '../../../common';
import { FileSystemItemType, FileSystemOperationConfig } from '../../config';
import { LinkCreationOptions } from '../types/link-creation-options.interface';
import { LinkingOperationResult } from '../types/linking-operation-result.interface';
import { LINKING_DOMAIN_ERRORS } from '../linking-domain-errors.const';

/**
 * Creates a link (file symlink or directory link) at the target path pointing to the source.
 * Uses discriminated union options to determine link type and behavior with cross-platform support.
 * 
 * @param sourcePath Absolute path to the source file or directory that will be linked
 * @param targetPath Absolute path where the link will be created
 * @param options Configuration options with discriminated union for link type and behavior
 * @returns Promise resolving to LinkingOperationResult with detailed operation information
 * @throws {DomainError} When link creation fails due to permissions, invalid paths, or filesystem errors
 */
export async function createLink(
    sourcePath: string,
    targetPath: string,
    options: LinkCreationOptions
): Promise<LinkingOperationResult> {
    try {
        // Validate source exists and matches expected type
        await validateSourceType(sourcePath, options.itemType);

        // Ensure parent directories exist
        const parentDirectoriesCreated = await ensureParentDirectories(
            targetPath,
            options.createParentDirectories ?? true
        );

        // Check if target already exists
        const isTargetPathExists = await pathExists(targetPath);

        let overwritePerformed = false;

        // Handle existing target
        if (isTargetPathExists) {
            const existingLinkCheck = await checkExistingLink(targetPath, sourcePath);

            if (existingLinkCheck.isSameTarget) {
                // Already linked to the same target, return early
                const metadata = buildMetadata(options.verboseMetadata, {
                    targetExisted: true,
                    parentDirectoriesCreated,
                    overwritePerformed: false,
                });

                return {
                    success: true,
                    sourcePath,
                    targetPath,
                    operation: 'create',
                    itemType: options.itemType,
                    action: 'symlink',
                    metadata,
                };
            }

            // Handle overwrite behavior for any existing target (links or regular files)
            if (isTargetPathExists) {
                const existingPath = existingLinkCheck.existingPath || targetPath;
                const overwriteResult = await handleOverwriteBehavior(
                    sourcePath,
                    targetPath,
                    existingPath,
                    options,
                    parentDirectoriesCreated
                );
                if (overwriteResult.shouldReturn) {
                    return overwriteResult.result as LinkingOperationResult;
                }

                overwritePerformed = overwriteResult.overwritePerformed;
            }
        }

        // Create the appropriate link type
        const implementation = await createLinkByType(sourcePath, targetPath, options);

        // Build result metadata
        const metadata = buildMetadata(options.verboseMetadata, {
            targetExisted: isTargetPathExists,
            parentDirectoriesCreated,
            overwritePerformed,
        });

        return {
            success: true,
            sourcePath,
            targetPath,
            operation: 'create',
            itemType: options.itemType,
            action: implementation,
            metadata,
        };
    } catch (error: unknown) {
        if (error instanceof DomainError) {
            throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error during link creation';
        const domainError = new DomainError(LINKING_DOMAIN_ERRORS.LINKING_ACCESS, {cause: error});
        domainError.message = `Failed to create ${options.itemType} link: ${errorMessage}`;
        throw domainError;
    }
}

/**
 * Validates that the source path exists and matches the expected filesystem item type.
 * Ensures type safety for the discriminated union pattern used in link creation.
 * 
 * @param sourcePath Absolute path to the source file or directory to validate
 * @param itemType Expected filesystem item type ('file' or 'directory')
 * @throws {DomainError} When source type doesn't match expected item type or path is invalid
 */
async function validateSourceType(sourcePath: string, itemType: FileSystemItemType): Promise<void> {
    const sourceStats = await stat(sourcePath);

    if (itemType === 'file' && sourceStats.isDirectory()) {
        const error = new DomainError(LINKING_DOMAIN_ERRORS.LINKING_TYPE);
        error.message = 'Source path must be a file for file symlink creation';
        throw error;
    }

    if (itemType === 'directory' && !sourceStats.isDirectory()) {
        const error = new DomainError(LINKING_DOMAIN_ERRORS.LINKING_TYPE);
        error.message = 'Source path must be a directory for directory link creation';
        throw error;
    }
}

/**
 * Handles overwrite behavior for existing targets based on configuration options.
 * Implements the configured strategy for dealing with existing files or directories at the target path.
 * 
 * @param sourcePath Absolute path to the source file or directory
 * @param targetPath Absolute path where the link will be created
 * @param existingPath Path of the existing item at the target location
 * @param options Link creation options containing overwrite behavior configuration
 * @param parentDirectoriesCreated Whether parent directories were created during this operation
 * @returns Promise resolving to overwrite operation result with control flow information
 * @throws {DomainError} When overwrite behavior is set to 'error' and target exists
 */
async function handleOverwriteBehavior(
    sourcePath: string,
    targetPath: string,
    existingPath: string,
    options: LinkCreationOptions,
    parentDirectoriesCreated: boolean
): Promise<{
    shouldReturn: boolean;
    result?: LinkingOperationResult;
    overwritePerformed: boolean;
}> {
    let overwriteBehavior: FileSystemOperationConfig['defaultOverwriteBehavior'] = 'overwrite';

    if (options.handleOverwriteBehaviorFunc) {
        try {
            overwriteBehavior = await options.handleOverwriteBehaviorFunc(sourcePath, targetPath, existingPath);
        } catch (error: unknown) {
            // Re-throw the error from the callback to maintain the contract
            throw error;
        }
    }

    // Validate the overwrite behavior value
    const validBehaviors: FileSystemOperationConfig['defaultOverwriteBehavior'][] = ['overwrite', 'skip', 'error'];
    if (!validBehaviors.includes(overwriteBehavior)) {
        const error = new DomainError(LINKING_DOMAIN_ERRORS.LINKING_ACCESS);
        error.message = `Invalid overwrite behavior: '${overwriteBehavior}'. Must be one of: ${validBehaviors.join(', ')}`;
        throw error;
    }

    if (overwriteBehavior === 'error') {
        const error = new DomainError(LINKING_DOMAIN_ERRORS.LINKING_ACCESS);
        error.message = `Target ${options.itemType} already exists and overwrite behavior is set to error`;
        throw error;
    }

    if (overwriteBehavior === 'skip') {
        const metadata = buildMetadata(options.verboseMetadata, {
            targetExisted: true,
            parentDirectoriesCreated,
            overwritePerformed: false,
        });

        return {
            shouldReturn: true,
            result: {
                success: true,
                sourcePath,
                targetPath,
                operation: 'create',
                itemType: options.itemType,
                action: 'symlink',
                metadata,
            },
            overwritePerformed: false
        };
    }

    // overwriteBehavior === 'overwrite'

    // Remove existing target
    await remove(targetPath);

    return {
        shouldReturn: false,
        overwritePerformed: true
    };
}

/**
 * Creates the appropriate link type based on discriminated union options and platform.
 * Handles cross-platform differences for directory links (Windows junctions vs Linux symlinks).
 * 
 * @param sourcePath Absolute path to the source file or directory
 * @param targetPath Absolute path where the link will be created
 * @param options Link creation options with discriminated union type information
 * @returns Promise resolving to the action type that was performed ('hardlink' or 'symlink')
 * @throws {Error} When filesystem link creation fails
 */
async function createLinkByType(
    sourcePath: string,
    targetPath: string,
    options: LinkCreationOptions
): Promise<LinkingOperationResult['action']> {
    if (options.itemType === 'file') {
        if (options.action === 'hardlink') {
            await ensureLink(sourcePath, targetPath);
            return 'hardlink';
        } else {
            await ensureSymlink(sourcePath, targetPath, 'file');
            return 'symlink';
        }
    }

    // Directory link - only symlinks supported for directories
    const action = platform() === 'win32' ? 'junction' : 'symlink';

    if (action === 'junction') {
        await ensureSymlink(sourcePath, targetPath, 'junction');
        return 'symlink'
    } else {
        await ensureSymlink(sourcePath, targetPath, 'dir');
        return 'symlink'
    }
}

/**
 * Ensures parent directories exist for the target path and tracks creation status.
 * Creates the directory structure needed for the link target if it doesn't exist.
 * 
 * @param targetPath Path where the symlink/link will be created
 * @param createParentDirectories Whether to create parent directories if they don't exist (default: true)
 * @returns Promise resolving to true if parent directories were created, false if they already existed
 * @throws {Error} When directory creation fails due to permissions or filesystem errors
 */
async function ensureParentDirectories(
    targetPath: string,
    createParentDirectories: boolean = true
): Promise<boolean> {
    const targetDirectory = dirname(targetPath);
    const parentDirectoriesExist = await pathExists(targetDirectory);

    if (createParentDirectories && !parentDirectoriesExist) {
        await ensureDir(targetDirectory);
        return true;
    }

    return false;
}

/**
 * Checks if an existing link already points to the same target source path.
 * Handles both symbolic links and hard links with cross-platform path normalization.
 * 
 * @param targetPath Path to check for existing link or file
 * @param expectedSourcePath The source path we expect the link to point to
 * @returns Promise resolving to link check result with target comparison and link type information
 */
async function checkExistingLink(
    targetPath: string,
    expectedSourcePath: string
): Promise<{
    /** Whether the existing link points to the same target */
    isSameTarget: boolean;
    /** Whether the existing path is a link (symlink or junction or hardlink) */
    isLink: boolean;
    existingPath?: string;
}> {
    try {
        // First try to read as a symbolic link
        const existingLinkTarget = await readlink(targetPath);
        const resolvedSourcePath = resolve(expectedSourcePath);
        const resolvedExistingTarget = resolve(dirname(targetPath), existingLinkTarget);

        // Normalize both paths to handle Windows long path prefix and other variations
        const normalizedSource = normalize(resolvedSourcePath).replace(/^\\\\\?\\/g, '');
        const normalizedExisting = normalize(resolvedExistingTarget).replace(/^\\\\\?\\/g, '');

        return {
            isSameTarget: normalizedExisting === normalizedSource,
            isLink: true,
            existingPath: normalizedExisting
        };
    } catch {
        // If readlink fails, check if it's a hardlink by comparing inodes
        try {
            const [targetStats, sourceStats] = await Promise.all([
                stat(targetPath),
                stat(expectedSourcePath)
            ]);

            // Check if both files have the same inode (indicating a hardlink)
            const isSameInode = targetStats.ino === sourceStats.ino && targetStats.dev === sourceStats.dev;
            
            if (isSameInode) {
                return {
                    isSameTarget: true,
                    isLink: true,
                    existingPath: resolve(expectedSourcePath)
                };
            }

            // Target exists but is not a link to the source
            return {
                isSameTarget: false,
                isLink: false
            };
        } catch {
            // Target exists but is not a link
            return {
                isSameTarget: false,
                isLink: false
            };
        }
    }
}

/**
 * Builds metadata object for operation result based on verbosity settings.
 * Controls the level of detail included in the operation result metadata.
 * 
 * @param verboseMetadata Whether to include comprehensive metadata details
 * @param details Metadata details to include when verbose mode is enabled
 * @returns Metadata object with appropriate level of detail
 */
function buildMetadata(
    verboseMetadata: boolean | undefined,
    details: LinkingOperationResult['metadata']
): LinkingOperationResult['metadata'] {
    if (verboseMetadata) {
        return {
            timestamp: new Date().toISOString(),
            ...details,
        };
    }

    return {
        timestamp: new Date().toISOString(),
    };
}