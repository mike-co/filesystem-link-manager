import { DomainError } from '../../../common';
import { CONFIG_DOMAIN_ERRORS } from '../config-domain-errors.const';
import { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';
import { getDefaultConfiguration } from './get-default-configuration.function';


/**
 * Parse configuration from provided configuration object
 * 
 * Processes provided configuration object and merges with defaults.
 * Provides comprehensive error handling for configuration parsing failures.
 * 
 * @param configData - Configuration object to parse and validate
 * @returns Promise resolving to parsed SymlinkConfig
 * @throws DomainError with CONFIG_VALUE_NULL type when configuration value is explicitly null
 * @throws DomainError with CONFIG_TYPE type when configuration value is not an object
 * @throws DomainError with CONFIG_PARSE type when other parsing failures occur
 */
export function parseConfig(configData: unknown): Promise<FileSystemOperationConfig> {
    return Promise.resolve().then(() => {
        try {
            // Validate that we got some kind of configuration object
            if (configData === null) {
                throw new DomainError(CONFIG_DOMAIN_ERRORS.CONFIG_VALUE_NULL);
            }

            // Ensure the result is a proper object and not a primitive
            if (typeof configData !== 'object' || configData === null) {
                throw new DomainError({
                    ...CONFIG_DOMAIN_ERRORS.CONFIG_TYPE,
                    message: `Configuration must be an object, received: ${typeof configData}`
                });
            }

            // Merge configData with defaults to ensure all required properties exist
            const result: FileSystemOperationConfig = {
                ...getDefaultConfiguration(),
                ...configData
            };

            return result;
        } catch (error) {
            // Re-throw domain-specific errors directly
            if (error instanceof DomainError) {
                throw error;
            }
            
            // Wrap other errors with context and proper cause chain
            if (error instanceof Error) {
                throw new DomainError(CONFIG_DOMAIN_ERRORS.CONFIG_PARSE, { cause: error });
            }
            // Handle non-Error objects
            throw new DomainError({
                ...CONFIG_DOMAIN_ERRORS.CONFIG_PARSE,
                message: `Failed to parse configuration: ${String(error)}`
            });
        }
    });
}