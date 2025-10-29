import type { LinkAuditReport } from './audit-report.interface';

/**
 * Represents the result of executing a single link audit collection.
 * Contains the generated report and the absolute output path persisted to disk.
 */
export interface LinkAuditExecutionResult {
    /** JSON report generated for the collection including normalized audit items. */
    report: LinkAuditReport;
    /** Absolute path to the persisted JSON report file. */
    outputPath: string;
}
