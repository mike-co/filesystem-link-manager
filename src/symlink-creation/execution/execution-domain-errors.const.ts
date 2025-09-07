import { DomainErrorInfo } from '../../common';

/**
 * Domain error constants for symlink-creation/execution domain.
 * Provides standardized error definitions for command execution operations.
 * Each error type contains a unique key, human-readable message, and optional description.
 */
export const EXECUTION_DOMAIN_ERRORS = {
    /**
     * Generic execution error for unspecified command execution failures.
     */
    EXECUTION: {
        key: 'EXECUTION',
        message: 'Generic error when something goes wrong with execution',
        description: 'Occurs when the process execution failed by some reason'
    } as DomainErrorInfo,

    /**
     * Error when execution access is denied during command execution.
     */
    EXECUTION_ACCESS: {
        key: 'EXECUTION_ACCESS',
        message: 'Access denied during command execution',
        description: 'Occurs when the process lacks sufficient permissions to execute commands or access execution paths'
    } as DomainErrorInfo,
    
    /**
     * Error when access is denied or path is incorrect during skipIfPathExists check.
     */
    EXECUTION_ACCESS_PATH_EXISTS_CHECK: {
        key: 'EXECUTION_ACCESS_PATH_EXISTS_CHECK',
        message: 'Access denied or path is incorrect during skipIfPathExists check',
        description: 'Occurs when the process lacks sufficient permissions or not able to access path specified in skipIfPathExists'
    } as DomainErrorInfo,

    /**
     * Error when execution permission is denied for command execution.
     */
    EXECUTION_PERMISSION: {
        key: 'EXECUTION_PERMISSION',
        message: 'Permission denied for command execution',
        description: 'Occurs when command execution is denied due to security policies or insufficient execution privileges'
    } as DomainErrorInfo,

    /**
     * Error when execution timeout occurs during command execution.
     */
    EXECUTION_TIMEOUT: {
        key: 'EXECUTION_TIMEOUT',
        message: 'Command execution timeout exceeded',
        description: 'Occurs when command execution exceeds the maximum allowed timeout duration'
    } as DomainErrorInfo,
} as const;