import { DomainErrorInfo } from "./domain-error-info.interface";

/**
 * Generic domain error for the application with structured error information.
 * Provides consistent error handling across all domains with detailed error context.
 * Can be constructed with a DomainErrorInfo object containing error details.
 */
export class DomainError extends Error {
    /** Structured error information containing key, message, and optional description. */
    public readonly domainErrorInfo: DomainErrorInfo;
    /** Optional underlying cause of the error for error chaining. */
    public readonly cause?: unknown;

    /**
     * Constructs a new DomainError with structured error information.
     * Uses the message from domainErrorInfo as the Error message for consistency.
     * @param domainErrorInfo Structured error information with key, message, and description
     * @param options Optional options object containing the underlying cause
     */
    public constructor(
        domainErrorInfo: DomainErrorInfo,
        options?: { cause?: unknown }
    ) {
        super(domainErrorInfo.message);
        this.domainErrorInfo = domainErrorInfo
        this.name = 'DomainError';
        this.cause = options?.cause;
    }
}