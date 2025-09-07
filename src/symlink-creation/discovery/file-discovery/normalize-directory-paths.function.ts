import { normalize, resolve, sep } from 'path';

/**
 * Normalizes directory paths to remove parent-child duplicates.
 * When both a parent directory and its child are present in the list,
 * the child directory is removed to avoid double-counting files.
 * Provides efficient deduplication for directory path arrays.
 * 
 * @param directoryPaths Array of directory paths to normalize and deduplicate
 * @returns Array of normalized directory paths with only distinct top-level directories
 */
export function normalizeDirectoryPaths(directoryPaths: string[]): string[] {
    if (!directoryPaths || directoryPaths.length === 0) {
        return [];
    }

    // Normalize and resolve all paths to ensure consistent comparison
    const normalizedPaths = directoryPaths.map(path => normalize(resolve(path)));
    
    // Remove duplicates first
    const uniquePaths = [...new Set(normalizedPaths)];
    
    // Sort paths by length (shorter paths = higher in hierarchy)
    const sortedPaths = uniquePaths.sort((a, b) => a.length - b.length);
    
    const result: string[] = [];
    
    for (const currentPath of sortedPaths) {
        // Check if current path is a child of any existing path in result
        const isChildOfExisting = result.some(existingPath => 
            isChildDirectory(currentPath, existingPath)
        );
        
        if (!isChildOfExisting) {
            // Remove any existing paths that are children of current path
            const pathsToKeep = result.filter(existingPath => 
                !isChildDirectory(existingPath, currentPath)
            );
            
            // Add current path and keep non-child paths
            result.length = 0;
            result.push(...pathsToKeep, currentPath);
        }
    }
    
    return result;
}

/**
 * Checks if a given path is a child directory of a parent path.
 * 
 * @param childPath - Potential child directory path
 * @param parentPath - Potential parent directory path
 * @returns True if childPath is a subdirectory of parentPath
 */
function isChildDirectory(childPath: string, parentPath: string): boolean {
    // Normalize paths for consistent comparison
    const normalizedChild = normalize(childPath);
    const normalizedParent = normalize(parentPath);
    
    // Child must be different from parent
    if (normalizedChild === normalizedParent) {
        return false;
    }
    
    // Ensure parent path ends with separator for accurate comparison
    const parentWithSep = normalizedParent + sep;
    
    // Child path must start with parent path
    return normalizedChild.startsWith(parentWithSep);
}