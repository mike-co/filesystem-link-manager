import { DomainError } from '../../../common';
import { EXECUTION_DOMAIN_ERRORS } from '../execution-domain-errors.const';

/**
 * Creates a standardized execution domain error with consistent error mapping.
 * Pure function that provides common error handling pattern for execution operations.
 * Maps system-level error codes to domain-specific error types for better error handling.
 * 
 * @param error Original error object from failed execution operation
 * @param defaultErrorType Default domain error type to use if error type cannot be determined
 * @returns DomainError with appropriate error type and original error as cause
 */
export function createExecutionError(
    error: unknown,
    defaultErrorType: typeof EXECUTION_DOMAIN_ERRORS[keyof typeof EXECUTION_DOMAIN_ERRORS]
): DomainError {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');

    // Map specific error codes to domain error types
    type ErrorWithCode = Error & { code?: string };
    const errWithCode = errorObj as ErrorWithCode;
    if (typeof errWithCode.code === 'string') {
        switch (errWithCode.code) {
            case 'ENOENT':
            case 'EISDIR':
                return new DomainError(
                    EXECUTION_DOMAIN_ERRORS.EXECUTION_ACCESS,
                    { cause: errorObj }
                );
            case 'EACCES':
            case 'EPERM':
                return new DomainError(
                    EXECUTION_DOMAIN_ERRORS.EXECUTION_PERMISSION,
                    { cause: errorObj }
                );
            case 'ETIME':
            case 'ETIMEDOUT':
            case 'ENOTDIR':
                return new DomainError(
                    EXECUTION_DOMAIN_ERRORS.EXECUTION_TIMEOUT,
                    { cause: errorObj }
                );
        }
    }
    
    // Check for timeout message in any error
    if (errorObj.message?.includes('timeout')) {
        return new DomainError(
            EXECUTION_DOMAIN_ERRORS.EXECUTION_TIMEOUT,
            { cause: errorObj }
        );
    }
    
    // Use default error type for unmapped errors
    return new DomainError(defaultErrorType, { cause: errorObj });
}