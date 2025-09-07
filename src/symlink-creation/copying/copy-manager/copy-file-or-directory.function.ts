import { copy, ensureDir } from 'fs-extra';
import { dirname } from 'path';
import { DomainError } from '../../../common';
import { COPYING_DOMAIN_ERRORS } from '../copying-domain-errors.const';


/**
 * Copies a single file or directory using fs-extra.copy with destination path handling,
 * permission and metadata preservation, and advanced fs-extra options.
 * 
 * @param sourcePath - Absolute path to the source file/directory to copy.
 * @param targetPath - Absolute path where the file/directory will be copied.
 * @returns Promise resolving when file is copied with metadata preserved.
 * @throws DomainError with copying domain error types if file copying fails.
 */
export async function copyFileOrDirectory(sourcePath: string, targetPath: string): Promise<void> {
    // Ensure target directory exists with appropriate permissions
    try {
        await ensureDir(dirname(targetPath));
    } catch (err) {
        throw new DomainError({
            ...COPYING_DOMAIN_ERRORS.COPY_ACCESS,
            message: `Unable to access or create target directory: ${dirname(targetPath)}`
        }, { cause: err });
    }

    try {
        await copy(sourcePath, targetPath, {
            preserveTimestamps: true,
            dereference: false,
            overwrite: true,
            errorOnExist: false,
        });
    } catch (err) {
        if (err instanceof Error && err.message.toLowerCase().includes('overwrite')) {
            throw new DomainError(COPYING_DOMAIN_ERRORS.COPY_OVERWRITE, { cause: err });
        }
        throw new DomainError({
            ...COPYING_DOMAIN_ERRORS.COPY_GENERAL,
            message: `Failed to copy file from '${sourcePath}' to '${targetPath}'`
        }, { cause: err });
    }
}