import { stat } from 'fs-extra';
import { DomainError } from '../../../common';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

/**
 * Checks if a file is currently set to readonly mode.
 * Uses cross-platform file system permissions to determine write access.
 * On Windows, checks the write bit in the file mode.
 * On Unix-like systems, checks the owner write permission bit.
 * 
 * @param filePath - Absolute path to the file to check for readonly status
 * @returns Promise resolving to true if file is readonly (not writable), false if writable
 * @throws DomainError with FILE_ATTRIBUTE_CHECK_FAILED when file access check fails due to permissions or invalid path
 */
export async function isFileReadonly(filePath: string): Promise<boolean> {
    try {
        const stats = await stat(filePath);
        
        // On Windows, check the readonly attribute via mode
        // On Unix-like systems, check write permission for owner
        if (process.platform === 'win32') {
            // Windows: check if write bit is set in mode
            return (stats.mode & 0o200) === 0;
        } else {
            // Unix-like: check if owner has write permission
            return (stats.mode & 0o200) === 0;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error checking file readonly status';
        const domainError = new DomainError(FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_CHECK_FAILED, {cause: error});
        domainError.message = `Failed to check readonly status for file ${filePath}: ${errorMessage}`;
        throw domainError;
    }
}