import { FileSystemOperationConfig } from '../../config';

/**
 * Base interface for common link creation options.
 * Provides shared configuration properties for both file and directory link operations.
 * Contains optional behavior customization functions and metadata preferences.
 */
export interface BaseLinkOptions {
    /** Callback function to determine behavior when a link already exists at the target path. */
    handleOverwriteBehaviorFunc?: (sourcePath: string, targetPath: string, existingPath: string) => Promise<FileSystemOperationConfig['defaultOverwriteBehavior']>
    
    /** Callback function to confirm file attribute adjustment operations with backup path information. */
    handleFileAttributeOverwriteFunc?: (backupPaths: string[]) => Promise<FileSystemOperationConfig['defaultOverwriteBehavior']>
    
    /** Whether to automatically create parent directories if they don't exist (default: true). */
    createParentDirectories?: boolean;
    
    /** Whether to include comprehensive metadata details in the operation result (default: false). */
    verboseMetadata?: boolean;
}