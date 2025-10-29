import type { PathMappingEntry } from '../types/file-system-operation/path-mapping-entry.interface';

/**
 * Determines whether the provided value is a {@link PathMappingEntry}.
 * Used to guard runtime configuration parsing and discovery normalization logic
 * whenever path mapping objects are accepted alongside string-based patterns.
 *
 * @param value Unknown value to check
 * @returns True when the value contains string `sourcePath` and `destinationPath` properties
 * 
 */
export function isPathMappingEntry(value: unknown): value is PathMappingEntry {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const candidate = value as Partial<PathMappingEntry>;

    return typeof candidate.sourcePath === 'string' && typeof candidate.destinationPath === 'string';
}
