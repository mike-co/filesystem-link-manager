/**
 * Represents the result of a copy operation for a file or directory.
 * Contains information about the source, target, outcome, and any errors that occurred.
 */
export interface CopyOperationResult {
    /** The absolute path of the source file or directory that was copied. */
    sourcePath: string;
    /** The absolute path where the file or directory was copied to. */
    targetPath: string;
    /** The outcome status of the copy operation. */
    status: 'success' | 'skipped' | 'error';
    /** Optional error information if the copy operation failed. */
    error?: Error;
}