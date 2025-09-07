/**
 * Base interface for all search pattern types.
 * 
 * Provides the foundation discriminated union interface for pattern matching
 * with support for regex, glob, and ignore rules file paths.
 */
export interface SearchPatternBase {
    /** Discriminant for the type of pattern matching to use. */
    patternType: 'regex' | 'glob' | 'ignore-rules-file-path' | 'path';
    /** Pattern string for matching files or path to ignore rules file. */
    pattern: string | string[];
}