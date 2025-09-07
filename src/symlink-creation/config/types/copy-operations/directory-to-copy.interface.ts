/**
 * Configuration interface for directory copying operations.
 * 
 * This interface defines the source and destination paths for copying
 * entire directories and their contents. The operation creates physical
 * copies of all files and subdirectories from the source location.
 */
export interface DirectoryToCopy {
    /** 
     * Absolute or workspace-relative path to the source directory to copy.
     * This path should point to an existing directory that will be copied
     * along with all its contents (files and subdirectories).
     */
    sourcePath: string;
    
    /** 
     * Absolute destination path where the directory should be copied to.
     */
    destinationPath: string;
}