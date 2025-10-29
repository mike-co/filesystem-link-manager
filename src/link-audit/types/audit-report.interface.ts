import { LinkAuditItem } from './link-audit-item.interface';

/**
 * Represents the persisted link audit report written to disk for a collection.
 * Captures generation metadata, workspace context, and the normalized audit items.
 */
export interface LinkAuditReport {
    /** ISO-8601 timestamp describing when the report was generated. */
    generatedAt: string;

    /** Absolute path to the workspace root used as the discovery base. */
    workspaceRoot: string;

    /** Total number of audit items included in the report. */
    itemCount: number;

    /** Ordered, deduplicated list of audit items describing link metadata. */
    items: LinkAuditItem[];
}
