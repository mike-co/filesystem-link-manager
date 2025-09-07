/**
 * Result of parsing gitignore-style ignore rules content.
 * Contains separated ignore patterns and negation patterns from parsed rules file.
 * Provides structured access to different types of ignore rule patterns.
 */
export interface ParsedIgnoreRules {
    /**
     * Array of patterns that exclude files and directories.
     * Standard gitignore patterns that specify what to ignore.
     * Examples: 'node_modules/', '*.log', 'build/', '.env'
     */
    ignorePatterns: string[];
    
    /**
     * Array of negation patterns that re-include previously excluded items.
     * Patterns prefixed with '!' that override ignore patterns.
     * Examples: '!important.log', '!src/generated/types.d.ts'
     */
    negationPatterns: string[];
}