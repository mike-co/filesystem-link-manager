/**
 * Provides context for a log entry, such as operation and file paths.
 * @interface LogContext
 */
export interface LogContext {
    /** Operation being performed (e.g., 'createSymlink'). */
    operation: string;
    /** Source file path involved in the operation. */
    filePath?: string;
    /** Target file path for the operation. */
    targetPath?: string;
    /** Command executed for the operation. */
    command?: string;
    /** Working directory for the operation. */
    workingDirectory?: string;
    /** Error message if the operation failed. */
    errorMessage?: string;
    /** Error stack trace if the operation failed. */
    errorStack?: string;
    /** Error name/type if the operation failed. */
    errorName?: string;
    /** Domain error key if the error is a DomainError. */
    domainErrorKey?: string;
    /** Domain error description if the error is a DomainError. */
    domainErrorDescription?: string;
    /** Underlying cause if the error has a cause property. */
    cause?: unknown;
    /** Number of items processed in the operation. */
    processedCount?: number;
    /** Additional context properties */
    [key: string]: unknown;
}
