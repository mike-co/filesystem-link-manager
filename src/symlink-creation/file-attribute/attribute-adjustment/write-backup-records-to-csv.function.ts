import { ensureDir, writeFile } from 'fs-extra';
import { dirname } from 'path';
import { DomainError } from '../../../common';
import { FileAttributeBackupRecord } from '../types/file-attribute-backup-record.interface';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

/**
 * Writes file attribute backup records to a CSV file for undo/rollback purposes.
 * Creates the parent directory structure if it doesn't exist.
 * Formats the backup records as CSV with proper escaping and headers.
 * Used to track file attribute changes so they can be reversed if needed.
 * 
 * @param backupFilePath - Absolute path where the CSV backup file will be created
 * @param records - Array of backup records containing original and new file attribute states
 * @returns Promise that resolves when the CSV file has been successfully written
 * @throws DomainError with FILE_ATTRIBUTE_MODIFICATION_FAILED when CSV backup file creation fails due to filesystem issues
 */
export async function writeBackupRecordsToCsv(
    backupFilePath: string, 
    records: FileAttributeBackupRecord[]
): Promise<void> {
    try {
        // Ensure parent directory exists
        const parentDir = dirname(backupFilePath);
        await ensureDir(parentDir);
        
        // Create CSV header
        const csvHeader = 'sourcePath,symlinkPath,action,originalReadonly,newReadonly\n';
        
        // Convert records to CSV rows
        const csvRows = records.map(record => 
            `"${record.sourcePath}","${record.fileLinkPath}","${record.action}","${record.originalReadonly}","${record.newReadonly}"`
        ).join('\n');
        
        // Write CSV content
        const csvContent = csvHeader + csvRows;
        await writeFile(backupFilePath, csvContent, 'utf-8');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error writing backup CSV';
        const domainError = new DomainError(FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_MODIFICATION_FAILED, {cause: error});
        domainError.message = `Failed to write backup file ${backupFilePath}: ${errorMessage}`;
        throw domainError;
    }
}