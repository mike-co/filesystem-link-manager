import { readFile } from 'fs-extra';
import { basename } from 'path';
import { DomainError } from '../../../common';
import type { LoggerService } from '../../../logging';
import { DISCOVERY_DOMAIN_ERRORS } from '../discovery-domain-errors.const';
import { ParsedIgnoreRules } from '../types/parsed-ignore-rules.interface';


/**
 * Process ignore rules file and return parsed patterns.
 * Reads and parses gitignore-style rules file into structured patterns.
 * 
 * @param ignoreFilePath Path to the ignore rules file to process
 * @param logger Logger service for debugging and error reporting
 * @param baseDirectoryPath Base directory path for logging context and relative path resolution
 * @returns Promise resolving to ParsedIgnoreRules with separated patterns, or null if file cannot be processed
 * @throws DomainError when file access fails or parsing encounters critical errors
 */
export async function processIgnoreRulesFile(
    ignoreFilePath: string,
    logger: LoggerService,
    baseDirectoryPath: string
): Promise<ParsedIgnoreRules | null> {
    const ignoreContent = await readIgnoreRulesFile(ignoreFilePath, logger, baseDirectoryPath);
    if (ignoreContent === null) {
        return null;
    }
    const { ignorePatterns, negationPatterns } = parseIgnoreRules(ignoreContent);
    const ignoreFileName = getIgnoreFileName(ignoreFilePath);
    if (ignoreFileName) {
        ignorePatterns.push(ignoreFileName);
    }
    return { ignorePatterns, negationPatterns };
}

/**
 * Helper to convert directory-only pattern to match all contents.
 * @param pattern - Directory pattern ending with '/'
 * @returns Pattern matching all contents of the directory
 */
function expandDirectoryPattern(pattern: string): string {
    return pattern.endsWith('/') ? pattern + '**' : pattern;
}

/**
 * Parse ignore rules from .gitignore-style content.
 * Supports negation patterns (!pattern), directory-only patterns (pattern/),
 * comments (#), and empty lines.
 * 
 * @param ignoreContent - Content of the ignore rules file
 * @returns Object with ignore patterns and negation patterns for fast-glob
 */
function parseIgnoreRules(ignoreContent: string): ParsedIgnoreRules {
    const lines = ignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#')); // Filter comments and empty lines

    const ignorePatterns: string[] = [];
    const negationPatterns: string[] = [];

    for (const line of lines) {
        if (line.startsWith('!')) {
            // Handle negation patterns - remove the ! prefix
            const negationPattern = line.substring(1);
            negationPatterns.push(expandDirectoryPattern(negationPattern));
        } else {
            // Handle regular ignore patterns
            ignorePatterns.push(expandDirectoryPattern(line));
        }
    }

    return { ignorePatterns, negationPatterns };
}

/**
 * Read ignore rules file with error handling.
 * 
 * @param ignoreFilePath - Path to the ignore rules file
 * @param logger - Logger service for debugging
 * @param baseDirectoryPath - Base directory path for logging context
 * @returns Content of the ignore rules file, or null if file doesn't exist
 * @throws DomainError with DISCOVERY_ACCESS type for permission or other file system errors
 */
async function readIgnoreRulesFile(
    ignoreFilePath: string,
    logger: LoggerService,
    baseDirectoryPath: string
): Promise<string | null> {
    try {
        return await readFile(ignoreFilePath, 'utf8');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
            throw new DomainError({
                ...DISCOVERY_DOMAIN_ERRORS.DISCOVERY_ACCESS,
                message: `Permission denied reading ignore rules file '${ignoreFilePath}'`
            }, { cause: error });
        }
        if (errorMessage.includes('ENOENT')) {
            logger.debug(`Ignore rules file not found ${ignoreFilePath}: ${errorMessage}`, {
                operation: 'fileDiscovery',
                workingDirectory: baseDirectoryPath,
            });
            return null;
        }
        logger.debug(`Failed to read ignore rules file ${ignoreFilePath}: ${errorMessage}`, {
            operation: 'fileDiscovery',
            workingDirectory: baseDirectoryPath,
        });
        return null;
    }
}

/**
 * Get ignore filename from file path for inclusion in ignore patterns.
 * 
 * @param ignoreFilePath - Path to the ignore rules file
 * @returns Filename of the ignore file, or null if cannot be determined
 */
function getIgnoreFileName(ignoreFilePath: string): string | null {
    // Add the ignore file itself to the ignore patterns
    const ignoreFileName = basename(ignoreFilePath);
    return ignoreFileName || null;
}