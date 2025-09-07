import { DomainError } from "../../../common";

/**
 * Result of command execution operations.
 * Provides standardized response structure for command execution operations.
 * Contains success status and optional error information for failed executions.
 */
export interface ExecuteCommandResult {
    /**
     * Whether command executed successfully without errors.
     */
    success: boolean;
    
    /**
     * Error information if execution failed.
     * Contains domain-specific error with mapped error types and original cause.
     */
    error?: DomainError;
}