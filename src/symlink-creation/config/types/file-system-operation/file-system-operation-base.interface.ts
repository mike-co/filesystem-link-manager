import { FileAttributeAdjustment } from "./file-attribute-adjustment.interface";
import { SearchPatternBase } from "./search-pattern-base.interface";

/**
 * Base interface for symlink source configurations.
 */
export interface FileSystemOperationBase {
    /** Base directory path for searching source files or directories. */
    baseDirectoryPath: string;
    /** Patterns for matching files to symlink. */
    searchPatterns: SearchPatternBase[];
    /** Destination path, relative to targetDirectoryPath. */
    destinationPath?: string;
    /**
     * Adjustments to apply to source of links or target copied files.
     * This provides a cross-platform, best-effort way to change file attributes such
     * as readonly. Leave undefined to preserve existing attributes.
     */
    fileAttributeAdjustment?: FileAttributeAdjustment;
}