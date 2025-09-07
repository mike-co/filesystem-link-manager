import { chmod, stat } from 'fs-extra';
import { DomainError } from '../../../common';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

/**
 * Sets or removes the readonly attribute on a file.
 * Uses cross-platform file system permissions to modify write access.
 * On Windows, modifies the write bit in the file mode.
 * On Unix-like systems, modifies the owner write permission bit.
 * 
 * @param filePath - Absolute path to the file to modify
 * @param readonly - True to make file readonly (remove write access), false to make writable (add write access)
 * @returns Promise that resolves when the file attribute change is complete
 * @throws DomainError with FILE_ATTRIBUTE_MODIFICATION_FAILED when file attribute modification fails due to permissions or filesystem constraints
 */
export async function setFileReadonly(filePath: string, readonly: boolean): Promise<void> {
    try {
        const stats = await stat(filePath);
        let newMode = stats.mode;
        
        if (process.platform === 'win32') {
            // Windows: set/clear the write bit
            if (readonly) {
                newMode &= ~0o200; // Clear write bit
            } else {
                newMode |= 0o200; // Set write bit
            }
        } else {
            // Unix-like: set/clear owner write permission
            if (readonly) {
                newMode &= ~0o200; // Clear owner write bit
            } else {
                newMode |= 0o200; // Set owner write bit
            }
        }
        
        await chmod(filePath, newMode);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error setting file readonly status';
        const domainError = new DomainError(FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_MODIFICATION_FAILED);
        domainError.message = `Failed to set readonly status for file ${filePath}: ${errorMessage}`;
        throw domainError;
    }
}