import { PathMappingEntry } from './path-mapping-entry.interface';

/**
 * Base interface for all search pattern types.
 * 
 * Provides the foundation discriminated union interface for pattern matching
 * with support for regex, glob, ignore rules files, and explicit path mappings.
 */
export interface SearchPatternBase {
    /** Discriminant for the type of pattern matching to use. */
    patternType: 'regex' | 'glob' | 'ignore-rules-file-path' | 'path';
    /**
     * Pattern definition used by the discovery pipeline.
     *
    * - For `regex`, `glob`, and `ignore-rules-file-path` pattern types, provide a string or array of strings.
    * - For `path` pattern types, you may provide string paths, {@link PathMappingEntry} objects, or any
    *   combination of the two inside an array to support mixed explicit paths and source-to-destination mappings
    *   for copy and hardlink operations.
     *
     * @remarks
     * Path mapping entries are only valid when `patternType` is `'path'` and the associated file system
     * operation performs either a copy or hardlink action. Symlink and directory operations must continue
     * to use string or string array path patterns for backward compatibility.
     */
    pattern: string | PathMappingEntry | Array<string | PathMappingEntry>;
}