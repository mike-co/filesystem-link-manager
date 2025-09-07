
import { injectable } from 'tsyringe';
import { LoggerService } from '../../logging/logger.service';
import { normalizeConfigPaths } from './config-parser/normalize-config-paths.function';
import { parseConfig } from './config-parser/parse-config.function';
import { validateConfig } from './config-parser/validate-config.function';
import type { FileSystemOperationConfig } from './types/core/file-system-operation-config.interface';

/**
 * Configuration parsing orchestrator service
 * 
 * Responsible for coordinating configuration parsing operations from VS Code
 * workspace/user settings using `filesystemLinkManager.config` path.
 */
@injectable()
export class ConfigParserService {
    private readonly operation = 'configurationParsing';
    /**
     * Constructs a new ConfigParserService with injected logger.
     * 
     * @param loggerService - LoggerService instance injected via DI container
     */
    public constructor(private readonly loggerService: LoggerService) {}

    /**
     * Parse and validate provided configuration object
     * 
     * Coordinates with parseConfig function to process configuration object.
     * Normalizes path separators for cross-platform compatibility.
     * Provides comprehensive error handling and validation of configuration structure.
     * 
     * @param configData - Configuration object to parse and validate
     * @returns Promise resolving to parsed SymlinkConfig with normalized paths
     * @throws Error when configuration parsing fails with detailed error messages
     */
    public async parseConfiguration(configData: unknown): Promise<FileSystemOperationConfig> {
        const config = await parseConfig(configData);

        // Normalize all path separators for cross-platform compatibility
        const normalizedConfig = normalizeConfigPaths(config);

        // Validate the parsed configuration to ensure type safety and security
        await validateConfig(normalizedConfig);

        if (normalizedConfig.silentMode) {
            this.loggerService.info(`[Silent Mode] enabled`, {
                operation: this.operation,
                ...{
                    defaultOverwriteBehavior: normalizedConfig.defaultOverwriteBehavior,
                    symlinkCountPromptThreshold: normalizedConfig.fileCountPromptThreshold,
                },
            });
        }

        return normalizedConfig;
    }
}