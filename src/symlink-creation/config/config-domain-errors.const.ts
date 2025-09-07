import { DomainErrorInfo } from '../../common';

/**
 * Domain error constants for symlink-creation/config domain.
 * Each error type contains a unique key, human-readable message, and optional description.
 */
export const CONFIG_DOMAIN_ERRORS = {
    /** Error when VS Code workspace configuration cannot be accessed */
    CONFIG_ACCESS: {
        key: 'CONFIG_ACCESS',
        message: 'Unable to access VS Code workspace configuration',
        description: 'Occurs when the VS Code workspace configuration cannot be read due to permissions or API access issues'
    } as DomainErrorInfo,

    /** Error when parsing VS Code configuration fails */
    CONFIG_PARSE: {
        key: 'CONFIG_PARSE',
        message: 'Failed to parse VS Code configuration',
        description: 'Occurs when configuration data cannot be processed due to format or structure issues'
    } as DomainErrorInfo,

    /** Error when configuration value is not an object type */
    CONFIG_TYPE: {
        key: 'CONFIG_TYPE',
        message: 'Configuration must be an object type',
        description: 'Occurs when configuration value is not an object but a different data type'
    } as DomainErrorInfo,

    /** Error when configuration value is explicitly set to null */
    CONFIG_VALUE_NULL: {
        key: 'CONFIG_VALUE_NULL',
        message: 'Configuration value is explicitly set to null',
        description: 'Occurs when configuration is intentionally set to null instead of undefined or an object'
    } as DomainErrorInfo
} as const;