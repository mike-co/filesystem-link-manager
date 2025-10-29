import { ensureDir, writeJson } from 'fs-extra';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
import { injectable } from 'tsyringe';
import { DomainError } from '../common';
import { LoggerService } from '../logging';
import { FileDiscoveryService, FileDiscoveryOptions } from '../symlink-creation/discovery';
import { LINK_AUDIT_DOMAIN_ERRORS } from './link-audit-domain-errors.const';

import { LinkAuditCollection } from './types/audit-collection.interface';
import { LinkAuditExecutionResult } from './types/link-audit-execution-result.interface';
import { LinkAuditItem } from './types/link-audit-item.interface';
import { LinkAuditReport } from './types/audit-report.interface';
import { classifyLinkType } from './audit/classify-link-type.function';
import { buildAuditItems } from './audit/build-audit-items.function';


const WINDOWS_LONG_PATH_PREFIX_PATTERN = /^\\\\\?\\/u;
const IS_WINDOWS = process.platform === 'win32';
const FOLLOW_SYMLINK_OPTIONS: FileDiscoveryOptions = { followSymbolicLinks: true };

/**
 * Orchestrates the link audit workflow by coordinating discovery, classification, and report persistence.
 */
@injectable()
export class LinkAuditService {
    /**
     * Constructs a new LinkAuditService with injected dependencies.
     *
     * @param loggerService LoggerService instance injected via DI container for structured logging
     * @param fileDiscoveryService File discovery orchestrator used to enumerate collection matches
     */
    public constructor(
        private readonly loggerService: LoggerService,
        private readonly fileDiscoveryService: FileDiscoveryService
    ) {}

    /**
     * Executes the link audit workflow for the provided collections from the specified workspace root.
     * Processes collections sequentially, writes JSON reports, and returns in-memory summaries.
     *
     * @param options.workspaceRoot Absolute path to the workspace root serving as discovery base.
     * @param options.collections Validated link audit collections to execute in sequence.
     * @returns Promise resolving to the generated link audit reports in execution order.
     */
    public async execute(options: {
        workspaceRoot: string;
        collections: LinkAuditCollection[];
    }): Promise<LinkAuditExecutionResult[]> {
        const normalizedWorkspaceRoot = normalizeAbsolutePath(options.workspaceRoot);
        const executionResults: LinkAuditExecutionResult[] = [];

        if (options.collections.length === 0) {
            this.loggerService.info('Link audit execution skipped: no collections provided.', {
                operation: 'linkAuditExecution',
                workspaceRoot: normalizedWorkspaceRoot,
                collectionCount: 0,
            });

            return executionResults;
        }

        this.loggerService.info('Starting link audit execution.', {
            operation: 'linkAuditExecution',
            workspaceRoot: normalizedWorkspaceRoot,
            collectionCount: options.collections.length,
        });

        for (const [collectionIndex, collection] of options.collections.entries()) {
            this.loggerService.info('Processing link audit collection.', {
                operation: 'linkAuditCollectionStart',
                collectionIndex,
                outputRelativePath: collection.outputRelativePath,
                patternCount: collection.searchPatterns.length,
            });

            const discoveredPaths = await this.discoverCollectionPaths(
                normalizedWorkspaceRoot,
                collection
            );

            const classifiedItems: LinkAuditItem[] = [];
            for (const discoveredPath of discoveredPaths) {
                try {
                    const classification = await classifyLinkType(discoveredPath);
                    classifiedItems.push({
                        path: normalizeAbsolutePath(discoveredPath),
                        targetPath: classification.targetPath,
                        linkType: classification.linkType,
                    });
                } catch (error) {
                    this.loggerService.error('Link classification failed for discovered path.', {
                        operation: 'linkAuditClassification',
                        collectionIndex,
                        path: discoveredPath,
                    });

                    if (error instanceof DomainError) {
                        throw error;
                    }

                    throw new DomainError(LINK_AUDIT_DOMAIN_ERRORS.CLASSIFICATION_FAILURE, {
                        cause: error,
                    });
                }
            }

            const auditItems = buildAuditItems(classifiedItems);
            const report: LinkAuditReport = {
                generatedAt: new Date().toISOString(),
                workspaceRoot: normalizedWorkspaceRoot,
                itemCount: auditItems.length,
                items: auditItems,
            };

            const reportOutputPath = this.resolveReportOutputPath(
                normalizedWorkspaceRoot,
                collection.outputRelativePath
            );

            await this.persistReport(reportOutputPath, report, collectionIndex);

            this.loggerService.info('Completed link audit collection.', {
                operation: 'linkAuditCollectionComplete',
                collectionIndex,
                outputPath: reportOutputPath,
                itemCount: report.itemCount,
            });

            executionResults.push({
                report,
                outputPath: reportOutputPath,
            });
        }

        this.loggerService.info('Link audit execution completed.', {
            operation: 'linkAuditExecutionComplete',
            workspaceRoot: normalizedWorkspaceRoot,
            collectionCount: options.collections.length,
        });

        return executionResults;
    }

    private async discoverCollectionPaths(
        workspaceRoot: string,
        collection: LinkAuditCollection
    ): Promise<string[]> {
        try {
            const discovered = await this.fileDiscoveryService.discoverFiles(
                workspaceRoot,
                collection.searchPatterns,
                FOLLOW_SYMLINK_OPTIONS
            );

            this.loggerService.debug('Link audit collection discovery completed.', {
                operation: 'linkAuditCollectionDiscovery',
                workspaceRoot,
                outputRelativePath: collection.outputRelativePath,
                discoveredCount: discovered.length,
            });

            return discovered;
        } catch (error) {
            this.loggerService.error('Failed to discover filesystem entries for link audit collection.', {
                operation: 'linkAuditCollectionDiscovery',
                workspaceRoot,
                outputRelativePath: collection.outputRelativePath,
            });

            throw new DomainError(LINK_AUDIT_DOMAIN_ERRORS.DISCOVERY_FAILURE, {
                cause: error,
            });
        }
    }

    private resolveReportOutputPath(workspaceRoot: string, outputRelativePath: string): string {
        const resolvedOutput = normalizeAbsolutePath(resolve(workspaceRoot, outputRelativePath));

        if (!isPathWithinRoot(resolvedOutput, workspaceRoot)) {
            this.loggerService.error('Link audit report output path is outside of workspace root.', {
                operation: 'linkAuditReportPathValidation',
                outputRelativePath,
                workspaceRoot,
                resolvedOutput,
            });

            throw new DomainError(LINK_AUDIT_DOMAIN_ERRORS.REPORT_WRITE_FAILURE, {
                cause: new Error('Report output path must reside within workspace root'),
            });
        }

        return resolvedOutput;
    }

    private async persistReport(
        outputPath: string,
        report: LinkAuditReport,
        collectionIndex: number
    ): Promise<void> {
        try {
            await ensureDir(dirname(outputPath));
            await writeJson(outputPath, report, { spaces: 2 });
        } catch (error) {
            this.loggerService.error('Failed to persist link audit report to disk.', {
                operation: 'linkAuditReportPersistence',
                collectionIndex,
                outputPath,
            });

            throw new DomainError(LINK_AUDIT_DOMAIN_ERRORS.REPORT_WRITE_FAILURE, {
                cause: error,
            });
        }
    }
}

function normalizeAbsolutePath(pathValue: string): string {
    const absolutePath = isAbsolute(pathValue) ? pathValue : resolve(pathValue);

    return normalize(absolutePath).replace(WINDOWS_LONG_PATH_PREFIX_PATTERN, '');
}

function isPathWithinRoot(candidatePath: string, workspaceRoot: string): boolean {
    if (candidatePath === workspaceRoot) {
        return true;
    }

    const normalizedCandidate = IS_WINDOWS
        ? candidatePath.toLowerCase()
        : candidatePath;
    const normalizedRoot = IS_WINDOWS ? workspaceRoot.toLowerCase() : workspaceRoot;
    const rootWithSeparator = normalizedRoot.endsWith(sep)
        ? normalizedRoot
        : `${normalizedRoot}${sep}`;

    return normalizedCandidate.startsWith(rootWithSeparator);
}
