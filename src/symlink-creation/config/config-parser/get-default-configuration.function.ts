import { FileSystemOperationConfig } from "../types/core/file-system-operation-config.interface";

/**
 * Get default configuration values when no user config exists.
 * 
 * Provides sensible defaults for some configuration options.
 * 
 * @returns Default FileSystemOperationConfig object with all properties defined
 */
export function getDefaultConfiguration(): FileSystemOperationConfig {
    return {
        targetDirectoryPath: ".",
        silentMode: false,
        defaultOverwriteBehavior: 'overwrite',
        operations: [],
        postExecutionCommands: [],
        fileCountPromptThreshold: 749,
        enableSourceDeduplication: false,
        disableCommandValidation: false,
        disableRegexValidation: false
    };
}