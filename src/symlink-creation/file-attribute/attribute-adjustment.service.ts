import { injectable } from 'tsyringe';
import { LoggerService } from '../../logging';
import { FileAttributeAdjustmentEntry } from './types/file-attribute-adjustment-entry.interface';
import { processFileAttributeAdjustments } from './attribute-adjustment/process-file-attribute-adjustments.function';


/**
 * Service class for symlink and directory link management operations.
 * Orchestrates calls to pure functions for symlink operations.
 * 
 * Follows the thin class pattern where the service acts as an orchestrator
 * and delegates complex logic to pure functions in the service-specific folder.
 */
@injectable()
export class AttributeAdjustmentService {
    private readonly logger: LoggerService;

    /**
     * Constructs a new AttributeAdjustmentService with injected logger.
     * 
     * @param loggerService - LoggerService instance injected via DI container
     */
    public constructor(loggerService: LoggerService) {
        this.logger = loggerService;
    }

    /**
     * Process file attribute adjustments for multiple symlink entries.
     * Handles readonly attribute changes with backup file creation and user confirmation.
     * 
     * @param entries - Array of file attribute adjustment entries to process
     * @returns Promise resolving when all attribute adjustments are completed
     * @throws DomainError when file attribute operations fail
     */
    public async processFileAttributeAdjustments(
        entries: FileAttributeAdjustmentEntry[]
    ): Promise<void> {
        this.logger.debug(`Processing file attribute adjustments for ${entries.length} entries`, {
            operation: 'processFileAttributeAdjustments',
            processedCount: entries.length,
        });

        await processFileAttributeAdjustments(entries, this.logger);

        this.logger.info(`File attribute adjustments completed successfully for ${entries.length} entries`, {
            operation: 'processFileAttributeAdjustments',
            processedCount: entries.length,
        });
    }
}