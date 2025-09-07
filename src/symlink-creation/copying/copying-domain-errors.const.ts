import { DomainErrorInfo } from '../../common';

/**
 * Domain error constants for symlink-creation/copying domain.
 * Contains error definitions for various copy operation failure scenarios.
 * Each error type contains a unique key, human-readable message, and optional description.
 */
export const COPYING_DOMAIN_ERRORS = {
    /** Error when a directory or file cannot be accessed during copy operations */
    COPY_ACCESS: {
        key: 'COPY_ACCESS',
        message: 'Unable to access source or target during copy operation',
        description: 'Occurs when file system access is denied due to permissions, locks, or path issues'
    } as DomainErrorInfo,

    /** Error when invalid types are used during copy operations */
    COPY_TYPE: {
        key: 'COPY_TYPE',
        message: 'Copy operation expected a valid type',
        description: 'Occurs when values are not the expected data type for copy operations'
    } as DomainErrorInfo,

    /** Error when overwrite operation fails during copy */
    COPY_OVERWRITE: {
        key: 'COPY_OVERWRITE',
        message: 'Failed to overwrite existing file or directory during copy',
        description: 'Occurs when attempting to overwrite an existing file or directory fails'
    } as DomainErrorInfo,

    /** General copy operation error for reasons other than access, type, or overwrite */
    COPY_GENERAL: {
        key: 'COPY_GENERAL',
        message: 'Copy operation failed',
        description: 'Occurs when copy operation fails for reasons other than access, type, or overwrite errors'
    } as DomainErrorInfo
} as const;