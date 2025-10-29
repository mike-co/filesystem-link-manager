/**
 * Represents a single collection entry in the link audit configuration.
 * Each collection defines the search patterns used for discovery and the target report output location.
 */
export interface LinkAuditCollection {
    /**
     * Search patterns that drive discovery for this collection.
     * Supports only glob and regex pattern types with string pattern values.
     */
    searchPatterns: LinkAuditCollectionSearchPattern[];

    /**
     * Relative path from the workspace root where the audit report JSON will be written.
     * The command will create parent directories when required.
     */
    outputRelativePath: string;
}

/**
 * Internal type describing the supported pattern structures for link audit collections.
 * Limited to glob and regex discriminant values with string patterns for backward compatibility.
 */
interface LinkAuditCollectionSearchPattern {
    patternType: 'glob' | 'regex';
    pattern: string;
}
