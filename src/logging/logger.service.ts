import winston from 'winston';
import { injectable, inject } from 'tsyringe';
import { LogContext } from './log-context.interface';
import { LogLevel } from './log-level.enum';
import { OutputChannelTransport } from './output-channel.transport';
import { FileTransport } from './file.transport';

/**
 * Provides centralized logging functionality using winston logger with
 * structured logging capabilities and contextual information support.
 */
@injectable()
export class LoggerService {
    /**
     * Winston logger instance used for all logging operations.
     * Configured with timestamp, error stack trace, and JSON formatting.
     */
    private readonly logger: winston.Logger;
    
    /**
     * Constructs a new LoggerService and initializes the winston logger.
     * Transports are injected via DI container for testability and flexibility.
     * @param outputChannelTransport The OutputChannelTransport for VS Code output channel logging
     * @param fileTransport The FileTransport for file-based logging
     */
    public constructor(
        @inject(OutputChannelTransport) private readonly outputChannelTransport: OutputChannelTransport,
        @inject(FileTransport) private readonly fileTransport: FileTransport
    ) {
        this.logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                this.outputChannelTransport,
                this.fileTransport
            ]
        });
    }

    /**
     * Logs an error message with contextual information.
     * Error messages are typically used for exceptions, failures, and critical issues.
     * @param message The error message to log
     * @param context Contextual information for the log entry including operation details
     */
    public error(message: string, context: LogContext): void {
        this.logger.error({ message, context, timestamp: this.getIsoTimestamp() });
    }

    /**
     * Logs a warning message with contextual information.
     * Warning messages indicate potential issues that don't prevent operation.
     * @param message The warning message to log
     * @param context Contextual information for the log entry including operation details
     */
    public warn(message: string, context: LogContext): void {
        this.logger.warn({ message, context, timestamp: this.getIsoTimestamp() });
    }

    /**
     * Logs an informational message with contextual information.
     * Info messages provide general operational information and status updates.
     * @param message The informational message to log
     * @param context Contextual information for the log entry including operation details
     */
    public info(message: string, context: LogContext): void {
        this.logger.info({ message, context, timestamp: this.getIsoTimestamp() });
    }

    /**
     * Logs a debug message with contextual information.
     * Debug messages provide detailed diagnostic information for troubleshooting.
     * @param message The debug message to log
     * @param context Contextual information for the log entry including operation details
     */
    public debug(message: string, context: LogContext): void {
        this.logger.debug({ message, context, timestamp: this.getIsoTimestamp() });
    }

    /**
     * Sets the logging level for the Winston logger.
     * Controls which log levels are actually written to the configured transports.
     * @param level The log level to set (error, warn, info, debug)
     */
    public setLevel(level: LogLevel): void {
        this.logger.level = level;
    }

    /**
     * Gets the current logging level.
     * @returns The current log level as a string representation
     */
    public getLevel(): string {
        return this.logger.level;
    }

    /**
     * Returns the current timestamp in ISO 8601 format.
     * Provides consistent timestamp formatting across all log entries.
     * @returns ISO 8601 formatted timestamp string (YYYY-MM-DDTHH:mm:ss.sssZ)
     */
    private getIsoTimestamp(): string {
        return new Date().toISOString();
    }
}
