import { normalize } from 'path';
import type { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';

/**
 * Normalizes all path properties in the configuration to use the correct
 * directory separator for the current operating system.
 * 
 * Ensures consistent path formatting by converting mixed separators (/ and \)
 * to the platform-appropriate separator using Node.js path.normalize().
 * 
 * @param config - Configuration object with potentially mixed path separators
 * @returns Configuration object with normalized path separators
 */
export function normalizeConfigPaths(config: FileSystemOperationConfig): FileSystemOperationConfig {
    const normalizedConfig = { ...config };

    // Normalize top-level target directory path
    normalizedConfig.targetDirectoryPath = normalize(config.targetDirectoryPath);

    // Normalize operations source paths
    if (config.operations) {
        normalizedConfig.operations = config.operations.map(source => ({
            ...source,
            baseDirectoryPath: normalize(source.baseDirectoryPath),
            destinationPath: source.destinationPath ? normalize(source.destinationPath) : undefined
        }));
    }

    return normalizedConfig;
}
