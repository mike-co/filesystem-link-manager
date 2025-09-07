import { normalize } from 'path';
import { injectable } from 'tsyringe';
import { DomainError } from '../../common';
import { LoggerService } from '../../logging';
import type { SearchPatternBase } from '../config';
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
     * @returns Promise resolving to array of discovered absolute paths
     */
    private async discoverCommon(
        baseDirectoryPath: string, 
        searchPatterns: SearchPatternBase[], 
        mode: 'files' | 'directories'
    ): Promise<string[]> {
        this.loggerService.debug(`Discovering ${mode} in ${baseDirectoryPath} with ${searchPatterns.length} patterns`, {
            operation: `${mode}Discovery`,
            workingDirectory: baseDirectoryPath,
        });

        const allDiscovered: string[] = [];

        for (const searchPattern of searchPatterns) {
            if (searchPattern.patternType === 'path') {
                if(mode === 'files') {
                    const files = await discoverFilesWithPath(baseDirectoryPath, searchPattern.pattern);
                    allDiscovered.push(...files);
                } else if(mode === 'directories') {
                    const files = await discoverDirectoriesWithPath(baseDirectoryPath, searchPattern.pattern);
                    allDiscovered.push(...files);
                }

            } else if (searchPattern.patternType === 'glob') {
                // Use extracted function for glob pattern discovery
                const globResults = mode === 'files' 
                    ? await discoverFilesWithGlob(baseDirectoryPath, searchPattern.pattern as string)
                    : await discoverDirectoriesWithGlob(baseDirectoryPath, searchPattern.pattern as string);
                allDiscovered.push(...globResults);
            } else if (searchPattern.patternType === 'regex') {
                // Use extracted functions for regex pattern processing
                const allItems = mode === 'files'
                    ? await discoverAllFiles(baseDirectoryPath)
                    : await discoverAllDirectories(baseDirectoryPath);
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
                        ? await discoverFilesWithIgnore(baseDirectoryPath, ignorePatterns)
                        : await discoverDirectoriesWithIgnore(baseDirectoryPath, ignorePatterns);
                    
                    // If there are negation patterns, find items that match them and add them back
                    if (negationPatterns.length > 0) {
                        for (const negationPattern of negationPatterns) {
                            const negatedItems = mode === 'files'
                                ? await discoverFilesWithGlob(baseDirectoryPath, negationPattern)
                                : await discoverDirectoriesWithGlob(baseDirectoryPath, negationPattern);
                            
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
    public async discoverFiles(baseDirectoryPath: string, searchPatterns: SearchPatternBase[]): Promise<string[]> {
        return this.discoverCommon(baseDirectoryPath, searchPatterns, 'files');
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
    public async discoverDirectories(baseDirectoryPath: string, searchPatterns: SearchPatternBase[]): Promise<string[]> {
        return this.discoverCommon(baseDirectoryPath, searchPatterns, 'directories');
    }
}