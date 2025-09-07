import type { SearchPatternBase } from '../../config';

/**
 * Ignore rules file pattern for gitignore-style file exclusion.
 * References a file containing gitignore-style rules for sophisticated file filtering.
 */
export interface IgnoreRulesSearchPattern extends SearchPatternBase {
    /**
     * Type discriminant for ignore rules file pattern matching.
     * Always 'ignore-rules-file-path' for this pattern type to enable discriminated union behavior.
     */
    patternType: 'ignore-rules-file-path';
    
    /**
     * Path to file containing gitignore-style rules for file exclusion.
     * File should contain patterns in gitignore format, one per line.
     * Examples: '.gitignore', 'custom-ignore.txt', 'build-ignore.rules'
     * Supports relative paths (resolved from base directory) and absolute paths.
     */
    pattern: string;
}