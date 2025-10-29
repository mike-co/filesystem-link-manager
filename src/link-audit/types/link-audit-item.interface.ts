/**
 * Represents a normalized audit item emitted by the link classification pipeline.
 * Encapsulates the original filesystem path, resolved target path, and detected link type.
 */
export interface LinkAuditItem {
    /** Absolute path to the discovered filesystem entry. */
    path: string;
    /** Resolved target path for symlinks and hardlinks, or the original path for standard files. */
    targetPath: string;
    /** Classified link type for the item, distinguishing between link variants and standard files. */
    linkType: 'symlink' | 'junction' | 'hardlink' | 'none';
}
