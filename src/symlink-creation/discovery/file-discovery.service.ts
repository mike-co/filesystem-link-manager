import { normalize } from 'path';
import { injectable } from 'tsyringe';
import { DomainError } from '../../common';
import { LoggerService } from '../../logging';
import { isPathMappingEntry } from '../config';
import type { PathMappingEntry, SearchPatternBase } from '../config';
import { DISCOVERY_DOMAIN_ERRORS } from './discovery-domain-errors.const';
import { countFilesInDirectories } from './file-discovery/count-files-in-directories.function';
import {
    discoverAllDirectories,
    discoverAllFiles,
    discoverDirectoriesWithGlob,
    discoverDirectoriesWithIgnore,
    discoverFilesWithGlob,
    discoverDirectoriesWithPath,
    discoverFilesWithPath,
    discoverFilesWithIgnore
} from './file-discovery/discover-files-and-directories.function';
import { normalizeDirectoryPaths } from './file-discovery/normalize-directory-paths.function';
import { processIgnoreRulesFile } from './file-discovery/process-ignore-rules.function';
import { processRegexPattern } from './file-discovery/process-regex-patterns.function';
import type { FileDiscoveryOptions } from './types/file-discovery-options.interface';

/**
 * File discovery orchestrator service for discovering files and directories.
 * Responsible for discovering files matching patterns in base directories
 * using glob patterns, regex patterns, and .gitignore-style ignore rules.
 */
@injectable()
export class FileDiscoveryService {
    /**
     * Constructs a new FileDiscoveryService with injected logger.
     * 
     * @param loggerService LoggerService instance injected via DI container for structured logging
     */
    public constructor(private readonly loggerService: LoggerService) {}

    /**
     * Common discovery method for both files and directories.
     * Orchestrates pattern processing and delegates to specialized discovery functions.
     * 
     * @param baseDirectoryPath Base directory path to search within
     * @param searchPatterns Array of search patterns to match against files or directories
     * @param mode Discovery mode specifying whether to discover 'files' or 'directories'
     * @param options Optional discovery behavior overrides
     * @returns Promise resolving to array of discovered absolute paths
     */
    private async discoverCommon(
        baseDirectoryPath: string, 
        searchPatterns: SearchPatternBase[], 
        mode: 'files' | 'directories',
        options?: FileDiscoveryOptions
    ): Promise<string[]> {
        this.loggerService.debug(`Discovering ${mode} in ${baseDirectoryPath} with ${searchPatterns.length} patterns`, {
            operation: `${mode}Discovery`,
            workingDirectory: baseDirectoryPath,
        });

        const allDiscovered: string[] = [];

        for (const searchPattern of searchPatterns) {
            if (searchPattern.patternType === 'path') {
                const normalizedPattern = this.normalizePathPatternForDiscovery(searchPattern.pattern);

                if (mode === 'files') {
                    const files = await discoverFilesWithPath(baseDirectoryPath, normalizedPattern);
                    allDiscovered.push(...files);
                }
                else if (mode === 'directories') {
                    const directories = await discoverDirectoriesWithPath(baseDirectoryPath, normalizedPattern);
                    allDiscovered.push(...directories);
                }
            } else if (searchPattern.patternType === 'glob') {
                // Use extracted function for glob pattern discovery
                const globResults = mode === 'files' 
                    ? await discoverFilesWithGlob(baseDirectoryPath, searchPattern.pattern as string, options)
                    : await discoverDirectoriesWithGlob(baseDirectoryPath, searchPattern.pattern as string, options);
                allDiscovered.push(...globResults);
            } else if (searchPattern.patternType === 'regex') {
                // Use extracted functions for regex pattern processing
                const allItems = mode === 'files'
                    ? await discoverAllFiles(baseDirectoryPath, options)
                    : await discoverAllDirectories(baseDirectoryPath, options);
                const regexResults = processRegexPattern(
                    allItems,
                    searchPattern.pattern as string,
                    this.loggerService,
                    baseDirectoryPath
                );
                allDiscovered.push(...regexResults);
            } else if (searchPattern.patternType === 'ignore-rules-file-path') {
                // Use extracted function for ignore rules processing
                const parsedRules = await processIgnoreRulesFile(
                    searchPattern.pattern as string,
                    this.loggerService,
                    baseDirectoryPath
                );
                
                if (parsedRules) {
                    const { ignorePatterns, negationPatterns } = parsedRules;
                    
                    // First, find all items excluding the ignore patterns
                    const allItems = mode === 'files'
                        ? await discoverFilesWithIgnore(baseDirectoryPath, ignorePatterns, options)
                        : await discoverDirectoriesWithIgnore(baseDirectoryPath, ignorePatterns, options);
                    
                    // If there are negation patterns, find items that match them and add them back
                    if (negationPatterns.length > 0) {
                        for (const negationPattern of negationPatterns) {
                            const negatedItems = mode === 'files'
                                ? await discoverFilesWithGlob(baseDirectoryPath, negationPattern, options)
                                : await discoverDirectoriesWithGlob(baseDirectoryPath, negationPattern, options);
                            
                            // Add back the negated items that were excluded by ignore patterns
                            for (const negatedItem of negatedItems) {
                                if (!allItems.includes(negatedItem)) {
                                    allItems.push(negatedItem);
                                }
                            }
                        }
                    }
                    
                    allDiscovered.push(...allItems);
                }
            } else {
                const errorMessage = `Not supported pattern '${searchPattern.patternType}'`;
                // For now, other pattern types are not implemented
                this.loggerService.error(errorMessage, {
                    operation: `${mode}Discovery`,
                    workingDirectory: baseDirectoryPath,
                });
            
                throw new DomainError({
                    ...DISCOVERY_DOMAIN_ERRORS.DISCOVERY_PATTERN,
                    message: errorMessage
                });
            }
        }

        if(mode === 'directories') {
            return normalizeDirectoryPaths(allDiscovered);
        }

        return allDiscovered.map(path => normalize(path));
    }

    /**
     * Discover files matching search patterns in the specified base directory.
     * Supports glob, regex, path, and ignore-rules-file-path pattern types.
     * 
     * @param baseDirectoryPath Base directory path to search for files within
     * @param searchPatterns Array of search patterns to match files against
     * @returns Promise resolving to array of discovered absolute file paths
     */
    public async discoverFiles(
        baseDirectoryPath: string,
        searchPatterns: SearchPatternBase[],
        options?: FileDiscoveryOptions
    ): Promise<string[]> {
        return this.discoverCommon(baseDirectoryPath, searchPatterns, 'files', options);
    }

    /**
     * Count files in multiple directories with normalization to avoid double-counting.
     * Normalizes directory paths to remove parent-child duplicates before counting files.
     * 
     * @param directoryPaths Array of directory paths to count files within
     * @returns Promise resolving to total count of files across all normalized directories
     */
    public async countFilesInDirectories(directoryPaths: string[]): Promise<number> {
        if(!directoryPaths || directoryPaths.length === 0) {
            return 0;
        }
        this.loggerService.debug(`Starting file count for ${directoryPaths.length} directories`, {
            operation: 'countFilesInDirectories',
            processedCount: directoryPaths.length,
            workingDirectory: directoryPaths[0] || 'unknown',
        });

        // Orchestrate calls to pure functions
        const result = await countFilesInDirectories(directoryPaths);

        this.loggerService.debug(`File counting operation completed with result: ${result}`, {
            operation: 'countFilesInDirectories',
            processedCount: result,
            workingDirectory: directoryPaths[0] || 'unknown',
        });

        return result;
    }

    /**
     * Discover directories matching search patterns with parent-child filtering.
     * Returns only distinct top-level directories (parents over children).
     * Supports glob, regex, path, and ignore-rules-file-path pattern types.
     * 
     * @param baseDirectoryPath Base directory path to search for directories within
     * @param searchPatterns Array of search patterns to match directories against
     * @returns Promise resolving to array of distinct top-level directory absolute paths
     */
    public async discoverDirectories(
        baseDirectoryPath: string,
        searchPatterns: SearchPatternBase[],
        options?: FileDiscoveryOptions
    ): Promise<string[]> {
        return this.discoverCommon(baseDirectoryPath, searchPatterns, 'directories', options);
    }

    private normalizePathPatternForDiscovery(
        pattern: string | PathMappingEntry | Array<string | PathMappingEntry>
    ): string | string[] {
        if (typeof pattern === 'string') {
            return pattern;
        }

        if (Array.isArray(pattern)) {
            const normalizedEntries: string[] = [];

            for (const entry of pattern) {
                if (typeof entry === 'string') {
                    normalizedEntries.push(entry);
                }
                else if (isPathMappingEntry(entry)) {
                    normalizedEntries.push(entry.sourcePath);
                }
            }

            return normalizedEntries;
        }

        if (isPathMappingEntry(pattern)) {
            return pattern.sourcePath;
        }

        return [];
    }
}