/**
 * Represents a domain error type for the application.
 * Used to define error registry objects for consistent error handling.
 *
 * @property key Unique error key for identification
 * @property message Human-readable error message describing the error.
 * @property description Optional detailed description for context and debugging.
 */
export interface DomainErrorInfo {
    /** Unique error key for identification */
    key: string;
    /** Human-readable error message describing the error. */
    message: string;
    /** Optional detailed description for context and debugging. */
    description?: string;
};