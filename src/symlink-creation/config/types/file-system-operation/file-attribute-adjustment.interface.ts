/**
 * Configuration interface for cross-platform file attribute adjustments.
 * 
 * This interface provides a cross-platform, best-effort way to change file attributes
 * such as readonly status. Implementations should handle platform-specific differences
 * gracefully and apply changes in a way that makes sense for the target operating system.
 */
export interface FileAttributeAdjustment {
    /**
     * Cross-platform file attribute adjustment for readonly status.
     *
     * This property allows callers to request best-effort readonly attribute changes on
     * discovered files before a link is created or after the file is copied. 
     * Implementations should apply these adjustments in a cross-platform way:
     * 
     * - On POSIX systems: maps to clearing/setting the write bit (e.g. chmod u+w/u-w)
     * - On Windows: maps to clearing/setting the read-only file attribute
     *
     * @default 'preserve' - leave the attribute unchanged (default behavior)
     */
    readonly: 'preserve' | 'set' | 'remove';
    
    /** 
     * Optional path for backing up file attribute changes.
     * When specified, original file attributes will be recorded to this location
     * relative to targetDirectoryPath, allowing for potential restoration.
     */
    backupFilePath?: string;
}