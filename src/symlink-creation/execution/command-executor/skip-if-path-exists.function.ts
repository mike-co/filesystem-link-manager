import { pathExists } from 'fs-extra';
import { isAbsolute, resolve } from 'path';
import { EXECUTION_DOMAIN_ERRORS } from '../execution-domain-errors.const';
import { createExecutionError } from './create-execution-error.function';

/**
 * Checks if command should be skipped based on path existence using fs-extra.pathExists.
 * 
 * @param targetDirectoryPath Base directory path for resolving relative paths
 * @param skipIfPathExists Path to check for existence (absolute or relative to targetDirectoryPath)
 * @returns Promise that resolves to true if path exists, false otherwise
 * @throws DomainError when path validation fails due to access issues
 */
export async function skipIfPathExists(targetDirectoryPath: string, skipIfPathExists: string): Promise<boolean> {
    const skipPath = isAbsolute(skipIfPathExists)
        ? skipIfPathExists
        : resolve(targetDirectoryPath, skipIfPathExists);
    try {
        return await pathExists(skipPath);
    } catch (error) {
        throw createExecutionError(error, EXECUTION_DOMAIN_ERRORS.EXECUTION_ACCESS_PATH_EXISTS_CHECK);
    }
}