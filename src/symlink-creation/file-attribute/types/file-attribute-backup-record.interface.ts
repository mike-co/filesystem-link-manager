import { FileSystemAction } from "../../config";

/**
 * Interface for backup record entries in CSV files.
 * Represents a single file's attribute change record for backup and undo purposes.
 * Used to track readonly state changes and provide rollback capabilities.
 */
export interface FileAttributeBackupRecord {
    /** Absolute path to the original source file that had its attributes modified */
    sourcePath: string;
    
    /** Type of filesystem action that triggered the attribute change (copy, symlink, etc.) */
    action: FileSystemAction;
    
    /** Absolute path where the corresponding symlink or copy was created */
    fileLinkPath: string;
    
    /** Original readonly state of the file before any attribute modifications were applied */
    originalReadonly: boolean;
    
    /** New readonly state that was applied to the file during the attribute adjustment */
    newReadonly: boolean;
}