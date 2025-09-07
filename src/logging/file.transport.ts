import { appendFileSync, ensureDirSync, pathExistsSync, removeSync, renameSync, statSync } from 'fs-extra';
import { dirname, join, parse } from 'path';
import { inject, injectable } from 'tsyringe';
import { ExtensionContext } from 'vscode';
import Transport from 'winston-transport';

/**
 * Winston transport that writes log entries to files with automatic rotation
 * when size limits are exceeded. Uses VS Code's globalStorageUri for file storage.
 */
@injectable()
export class FileTransport extends Transport {
    /** VS Code extension context providing access to global storage paths. */
    private readonly context: ExtensionContext;
    /** Maximum file size in bytes before rotation occurs (default: 5MB). */
    private readonly maxSize: number;
    /** Maximum number of rotated files to keep (default: 5). */
    private readonly maxFiles: number;
    /** Base filename for the log file. */
    private readonly baseFilename: string;
    /** Full path to the current active log file. */
    private readonly currentLogPath: string;

    /**
     * Creates a new FileTransport instance with default configuration.
     * Initializes file paths using VS Code's global storage and sets up rotation limits.
     * @param context VS Code extension context injected by DI container for storage access
     */
    public constructor(@inject('ExtensionContext') context: ExtensionContext) {
        super({});
        this.context = context;
        this.maxSize = 5 * 1024 * 1024; // 5MB default
        this.maxFiles = 5; // Keep 5 files by default
        this.baseFilename = 'extension.log';

        // Initialize the current log path
        this.currentLogPath = this.getLogPath(this.baseFilename);
        this.ensureLogDirectory();
    }

    /**
     * Logs an entry to the file system with automatic rotation handling.
     * Formats the log entry as JSON and appends to the current log file.
     * @param info The log info object from Winston containing level, message, and context
     * @param callback Callback function to signal logging completion
     */
    public log(info: Record<string, unknown>, callback: () => void): void {
        setImmediate(() => {
            try {
                // Check if rotation is needed
                this.rotateIfNeeded();

                const timestamp = info.timestamp || new Date().toISOString();
                const level = String(info.level || 'info').toUpperCase();
                const message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);

                // Format the log line as JSON for easy parsing
                const logEntry = {
                    timestamp,
                    level: level.toLowerCase(),
                    message,
                    context: info.context
                };

                const logLine = JSON.stringify(logEntry) + '\n';

                // Append to file
                appendFileSync(this.currentLogPath, logLine, { encoding: 'utf8' });

                // Emit the logged event
                this.emit('logged', info);
            } catch (error) {
                // If there's an error writing, emit an error event
                this.emit('error', error);
            }

            callback();
        });
    }

    /**
     * Gets the full path for a log file using VS Code's global storage directory.
     * Combines the global storage path with the specified filename.
     * @param filename The filename to get the path for
     * @returns Full absolute path to the log file in global storage
     */
    private getLogPath(filename: string): string {
        const globalStoragePath = this.context.globalStorageUri.fsPath;
        return join(globalStoragePath, filename);
    }

    /**
     * Ensures the log directory exists by creating it if necessary.
     * Uses fs-extra's ensureDirSync to create the directory structure recursively.
     */
    private ensureLogDirectory(): void {
        const logDir = dirname(this.currentLogPath);
        ensureDirSync(logDir);
    }

    /**
     * Checks if the current log file needs rotation and performs it if necessary.
     * Rotation occurs when the file size exceeds the configured maximum size limit.
     * Emits error events if file stat checking fails but continues operation.
     */
    private rotateIfNeeded(): void {
        try {
            if (!pathExistsSync(this.currentLogPath)) {
                return; // File doesn't exist yet, no rotation needed
            }

            const stats = statSync(this.currentLogPath);
            if (stats.size >= this.maxSize) {
                this.performRotation();
            }
        } catch (error) {
            // If we can't check file stats, continue without rotation
            this.emit('error', new Error(`Failed to check log file size: ${error}`));
        }
    }

    /**
     * Performs log file rotation by shifting existing files and moving the current log.
     * Maintains a rolling set of numbered log files, removing the oldest when the limit is reached.
     * Emits error events if rotation fails but doesn't throw to avoid breaking logging.
     */
    private performRotation(): void {
        try {
            const logDir = dirname(this.currentLogPath);
            const baseName = parse(this.baseFilename).name;
            const extension = parse(this.baseFilename).ext;

            // Shift existing rotated files
            for (let i = this.maxFiles - 1; i >= 1; i--) {
                const oldFile = join(logDir, `${baseName}.${i}${extension}`);
                const newFile = join(logDir, `${baseName}.${i + 1}${extension}`);

                if (pathExistsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        // Delete the oldest file
                        removeSync(oldFile);
                    } else {
                        // Move to next number
                        renameSync(oldFile, newFile);
                    }
                }
            }

            // Move current log to .1
            const rotatedFile = join(logDir, `${baseName}.1${extension}`);
            if (pathExistsSync(this.currentLogPath)) {
                renameSync(this.currentLogPath, rotatedFile);
            }

            // Current log file will be recreated on next write
        } catch (error) {
            this.emit('error', new Error(`Failed to rotate log files: ${error}`));
        }
    }
}