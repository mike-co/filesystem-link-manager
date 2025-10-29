/**
 * Represents a configuration entry that maps an individual source path to a destination path
 * for copy and hardlink file operations when using `patternType: 'path'` search patterns.
 */
export interface PathMappingEntry {
    /** Absolute or base-directory relative path to the file that should be copied or hardlinked. */
    sourcePath: string;
    /** Destination path (relative to the operation target) for the copied or hardlinked file. */
    destinationPath: string;
}
