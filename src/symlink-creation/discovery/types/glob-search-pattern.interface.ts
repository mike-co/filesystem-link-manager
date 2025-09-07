import type { SearchPatternBase } from '../../config';

/**
 * Glob pattern for file matching using filesystem globbing syntax.
 * Uses glob syntax for intuitive file selection with wildcards and path matching.
 */
export interface GlobSearchPattern extends SearchPatternBase {
    /**
     * Type discriminant for glob pattern matching.
     * Always 'glob' for this pattern type to enable discriminated union behavior.
     */
    patternType: 'glob';
    
   /**
     * Glob pattern string for file matching.
     * Supports wildcards: <code>*</code> (any chars), <code>**</code> (any dirs), <code>?</code> (single char),
     * and character classes like <code>[a-z]</code> or <code>[...]</code>.
     */
    pattern: string;
}