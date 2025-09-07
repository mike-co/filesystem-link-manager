/**
 * Path pattern for direct file and directory path matching.
 * Uses exact path matching for precise file selection without wildcards.
 * Provides the most efficient matching for known specific paths.
 */
import type { SearchPatternBase } from '../../config';

/**
 * Path pattern for direct file and directory path matching.
 * Uses exact path strings for precise file and directory selection.
 */
export interface PathSearchPattern extends SearchPatternBase {
    /**
     * Type discriminant for path pattern matching.
     * Always 'path' for this pattern type to enable discriminated union behavior.
     */
    patternType: 'path';
    
    /**
     * Array of exact file or directory paths to match.
     * Each path is matched exactly without wildcards or pattern expansion.
     * Examples: ['src/main.ts', 'docs/readme.md'], ['lib/', 'tests/']
     * Paths can be relative (to base directory) or absolute.
     */
    pattern: string[];
}