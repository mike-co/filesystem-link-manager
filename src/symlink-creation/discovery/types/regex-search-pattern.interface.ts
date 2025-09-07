import type { SearchPatternBase } from '../../config';

/**
 * Regular expression pattern for advanced file matching.
 * Uses JavaScript regex syntax for complex pattern matching scenarios.
 */
export interface RegexSearchPattern extends SearchPatternBase {
    /**
     * Type discriminant for regex pattern matching.
     * Always 'regex' for this pattern type to enable discriminated union behavior.
     */
    patternType: 'regex';
    
    /**
     * JavaScript regular expression pattern string for file matching.
     * Examples: '^.*\\.test\\.(ts|js)$', '.*\\.component\\.(ts|tsx)$', '^(?!.*node_modules).*\\.ts$'
     * Supports full JavaScript regex syntax including anchors, groups, lookaheads, etc.
     */
    pattern: string;
}