import { DomainErrorInfo } from '../../common';

/**
 * Domain error constants for symlink-creation/linking domain.
 * Provides standardized error information for all linking operations including
 * access permission errors, type validation errors, and path-related errors.
 * Each error type contains a unique key, human-readable message, and detailed description.
 */
export const LINKING_DOMAIN_ERRORS = {
    /** Error when symlink creation access is denied due to insufficient permissions. */
    LINKING_ACCESS: {
        key: 'LINKING_ACCESS',
        message: 'Access denied during symlink creation operation',
        description: 'Occurs when the process lacks sufficient permissions to create symlinks or directory links'
    } as DomainErrorInfo,

    /** Error when symlink type is invalid or unsupported for the current operation. */
    LINKING_TYPE: {
        key: 'LINKING_TYPE',
        message: 'Invalid or unsupported symlink type',
        description: 'Occurs when attempting to create symlinks with unsupported types or invalid configurations'
    } as DomainErrorInfo,

    /** Error when symlink path is invalid, missing, or inaccessible. */
    LINKING_PATH: {
        key: 'LINKING_PATH',
        message: 'Invalid or inaccessible path for symlink operation',
        description: 'Occurs when source or target paths are invalid, missing, or cannot be accessed for symlink creation'
    } as DomainErrorInfo,
} as const;