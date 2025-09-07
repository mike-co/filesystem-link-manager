/**
 * Log Level Enum for winston logger integration
 *
 * Defines standardized log levels for the application logging infrastructure.
 * Compatible with winston logger levels for consistent logging throughout the extension.
 * Each level provides specific semantics for different types of log messages.
 *
 * Usage:
 * - ERROR: Critical errors that require immediate attention
 * - WARN: Warning conditions that should be noted but don't halt execution
 * - INFO: Informational messages for general application flow
 * - DEBUG: Detailed diagnostic information for development and troubleshooting
 */
export enum LogLevel {
    /** Critical errors that require immediate attention and may affect functionality */
    ERROR = 'error',

    /** Warning conditions that should be noted but don't halt execution */
    WARN = 'warn',

    /** Informational messages for general application flow tracking */
    INFO = 'info',

    /** Detailed diagnostic information for development and troubleshooting */
    DEBUG = 'debug',
}
