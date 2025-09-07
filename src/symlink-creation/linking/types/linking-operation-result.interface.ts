import { FileSystemAction, FileSystemItemType } from "../../config";

/**
 * Result tracking interface for link creation operations.
 * Provides comprehensive information about link creation, modification, and cleanup operations.
 * Contains operation status, paths, metadata, and optional error information.
 */
export interface LinkingOperationResult {
    /** Whether the link operation completed successfully without errors. */
    success: boolean;
    
    /** Absolute path to the source file or directory that was linked from. */
    sourcePath: string;
    
    /** Absolute path where the link was created or attempted to be created. */
    targetPath: string;
    
    /** Type of link operation that was performed (currently only 'create' is supported). */
    operation: 'create';
    
    /** Type of filesystem item that was linked (file or directory). */
    itemType: FileSystemItemType;
    
    /** Platform-specific link implementation that was used (hardlink, symlink, or junction). */
    action?: Extract<FileSystemAction, 'hardlink' | 'symlink'>;
    
    /** Error information if the operation failed (only present when success is false). */
    error?: Error;
    
    /** Additional metadata about the operation for debugging and logging purposes. */
    metadata?: {
        /** ISO timestamp string indicating when the operation was performed. */
        timestamp?: string;
        
        /** Whether a file or directory already existed at the target path before the operation. */
        targetExisted?: boolean;
        
        /** Whether parent directories had to be created to complete the operation. */
        parentDirectoriesCreated?: boolean;
        
        /** Whether an existing file or directory was overwritten during the operation. */
        overwritePerformed?: boolean;
    };
}