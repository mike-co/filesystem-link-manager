import { FileSystemOperation } from '../file-system-operation/file-system-operation.type';
import type { PostExecutionCommand } from './post-execution-command.interface';

/**
 * Main configuration interface for the extension.
 * Represents configuration read from VSCode workspace/user settings.
 * Defines the complete configuration structure for symlink creation operations,
 * including file and directory linking, copying operations, and post-execution commands.
 */
export interface FileSystemOperationConfig {
    /** Absolute or workspace-relative path to the destination directory. */
    targetDirectoryPath: string;
    /** Suppress user prompts for overwrite decisions. */
    silentMode?: boolean;
    /** Default action for file/directory conflicts in silent mode. */
    defaultOverwriteBehavior: 'overwrite' | 'skip' | 'error';
    /** Array of operations for files and directories. */
    operations?: FileSystemOperation[];
    /** Shell commands to execute after file system operations. */
    postExecutionCommands?: PostExecutionCommand[];
    /** Maximum allowed files and links before prompting user for confirmation. */
    fileCountPromptThreshold: number;
    /** 
     * Enable deduplication of operations to prevent redundant sources.
     * When disabled, all sources are processed without deduplication checks,
     * which can improve performance for large workspaces.
     * When disabled it may give higher value for fileCountPromptThreshold if you have duplicated values in search.
     * Defaults to false (deduplication disabled) for faster results.
     * 
     * Performance considerations:
     * - Deduplication requires path analysis and comparison operations
     * - For workspaces with thousands of files, disabling can reduce processing time
     * - Trade-off between performance and avoiding redundant file and link creation
     */
    enableSourceDeduplication?: boolean;
    
    /**
     * Disable regex-based validation for file paths and patterns.
     * The built-in validation is simple and not highly advanced, but helps catch common mistakes and unsafe patterns.
     * Best practice: keep this enabled unless you are confident in your input sources and know what you are doing.
     * WARNING: Disabling regex validation may allow unsafe or malformed patterns.
     * Defaults to false (validation enabled).
     */
    disableRegexValidation?: boolean;

    /**
     * Disable security and syntax validation for shell commands.
     * The built-in validation is simple and not highly advanced, but helps prevent accidental execution of dangerous commands.
     * Best practice: keep this enabled unless you are confident in your commands and know what you are doing.
     * WARNING: Disabling command validation may allow execution of unsafe or destructive commands.
     * Defaults to false (validation enabled).
     */
    disableCommandValidation?: boolean;
}