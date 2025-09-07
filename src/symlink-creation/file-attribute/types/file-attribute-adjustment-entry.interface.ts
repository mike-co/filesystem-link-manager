/**
 * Interface for file attribute adjustment entries.
 * Represents a single file or directory that requires attribute adjustments.
 * Used to track all necessary information for processing file attribute changes including backup operations.
 */
import { FileSystemOperationConfig, FileSystemItemType, FileAttributeAdjustment, FileSystemAction } from '../../config';

/**
 * Entry for file attribute adjustment operations.
 * Contains all information needed to process attribute changes for a single path.
 * Supports both file and directory operations with optional backup file creation.
 */
export interface FileAttributeAdjustmentEntry {
    /** Type of filesystem item - determines if sourcePath refers to a file or directory */
    itemType: FileSystemItemType;
    
    /** Type of filesystem action being performed (copy, symlink, etc.) */
    action: FileSystemAction;
    
    /** Optional file attribute adjustment configuration specifying readonly behavior and backup options */
    fileAttributeAdjustment?: FileAttributeAdjustment;
    
    /** Absolute path where the symlink or copy was created as the destination */
    destinationPath: string;
    
    /** Absolute path of the original source file or directory being processed */
    sourcePath: string;

    /** Absolute or workspace-relative path to the target directory containing the destination */
    targetDirectoryPath: string;
    
    /** Optional callback function to handle user confirmation when backup files would be overwritten */
    handleOverwriteBehaviorFunc?: (backupPaths: string[]) => Promise<FileSystemOperationConfig['defaultOverwriteBehavior']>;
}