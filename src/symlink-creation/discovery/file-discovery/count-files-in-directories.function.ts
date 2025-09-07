import { DomainError } from '../../../common';
import { DISCOVERY_DOMAIN_ERRORS } from '../discovery-domain-errors.const';
import { discoverAllFiles } from './discover-files-and-directories.function';
import { normalizeDirectoryPaths } from './normalize-directory-paths.function';

/**
 * Counts files in multiple directories with normalization to avoid double-counting.
 * Normalizes directory paths to remove parent-child duplicates before counting files.
 * Provides efficient file counting across multiple directory trees.
 * 
 * @param directoryPaths Array of directory paths to count files within
 * @returns Promise resolving to total count of files across all normalized directories
 * @throws DomainError when directory access fails or normalization encounters errors
 */
export async function countFilesInDirectories(directoryPaths: string[]): Promise<number> {
    if (!directoryPaths || directoryPaths.length === 0) {
        return 0;
    }

    // Normalize directory paths to remove parent-child duplicates
    const normalizedDirectories = normalizeDirectoryPaths(directoryPaths);
    
    let totalFileCount = 0;
    
    // Count files in each normalized directory
    for (const directoryPath of normalizedDirectories) {
        try {
            const files = await discoverAllFiles(directoryPath);
            const directoryFileCount = files.length;
            totalFileCount += directoryFileCount;
        } catch (error) {
            throw new DomainError(
                DISCOVERY_DOMAIN_ERRORS.DISCOVERY_GENERAL,
                { cause: error }
            );
        }
    }

    return totalFileCount;
}