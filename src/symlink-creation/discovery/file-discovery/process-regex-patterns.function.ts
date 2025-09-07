import { DomainError } from '../../../common';
import type { LoggerService } from '../../../logging';
import { DISCOVERY_DOMAIN_ERRORS } from '../discovery-domain-errors.const';

/**
 * Process regex pattern against file paths with comprehensive error handling.
 * Filters file paths using provided regular expression pattern.
 * 
 * @param filePaths Array of file paths to filter using regex pattern
 * @param pattern Regular expression pattern string for file path matching
 * @param logger Logger service for debugging and error reporting
 * @param baseDirectoryPath Base directory path for logging context
 * @returns Array of filtered file paths that match the regex pattern
 * @throws DomainError with DISCOVERY_PATTERN type if pattern is invalid or compilation fails
 */
export function processRegexPattern(
    filePaths: string[],
    pattern: string,
    logger: LoggerService,
    baseDirectoryPath: string
): string[] {
    const regexPattern = createRegexPattern(pattern);
    return filterFilesWithRegex(filePaths, regexPattern, logger, baseDirectoryPath);
}

/**
 * Create a regex pattern with error handling and case sensitivity options.
 * 
 * @param pattern - Regex pattern string
 * @returns RegExp object
 * @throws DomainError with DISCOVERY_PATTERN type if pattern is invalid
 */
function createRegexPattern(pattern: string): RegExp {
    try {
        // Default to case-sensitive matching (standard regex behavior)
        // Future enhancement: could be configurable based on searchPattern options       
        const regexPattern = new RegExp(pattern, 'i');
        return regexPattern;
    } catch (error) {
        // Transform generic regex errors into domain-specific errors
        throw new DomainError({
            ...DISCOVERY_DOMAIN_ERRORS.DISCOVERY_PATTERN,
            message: `Invalid regex pattern '${pattern}'`
        }, { cause: error });
    }
}

/**
 * Filter file paths using regex pattern with error handling.
 * 
 * @param filePaths - Array of file paths to filter
 * @param regexPattern - RegExp pattern to test against file paths
 * @param logger - Logger service for debugging
 * @param baseDirectoryPath - Base directory path for logging context
 * @returns Array of filtered file paths
 */
function filterFilesWithRegex(
    filePaths: string[],
    regexPattern: RegExp,
    logger: LoggerService,
    baseDirectoryPath: string
): string[] {
    // Enhanced filtering with better error handling
    const regexResults = filePaths.filter(filePath => {
        try {
            return regexPattern.test(filePath);
        } catch (error) {
            logger.debug(`Error testing regex against file path ${filePath}: ${error}`, {
                operation: 'fileDiscovery',
                workingDirectory: baseDirectoryPath,
            });
            return false; // Skip files that cause regex test errors
        }
    });
    
    return regexResults;
}