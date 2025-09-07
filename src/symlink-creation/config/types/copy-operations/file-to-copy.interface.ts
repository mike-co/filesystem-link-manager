/**
 * Configuration interface for individual file copying operations.
 * 
 * This interface defines the source and destination paths for copying
 * individual files. The operation creates a physical copy of the file
 * at the specified destination location.
 */
export interface FileToCopy {
    /** 
     * Absolute or workspace-relative path to the source file to copy.
     * This path should point to an existing file that will be copied
     * to the destination location.
     */
    sourcePath: string;
    
    /** 
     * Absolute destination path and filename where the file should be copied to.
     */
    destinationPath: string;
}