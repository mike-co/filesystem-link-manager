import { DomainErrorInfo } from '../../common';

/**
 * Domain error constants for the file-attribute domain.
 * Defines specific error types that can occur during file attribute operations.
 * Each error contains a unique key, human-readable message, and detailed description.
 * Used throughout the file-attribute domain for consistent error handling and reporting.
 */
export const FILE_ATTRIBUTE_DOMAIN_ERRORS = {
    /** Error thrown when file attribute check operations fail due to filesystem access issues */
    FILE_ATTRIBUTE_CHECK_FAILED: {
        key: 'FILE_ATTRIBUTE_CHECK_FAILED',
        message: 'Failed to check file attributes',
        description: 'Occurs when checking file attributes like readonly status fails due to permissions, file access issues, or invalid file paths'
    } as DomainErrorInfo,

    /** Error thrown when file attribute modification operations fail due to filesystem write issues */
    FILE_ATTRIBUTE_MODIFICATION_FAILED: {
        key: 'FILE_ATTRIBUTE_MODIFICATION_FAILED',
        message: 'Failed to modify file attributes',
        description: 'Occurs when modifying file attributes like readonly status fails due to permissions, file access issues, or filesystem constraints'
    } as DomainErrorInfo
} as const;