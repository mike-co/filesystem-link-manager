import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import { writeBackupRecordsToCsv } from './write-backup-records-to-csv.function';
import { FileAttributeBackupRecord } from '../types/file-attribute-backup-record.interface';
import { DomainError } from '../../../common';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

describe('write-backup-records-to-csv.function', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with mock-fs
        mockFs({
            [tmpRoot]: {
                'existing-dir': {},
                nested: {
                    'sub-dir': {},
                },
            },
            // Preserve node_modules for Jest functionality
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    afterAll(() => {
        mockFs.restore();
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof writeBackupRecordsToCsv).toBe('function');
        });
    });

    describe('CSV writing functionality', () => {
        test('should create CSV file with backup records', async () => {
            // Arrange
            const backupFile = path.join(tmpRoot, 'existing-dir', 'backup.csv');
            const records: FileAttributeBackupRecord[] = [
                {
                    sourcePath: '/path/to/source1.txt',
                    fileLinkPath: '/path/to/link1.txt',
                    originalReadonly: false,
                    newReadonly: true,
                    action: 'symlink',
                },
                {
                    sourcePath: '/path/to/source2.txt',
                    fileLinkPath: '/path/to/link2.txt',
                    originalReadonly: true,
                    newReadonly: false,
                    action: 'copy',
                },
            ];

            // Act
            await writeBackupRecordsToCsv(backupFile, records);

            // Assert
            expect(await fs.pathExists(backupFile)).toBe(true);
            const content = await fs.readFile(backupFile, 'utf-8');
            expect(content).toContain('sourcePath,symlinkPath,action,originalReadonly,newReadonly');
            expect(content).toContain(
                '"/path/to/source1.txt","/path/to/link1.txt","symlink","false","true"'
            );
            expect(content).toContain(
                '"/path/to/source2.txt","/path/to/link2.txt","copy","true","false"'
            );
        });

        test('should create parent directories if they do not exist', async () => {
            // Arrange
            const backupFile = path.join(tmpRoot, 'non-existent', 'deep', 'backup.csv');
            const records: FileAttributeBackupRecord[] = [
                {
                    sourcePath: '/path/to/source.txt',
                    fileLinkPath: '/path/to/link.txt',
                    originalReadonly: false,
                    newReadonly: true,
                    action: 'symlink',
                },
            ];

            // Act
            await writeBackupRecordsToCsv(backupFile, records);

            // Assert
            expect(await fs.pathExists(backupFile)).toBe(true);
            expect(await fs.pathExists(path.dirname(backupFile))).toBe(true);
        });

        test('should handle empty records array', async () => {
            // Arrange
            const backupFile = path.join(tmpRoot, 'existing-dir', 'empty-backup.csv');
            const records: FileAttributeBackupRecord[] = [];

            // Act
            await writeBackupRecordsToCsv(backupFile, records);

            // Assert
            expect(await fs.pathExists(backupFile)).toBe(true);
            const content = await fs.readFile(backupFile, 'utf-8');
            expect(content).toBe('sourcePath,symlinkPath,action,originalReadonly,newReadonly\n');
        });

        test('should properly escape CSV content with special characters', async () => {
            // Arrange
            const backupFile = path.join(tmpRoot, 'existing-dir', 'special-chars.csv');
            const records: FileAttributeBackupRecord[] = [
                {
                    sourcePath: '/path/with,comma.txt',
                    fileLinkPath: '/path/with"quote.txt',
                    originalReadonly: false,
                    newReadonly: true,
                    action: 'symlink',
                },
            ];

            // Act
            await writeBackupRecordsToCsv(backupFile, records);

            // Assert
            const content = await fs.readFile(backupFile, 'utf-8');
            expect(content).toContain('"/path/with,comma.txt"');
            expect(content).toContain('"/path/with"quote.txt"');
        });
    });

    describe('Error handling scenarios', () => {
        test('should throw DomainError when directory creation fails', async () => {
            // Arrange - try to write to a path that would fail
            const invalidPath = path.join(tmpRoot, 'invalid\x00path', 'backup.csv');
            const records: FileAttributeBackupRecord[] = [
                {
                    sourcePath: '/path/to/source.txt',
                    fileLinkPath: '/path/to/link.txt',
                    originalReadonly: false,
                    newReadonly: true,
                    action: 'symlink',
                },
            ];

            // Act & Assert
            await expect(writeBackupRecordsToCsv(invalidPath, records)).rejects.toThrow(
                DomainError
            );
        });

        test('should throw DomainError with FILE_ATTRIBUTE_MODIFICATION_FAILED when write fails', async () => {
            // Arrange - try to write to a path that would fail
            const invalidPath = path.join(tmpRoot, 'invalid\x00path', 'backup.csv');
            const records: FileAttributeBackupRecord[] = [
                {
                    sourcePath: '/path/to/source.txt',
                    fileLinkPath: '/path/to/link.txt',
                    originalReadonly: false,
                    newReadonly: true,
                    action: 'symlink',
                },
            ];

            // Act & Assert
            await expect(writeBackupRecordsToCsv(invalidPath, records)).rejects.toThrow(
                expect.objectContaining({
                    domainErrorInfo:
                        FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_MODIFICATION_FAILED,
                })
            );
        });

        test('should include backup file path in error message when write fails', async () => {
            // Arrange
            const invalidPath = path.join(tmpRoot, 'invalid\x00path', 'backup.csv');
            const records: FileAttributeBackupRecord[] = [
                {
                    sourcePath: '/path/to/source.txt',
                    fileLinkPath: '/path/to/link.txt',
                    originalReadonly: false,
                    newReadonly: true,
                    action: 'symlink',
                },
            ];

            // Act & Assert
            await expect(writeBackupRecordsToCsv(invalidPath, records)).rejects.toThrow(
                expect.objectContaining({
                    message: expect.stringContaining(invalidPath),
                })
            );
        });
    });
});
