import { pathExists } from 'fs-extra';
import { isAbsolute, resolve } from 'path';
import { DomainError } from '../../../common';
import { LoggerService, LogContext } from '../../../logging';
import { discoverAllFiles } from '../../discovery';
import { FileAttributeAdjustmentEntry } from '../types/file-attribute-adjustment-entry.interface';
import { FileAttributeBackupRecord } from '../types/file-attribute-backup-record.interface';

import { isFileReadonly } from './is-file-readonly.function';
import { setFileReadonly } from './set-file-readonly.function';
import { writeBackupRecordsToCsv } from './write-backup-records-to-csv.function';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

/**
 * Processes file attribute adjustments with comprehensive backup and user confirmation workflow.
 * This is the main orchestration function for handling readonly attribute changes across multiple files.
 * 
 * Workflow:
 * 1. Filters entries that require attribute adjustments
 * 2. Groups entries by backup file path for efficient processing
 * 3. Collects all required changes across all groups
 * 4. Requests user confirmation for backup file overwrites when needed
 * 5. Applies changes per group with backup file creation
 * 
 * The function supports two processing modes:
 * - Default group (no backup path): applies changes without creating backup files
 * - Backup groups (with backup path): creates CSV backup files and applies changes
 * 
 * @param entries - Array of file attribute adjustment entries to process
 * @param logger - Logger service for debug logging throughout the workflow
 * @returns Promise that resolves when all attribute adjustments are completed successfully
 * @throws DomainError with FILE_ATTRIBUTE_MODIFICATION_FAILED when attribute adjustment operations fail or user rejects changes
 */
export async function processFileAttributeAdjustments(
    entries: FileAttributeAdjustmentEntry[],
    logger: LoggerService
): Promise<void> {
    const logContext: LogContext = {
        operation: 'processFileAttributeAdjustments',
        processedCount: entries.length
    };

    logger.debug('Starting file attribute adjustments processing', logContext);
    
    // Filter entries that have file attribute adjustments
    const fileAttributeAdjustmentEntries = entries.filter(entry => 
        entry.fileAttributeAdjustment && 
        entry.fileAttributeAdjustment.readonly !== 'preserve'
    );
    
    if (fileAttributeAdjustmentEntries.length === 0) {
        logger.debug('No attribute adjustments needed, returning early', logContext);
        return; // No adjustments needed
    }
    const entriesToProcess: FileAttributeAdjustmentEntry[] = [];

    for(const entry of  fileAttributeAdjustmentEntries) {
        // for copy operations, attribute addjustment applies only to copied file and not to original one
        if(entry.action === 'copy') {
            const updatedEntry: FileAttributeAdjustmentEntry = {...entry, sourcePath: entry.destinationPath}
            entriesToProcess.push(updatedEntry);
        } else {
            entriesToProcess.push(entry);
        }
    }

    // Group entries by backup file path (null for default group)
    const groupedEntries = new Map<string | null, FileAttributeAdjustmentEntry[]>();
    
    for (const entry of entriesToProcess) {
        const backupPath = entry.fileAttributeAdjustment?.backupFilePath
            ? (isAbsolute(entry.fileAttributeAdjustment.backupFilePath)
                ? entry.fileAttributeAdjustment.backupFilePath
                : resolve(entry.targetDirectoryPath, entry.fileAttributeAdjustment.backupFilePath))
            : null;

        if (!groupedEntries.has(backupPath)) {
            groupedEntries.set(backupPath, []);
        }
        const existingGroup = groupedEntries.get(backupPath);
        if (existingGroup) {
            existingGroup.push(entry);
        }
    }
    
    logger.debug('Grouped entries by backup path', {
        ...logContext,
        totalGroups: groupedEntries.size,
        entriesToProcess: entriesToProcess.length
    });
    
    // Collect all changes for all groups
    const groupChanges = new Map<string | null, FileAttributeBackupRecord[]>();
    const backupPathsToCreate: string[] = [];
    
    for (const [backupPath, groupEntries] of groupedEntries) {
        const backupRecords = await collectChangesForGroup(groupEntries, logger);
        
        if (backupRecords.length > 0) {
            groupChanges.set(backupPath, backupRecords);
            
            // Only add to backup paths if it's not the default group (null)
            if (backupPath !== null) {
                backupPathsToCreate.push(backupPath);
            }
        }
    }
    
    const totalChanges = Array.from(groupChanges.values()).reduce((sum, records) => sum + records.length, 0);
    logger.debug('Collected all changes', {
        ...logContext,
        totalChanges,
        backupPathsToCreate: backupPathsToCreate.length
    });
    
    // If no changes needed, return early
    if (groupChanges.size === 0) {
        logger.debug('No changes needed, returning early', logContext);
        return;
    }
    
    // Get user confirmation for backup files if any backup files will be created
    if (backupPathsToCreate.length > 0) {
        // Check which backup paths actually exist
        const existingBackupPaths: string[] = [];
        
        for (const backupPath of backupPathsToCreate) {
            if (await pathExists(backupPath)) {
                existingBackupPaths.push(backupPath);
            }
        }
        
        // Only prompt user if there are existing backup files that would be overwritten
        if (existingBackupPaths.length > 0) {
            logger.debug('Requesting user confirmation for backup overwrites', {
                ...logContext,
                existingBackupPaths
            });
            
            const userDecision = await getUserConfirmationForBackups(entriesToProcess, existingBackupPaths);
            
            if (userDecision === 'skip') {
                logger.debug('User declined changes, skipping all modifications', logContext);
                return; // User declined, skip all changes
            }
            if (userDecision === 'error') {
                logger.debug('User rejected changes, throwing error', logContext);
                const domainError = new DomainError(FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_MODIFICATION_FAILED);
                domainError.message = 'User rejected file attribute changes';
                throw domainError;
            }
        }
    }
    
    // Apply changes for each group
    for (const [backupPath, backupRecords] of groupChanges) {
        await applyChangesForGroup(backupPath, backupRecords, logger);
    }
    
    logger.debug('Successfully completed all file attribute adjustments', {
        ...logContext,
        totalChanges,
        totalGroups: groupChanges.size
    });
}

/**
 * Collects all file attribute changes needed for a group of entries.
 * Processes each entry to discover all files requiring attribute changes
 * and creates backup records for files that need modifications.
 * 
 * @param entries - Array of file attribute adjustment entries in the same backup group
 * @param logger - Logger service for debug logging
 * @returns Promise resolving to array of backup records for files that need changes
 */
async function collectChangesForGroup(
    entries: FileAttributeAdjustmentEntry[], 
    logger: LoggerService
): Promise<FileAttributeBackupRecord[]> {
    const backupRecords: FileAttributeBackupRecord[] = [];
    
    // Collect all file paths that need processing
    for (const entry of entries) {
        const filePaths = await getFilePathsForEntry(entry, logger);
        
        for (const filePath of filePaths) {
            const record = await createBackupRecordIfChanged(entry, filePath);
            if (record) {
                backupRecords.push(record);
            }
        }
    }
    
    return backupRecords;
}

/**
 * Gets user confirmation for creating or overwriting backup files.
 * Uses the handleOverwriteBehaviorFunc callback from the first entry if available.
 * Maps the result to appropriate proceed/skip/error actions for the workflow.
 * 
 * @param entries - Array of file attribute adjustment entries (used to find callback function)
 * @param backupPaths - Array of backup file paths that would be overwritten
 * @returns Promise resolving to user decision: 'proceed' to continue, 'skip' to abort gracefully, 'error' to throw
 */
async function getUserConfirmationForBackups(
    entries: FileAttributeAdjustmentEntry[], 
    backupPaths: string[]
): Promise<'proceed' | 'skip' | 'error'> {
    // Use the first entry's callback if available
    if (entries.length > 0) {
        const firstEntry = entries[0];
        if (firstEntry && firstEntry.handleOverwriteBehaviorFunc) {
            const result = await firstEntry.handleOverwriteBehaviorFunc(backupPaths);
            
            // Map overwrite to proceed since we want to continue with backup creation
            if (result === 'overwrite') {
                return 'proceed';
            }
            return result;
        }
    }
    
    // Default to proceed if no callback provided
    return 'proceed';
}

/**
 * Applies file attribute changes for a single backup group.
 * Creates the backup CSV file if a backup path is specified,
 * then applies the readonly attribute changes to all files in the group.
 * 
 * @param backupPath - Path where backup CSV file should be created, or null for no backup
 * @param backupRecords - Array of backup records containing the changes to apply
 * @param logger - Logger service for debug logging
 * @returns Promise that resolves when all changes are applied successfully
 */
async function applyChangesForGroup(
    backupPath: string | null, 
    backupRecords: FileAttributeBackupRecord[],
    logger: LoggerService
): Promise<void> {
    // Create backup file only if backupPath is specified (not null/default group)
    if (backupPath !== null) {
        logger.debug('Creating backup CSV file', {
            operation: 'applyChangesForGroup',
            backupPath,
            recordCount: backupRecords.length
        });
        await writeBackupRecordsToCsv(backupPath, backupRecords);
    }
    
    // Apply attribute changes
    for (const record of backupRecords) {
        await setFileReadonly(record.sourcePath, record.newReadonly);
    }
}

/**
 * Gets all file paths that need processing for a file attribute adjustment entry.
 * For file entries, returns the single source path.
 * For directory entries, discovers all files recursively within the directory.
 * 
 * @param entry - File attribute adjustment entry to process
 * @param logger - Logger service for debug logging
 * @returns Promise resolving to array of absolute file paths that need attribute processing
 */
async function getFilePathsForEntry(
    entry: FileAttributeAdjustmentEntry, 
    logger: LoggerService
): Promise<string[]> {
    if (entry.itemType === 'file') {
        return [entry.sourcePath];
    } else {
        const discoveredFiles = await discoverAllFiles(entry.sourcePath);
        logger.debug('Discovered files in directory', {
            operation: 'getFilePathsForEntry',
            filePath: entry.sourcePath,
            discoveredCount: discoveredFiles.length
        });
        return discoveredFiles;
    }
}

/**
 * Creates a backup record if the file's readonly attribute needs to be changed.
 * Compares the current readonly state with the target state from the adjustment configuration.
 * Only creates a record if an actual change is needed to avoid unnecessary operations.
 * 
 * @param entry - File attribute adjustment entry containing the target readonly configuration
 * @param filePath - Absolute path to the file to check and potentially modify
 * @returns Promise resolving to backup record if change needed, null if no change required
 */
async function createBackupRecordIfChanged(
    entry: FileAttributeAdjustmentEntry, 
    filePath: string
): Promise<FileAttributeBackupRecord | null> {
    if (!entry.fileAttributeAdjustment) {
        return null;
    }
    
    const currentReadonly = await isFileReadonly(filePath);
    const targetReadonly = entry.fileAttributeAdjustment.readonly === 'set';
    
    // Only create record if change is needed
    if (currentReadonly !== targetReadonly) {
        return {
            sourcePath: filePath,
            fileLinkPath: entry.destinationPath,
            originalReadonly: currentReadonly,
            newReadonly: targetReadonly,
            action: entry.action
        };
    }
    
    return null;
}