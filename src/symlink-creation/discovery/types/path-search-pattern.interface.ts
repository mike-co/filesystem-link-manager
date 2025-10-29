import type { PathMappingEntry, SearchPatternBase } from '../../config';

/**
 * Path pattern for direct file and directory path matching.
 * Uses exact path matching for precise file selection without wildcards while
 * supporting optional source-to-destination mappings for copy and hardlink operations.
 */
export interface PathSearchPattern extends SearchPatternBase {
    /**
     * Type discriminant for path pattern matching.
     * Always 'path' for this pattern type to enable discriminated union behavior.
     */
    patternType: 'path';
    
    /**
     * Pattern definitions used when matching explicit file or directory paths.
     *
    * - Provide `string` values or arrays mixing `string` and {@link PathMappingEntry} entries for backward
    *   compatibility with explicit paths while supporting destination overrides.
    * - Provide {@link PathMappingEntry} objects when the associated operation performs a copy or hardlink action
    *   and requires destination overrides. These entries can be mixed with plain path strings in a single array.
     *
     * @example
     * const pattern: PathSearchPattern = {
     *     patternType: 'path',
     *     pattern: 'docs/readme.md',
     * };
     * 
     * @example
     * const pattern: PathSearchPattern = {
     *     patternType: 'path',
     *     pattern: ['src/main.ts', 'docs/readme.md'],
     * };
     *
     * @example
     * const copyPattern: PathSearchPattern = {
     *     patternType: 'path',
     *     pattern: {
     *         sourcePath: 'docs/readme.md',
     *         destinationPath: 'newdocs/readme-new.md',
     *     },
     * };
     *
     * @example
     * const hardlinkPattern: PathSearchPattern = {
     *     patternType: 'path',
     *     pattern: [
     *         {
     *             sourcePath: 'src/assets/logo.png',
     *             destinationPath: 'dist/assets/logo.png',
     *         },
     *         {
     *             sourcePath: 'src/assets/icon.png',
     *             destinationPath: 'dist/assets/icon.png',
     *         },
     *         'src/assets/readme.txt',
     *     ],
     * };
     */
    pattern: string | PathMappingEntry | Array<string | PathMappingEntry>;
}