import { DomainErrorInfo } from '../../common';

/**
 * Domain error constants for symlink-creation/discovery domain.
 * Provides standardized error definitions for file and directory discovery operations.
 * Each error type contains a unique key, human-readable message, and optional description.
 */
export const DISCOVERY_DOMAIN_ERRORS = {
    /** Error when file system access is denied during discovery */
    DISCOVERY_ACCESS: {
        key: 'DISCOVERY_ACCESS',
        message: 'Access denied during file discovery',
        description: 'Occurs when file system access is denied due to permissions or path issues'
    } as DomainErrorInfo,

    /** Error when an invalid pattern is used for file discovery */
    DISCOVERY_PATTERN: {
        key: 'DISCOVERY_PATTERN',
        message: 'Invalid pattern used for file discovery',
        description: 'Occurs when glob, regex, or ignore rule patterns are malformed or invalid'
    } as DomainErrorInfo,

    /** Error when a security violation occurs during file discovery */
    DISCOVERY_SECURITY: {
        key: 'DISCOVERY_SECURITY',
        message: 'Security violation during file discovery',
        description: 'Occurs when discovery attempts to access paths outside allowed boundaries'
    } as DomainErrorInfo,

    /** Error when invalid types are used during file discovery */
    DISCOVERY_TYPE: {
        key: 'DISCOVERY_TYPE',
        message: 'Invalid type used during file discovery',
        description: 'Occurs when values are not the expected data type for discovery operations'
    } as DomainErrorInfo,

    /** General discovery error for other failure reasons */
    DISCOVERY_GENERAL: {
        key: 'DISCOVERY_GENERAL',
        message: 'File discovery operation failed',
        description: 'Occurs when discovery fails for reasons other than access, pattern, security, or type errors'
    } as DomainErrorInfo
} as const;