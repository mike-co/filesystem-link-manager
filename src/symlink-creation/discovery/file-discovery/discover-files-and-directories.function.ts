import fg from 'fast-glob';
import { pathExists, stat } from 'fs-extra';
import { isAbsolute, resolve } from 'node:path';
import type { FileDiscoveryOptions } from '../types/file-discovery-options.interface';
import { FileSystemItemType } from '../../config';

/**
 * Provides common fast-glob configuration with customizable options.
 * 
 * @param baseDirectoryPath Base directory path to search for files within
 * @param pattern Glob pattern or array of patterns for file matching
 * @param extraOptions Additional fast-glob options to override defaults
 * @returns Promise resolving to array of discovered absolute file paths
 */
async function discoverInternal(
    baseDirectoryPath: string,
    pattern: string | string[],
    extraOptions: fg.Options = {},
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Normalize path for cross-platform compatibility
    const normalizedBasePath = resolve(baseDirectoryPath);
    const globOptions: fg.Options = {
        caseSensitiveMatch: false, // Match files case-insensitively (cross-platform consistency)
        baseNameMatch: true,       // Match patterns against filenames only, not full paths
        absolute: true,            // Return absolute file paths
        onlyFiles: true,           // Exclude directories from results
        dot: true,                 // Include dotfiles (e.g., .gitignore)
        globstar: true,            // Enable recursive ** patterns
        unique: true,              // Remove duplicate results
        followSymbolicLinks: false,// Do not follow symlinks (security/performance)
        deep: 20,                  // Limit recursion depth to 20 levels
        suppressErrors: false,     // Do not suppress errors (report for debugging)
        throwErrorOnBrokenSymbolicLink: false, // Do not throw on broken symlinks
        markDirectories: false,    // Do not mark directories (we only want files)
        objectMode: false,         // Return file paths as strings, not objects
        stats: false,              // Do not include file stats (performance)
        cwd: normalizedBasePath,
        ...extraOptions,
    };

    if (options && typeof options.followSymbolicLinks === 'boolean') {
        globOptions.followSymbolicLinks = options.followSymbolicLinks;
    }

    const paths = await fg(pattern, globOptions);
    return paths.map(path => resolve(path));
}

/**
 * Discover files using glob patterns with fast-glob.
 * Optimized for performance with large file sets and cross-platform compatibility.
 * 
 * @param baseDirectoryPath - Base directory path to search for files
 * @param globPattern - Glob pattern to match files
 * @returns Promise resolving to array of discovered file paths
 */
export async function discoverFilesWithGlob(
    baseDirectoryPath: string,
    globPattern: string,
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Use fast-glob for glob patterns with comprehensive options optimized for performance
    return discoverInternal(baseDirectoryPath, globPattern, {
        braceExpansion: true,
        extglob: true
    }, options);
}

/**
 * Discover all files in a directory for regex filtering.
 * Optimized for performance and cross-platform compatibility.
 * 
 * @param baseDirectoryPath - Base directory path to search for files
 * @returns Promise resolving to array of all file paths
 */
export async function discoverAllFiles(
    baseDirectoryPath: string,
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Use fast-glob to get all files for regex filtering with performance optimizations
    return discoverInternal(baseDirectoryPath, '**/*', {}, options);
}

/**
 * Discover files using fast-glob with ignore patterns.
 * Optimized for performance and cross-platform compatibility.
 * 
 * @param baseDirectoryPath - Base directory path to search for files
 * @param ignorePatterns - Array of ignore patterns for fast-glob
 * @returns Promise resolving to array of discovered file paths
 */
export async function discoverFilesWithIgnore(
    baseDirectoryPath: string,
    ignorePatterns: string[],
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Find all files excluding the ignore patterns with performance optimizations
    return discoverInternal(baseDirectoryPath, '**/*', {
        ignore: ignorePatterns,
    }, options);
}

/**
 * Discover directories using glob patterns with fast-glob.
 * Optimized for performance and cross-platform compatibility.
 *
 * @param baseDirectoryPath - Base directory path to search for directories
 * @param globPattern - Glob pattern to match directories
 * @returns Promise resolving to array of discovered directory paths
 */
export async function discoverDirectoriesWithGlob(
    baseDirectoryPath: string,
    globPattern: string,
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Use fast-glob for glob patterns with comprehensive options optimized for performance
    return discoverInternal(baseDirectoryPath, globPattern, {
        braceExpansion: true,
        extglob: true,
        onlyDirectories: true
    }, options);
}

/**
 * Discover directories using glob patterns with fast-glob.
 * Optimized for performance and cross-platform compatibility.
 *
 * @param baseDirectoryPath - Base directory path to search for directories
 * @param globPattern - Glob pattern to match directories
 * @returns Promise resolving to array of discovered directory paths
 */
export async function discoverAllDirectories(
    baseDirectoryPath: string,
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Use fast-glob for glob patterns with comprehensive options optimized for performance
    return discoverInternal(baseDirectoryPath, '**/*', {
        onlyDirectories: true
    }, options);
}

/**
 * Discover directories using fast-glob with ignore patterns.
 * Optimized for performance and cross-platform compatibility.
 *
 * @param baseDirectoryPath - Base directory path to search for directories
 * @param ignorePatterns - Array of ignore patterns for fast-glob
 * @returns Promise resolving to array of discovered directory paths
 */
export async function discoverDirectoriesWithIgnore(
    baseDirectoryPath: string,
    ignorePatterns: string[],
    options?: FileDiscoveryOptions
): Promise<string[]> {
    // Find all files excluding the ignore patterns with performance optimizations
    return discoverInternal(baseDirectoryPath, '**/*', {
        ignore: ignorePatterns,
        onlyDirectories: true
    }, options);
}

/**
 * Discover a list of directory paths (absolute or relative to baseDirectoryPath).
 * For each supplied path: resolve it to an absolute path (if relative, resolve against baseDirectoryPath),
 * check that it exists and is a directory, and return the list of absolute paths that exist.
 *
 * @param baseDirectoryPath - Base directory path to resolve relative paths against
 * @param paths - Array of directory paths (absolute or relative)
 * @returns Promise resolving to array of absolute directory paths that exist
 */
export async function discoverDirectoriesWithPath(
    baseDirectoryPath: string,
    paths: string[] | string
): Promise<string[]> {
    return discoverPathsWithType(baseDirectoryPath, paths, 'directory');
}

/**
 * Discover a list of file paths (absolute or relative to baseDirectoryPath).
 * For each supplied path: resolve it to an absolute path (if relative, resolve against baseDirectoryPath),
 * check that it exists and is a file, and return the list of absolute paths that exist.
 *
 * @param baseDirectoryPath - Base directory path to resolve relative paths against
 * @param paths - Array of file paths (absolute or relative)
 * @returns Promise resolving to array of absolute file paths that exist
 */
export async function discoverFilesWithPath(
    baseDirectoryPath: string,
    paths: string[] | string
): Promise<string[]> {
    return discoverPathsWithType(baseDirectoryPath, paths, 'file');
}

/**
 * Shared helper to discover paths that exist and match the requested type (file or directory).
 * Returns unique, resolved absolute paths.
 */
async function discoverPathsWithType(
    baseDirectoryPath: string,
    paths: string[] | string,
    itemType: FileSystemItemType
): Promise<string[]> {
    // Normalize paths to an array so callers may supply a single string or an array
    const pathArray: string[] = typeof paths === 'string'
        ? (paths.trim().length > 0 ? [paths] : [])
        : paths;

    if (!Array.isArray(pathArray) || pathArray.length === 0) {
        return [];
    }

    const results: string[] = [];

    for (const candidate of pathArray) {
        if (typeof candidate !== 'string' || candidate.trim().length === 0) {
            continue;
        }

        const absPath = isAbsolute(candidate) ? resolve(candidate) : resolve(baseDirectoryPath, candidate);

        try {
            const exists = await pathExists(absPath);
            if (!exists) {
                continue;
            }

            const statValue = await stat(absPath);
            if (itemType === 'directory' ? statValue.isDirectory() : statValue.isFile()) {
                // Use resolved absolute path for consistency
                results.push(resolve(absPath));
            }
        }
        catch {
            // Ignore errors for individual paths (e.g., permission issues or broken symlinks)
            continue;
        }
    }

    // Ensure uniqueness
    return Array.from(new Set(results));
}

