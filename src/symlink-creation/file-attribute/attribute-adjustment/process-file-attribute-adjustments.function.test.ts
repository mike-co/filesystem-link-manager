import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import { DomainError } from '../../../common';
import { processFileAttributeAdjustments } from './process-file-attribute-adjustments.function';
import { FileAttributeAdjustmentEntry } from '../types/file-attribute-adjustment-entry.interface';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

jest.mock('../../discovery', () => ({
    discoverAllFiles: jest.fn(),
}));

jest.mock('./is-file-readonly.function');
jest.mock('./set-file-readonly.function');
jest.mock('./write-backup-records-to-csv.function');

import { discoverAllFiles } from '../../discovery';
import { isFileReadonly } from './is-file-readonly.function';
import { setFileReadonly } from './set-file-readonly.function';
import { writeBackupRecordsToCsv } from './write-backup-records-to-csv.function';

describe('process-file-attribute-adjustments.function', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());

    let mockDiscoverAllFiles: jest.MockedFunction<typeof discoverAllFiles>;
    let mockIsFileReadonly: jest.MockedFunction<typeof isFileReadonly>;
    let mockSetFileReadonly: jest.MockedFunction<typeof setFileReadonly>;
    let mockWriteBackupRecordsToCsv: jest.MockedFunction<typeof writeBackupRecordsToCsv>;

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        mockFs({
            [tmpRoot]: {
                source: {
                    'file1.txt': 'source content 1',
                    'file2.txt': 'source content 2',
                    subdir: {
                        'file3.txt': 'source content 3',
                    },
                },
                target: {},
                backup: {},
            },
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockDiscoverAllFiles = discoverAllFiles as jest.MockedFunction<typeof discoverAllFiles>;
        mockIsFileReadonly = isFileReadonly as jest.MockedFunction<typeof isFileReadonly>;
        mockSetFileReadonly = setFileReadonly as jest.MockedFunction<typeof setFileReadonly>;
        mockWriteBackupRecordsToCsv = writeBackupRecordsToCsv as jest.MockedFunction<
            typeof writeBackupRecordsToCsv
        >;

        // Default mocks
        mockDiscoverAllFiles.mockResolvedValue([]);
        mockIsFileReadonly.mockResolvedValue(false);
        mockSetFileReadonly.mockResolvedValue();
        mockWriteBackupRecordsToCsv.mockResolvedValue();
    });

    afterAll(() => {
        mockFs.restore();
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof processFileAttributeAdjustments).toBe('function');
        });
    });

    describe('Entry filtering and early returns', () => {
        test('should return early when no entries have file attribute adjustments', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    // No fileAttributeAdjustment property
                },
            ];

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockIsFileReadonly).not.toHaveBeenCalled();
            expect(mockSetFileReadonly).not.toHaveBeenCalled();
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled();
        });

        test('should return early when all entries have preserve readonly setting', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'preserve',
                    },
                },
            ];

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockIsFileReadonly).not.toHaveBeenCalled();
            expect(mockSetFileReadonly).not.toHaveBeenCalled();
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled();
        });

        test('should return early when no actual changes are needed', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Mock file already has the target readonly state
            mockIsFileReadonly.mockResolvedValue(true); // Already readonly, and target is 'set' (true)

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockIsFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt')
            );
            expect(mockSetFileReadonly).not.toHaveBeenCalled();
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled();
        });

        test('should process copy operations using destinationPath instead of sourcePath', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'original.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'copied.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'copy',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Mock the copied file (destinationPath) needs readonly change
            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            // Should check and modify the destinationPath, not the sourcePath
            expect(mockIsFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'target', 'copied.txt')
            );
            expect(mockSetFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'target', 'copied.txt'),
                true
            );
            // Should NOT be called with sourcePath
            expect(mockIsFileReadonly).not.toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'original.txt')
            );
            expect(mockSetFileReadonly).not.toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'original.txt'),
                true
            );
        });

        test('should process non-copy operations using sourcePath as before', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Mock the source file needs readonly change
            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            // Should still check and modify the sourcePath for non-copy operations
            expect(mockIsFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt')
            );
            expect(mockSetFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                true
            );
        });
    });

    describe('Single file processing without backup', () => {
        test('should process single file entry that needs readonly change without backup file', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Mock file currently not readonly, needs to be set to readonly
            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockIsFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt')
            );
            expect(mockSetFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                true
            );
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled(); // No backup path specified
        });

        test('should process single file entry that needs readonly unset without backup file', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'remove',
                    },
                },
            ];

            // Mock file currently readonly, needs to be unset
            mockIsFileReadonly.mockResolvedValue(true);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockIsFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt')
            );
            expect(mockSetFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                false
            );
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled(); // No backup path specified
        });
    });

    describe('Directory processing', () => {
        test('should process directory entry by discovering all files recursively', async () => {
            // Arrange
            const sourceDirPath = path.join(tmpRoot, 'source');
            const discoveredFiles = [
                path.join(tmpRoot, 'source', 'file1.txt'),
                path.join(tmpRoot, 'source', 'file2.txt'),
                path.join(tmpRoot, 'source', 'subdir', 'file3.txt'),
            ];

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: sourceDirPath,
                    destinationPath: path.join(tmpRoot, 'target', 'source'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'directory',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Mock directory discovery and file states
            mockDiscoverAllFiles.mockResolvedValue(discoveredFiles);
            mockIsFileReadonly.mockResolvedValue(false); // All files need to be set to readonly

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockDiscoverAllFiles).toHaveBeenCalledWith(sourceDirPath);
            expect(mockIsFileReadonly).toHaveBeenCalledTimes(3);
            expect(mockSetFileReadonly).toHaveBeenCalledTimes(3);

            // Verify all discovered files were processed
            for (const filePath of discoveredFiles) {
                expect(mockIsFileReadonly).toHaveBeenCalledWith(filePath);
                expect(mockSetFileReadonly).toHaveBeenCalledWith(filePath, true);
            }
        });
    });

    describe('Backup file creation and path resolution', () => {
        test('should create backup file with absolute backup path', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'file-attrs.csv');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false); // File needs change

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledWith(
                backupPath,
                expect.arrayContaining([
                    expect.objectContaining({
                        sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                        fileLinkPath: path.join(tmpRoot, 'target', 'file1.txt'),
                        originalReadonly: false,
                        newReadonly: true,
                        action: 'symlink',
                    }),
                ])
            );
            expect(mockSetFileReadonly).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                true
            );
        });

        test('should create backup file with relative backup path resolved against target directory', async () => {
            // Arrange
            const relativeBackupPath = 'file-attrs.csv';
            const expectedAbsoluteBackupPath = path.join(tmpRoot, 'target', relativeBackupPath);

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: relativeBackupPath,
                    },
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false); // File needs change

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledWith(
                expectedAbsoluteBackupPath,
                expect.arrayContaining([
                    expect.objectContaining({
                        sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                        originalReadonly: false,
                        newReadonly: true,
                    }),
                ])
            );
        });
    });

    describe('Multiple groups and backup path grouping', () => {
        test('should group entries by backup path and process each group separately', async () => {
            // Arrange
            const backupPath1 = path.join(tmpRoot, 'backup', 'group1.csv');
            const backupPath2 = path.join(tmpRoot, 'backup', 'group2.csv');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath1,
                    },
                },
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file2.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file2.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath2,
                    },
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false); // Both files need change

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledTimes(2);
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledWith(
                backupPath1,
                expect.any(Array)
            );
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledWith(
                backupPath2,
                expect.any(Array)
            );
            expect(mockSetFileReadonly).toHaveBeenCalledTimes(2);
        });

        test('should process default group (no backup) and backup groups together', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'group.csv');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        // No backupFilePath - goes to default group
                    },
                },
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file2.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file2.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false); // Both files need change

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledTimes(1); // Only backup group gets CSV
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalledWith(backupPath, expect.any(Array));
            expect(mockSetFileReadonly).toHaveBeenCalledTimes(2); // Both files get processed
        });
    });

    describe('User confirmation workflow', () => {
        test('should skip user confirmation when backup files do not exist', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'nonexistent.csv');
            const mockHandleOverwriteBehavior = jest.fn().mockResolvedValue('proceed');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                    handleOverwriteBehaviorFunc: mockHandleOverwriteBehavior,
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockHandleOverwriteBehavior).not.toHaveBeenCalled(); // No confirmation needed
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalled();
            expect(mockSetFileReadonly).toHaveBeenCalled();
        });

        test('should request user confirmation when backup file exists and user chooses to overwrite', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'existing.csv');
            const mockHandleOverwriteBehavior = jest.fn().mockResolvedValue('overwrite');

            // Create existing backup file
            await fs.ensureDir(path.dirname(backupPath));
            await fs.writeFile(backupPath, 'existing content');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                    handleOverwriteBehaviorFunc: mockHandleOverwriteBehavior,
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockHandleOverwriteBehavior).toHaveBeenCalledWith([backupPath]);
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalled();
            expect(mockSetFileReadonly).toHaveBeenCalled();
        });

        test('should return early when user chooses to skip changes', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'existing.csv');
            const mockHandleOverwriteBehavior = jest.fn().mockResolvedValue('skip');

            // Create existing backup file
            await fs.ensureDir(path.dirname(backupPath));
            await fs.writeFile(backupPath, 'existing content');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                    handleOverwriteBehaviorFunc: mockHandleOverwriteBehavior,
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockHandleOverwriteBehavior).toHaveBeenCalledWith([backupPath]);
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled(); // Changes skipped
            expect(mockSetFileReadonly).not.toHaveBeenCalled(); // Changes skipped
        });

        test('should throw DomainError when user chooses error response', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'existing.csv');
            const mockHandleOverwriteBehavior = jest.fn().mockResolvedValue('error');

            // Create existing backup file
            await fs.ensureDir(path.dirname(backupPath));
            await fs.writeFile(backupPath, 'existing content');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                    handleOverwriteBehaviorFunc: mockHandleOverwriteBehavior,
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);

            // Act & Assert
            await expect(processFileAttributeAdjustments(entries)).rejects.toThrow(DomainError);

            const error = await processFileAttributeAdjustments(entries).catch(e => e);
            expect(error.domainErrorInfo).toEqual(
                FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_MODIFICATION_FAILED
            );
            expect(error.message).toBe('User rejected file attribute changes');

            expect(mockHandleOverwriteBehavior).toHaveBeenCalledWith([backupPath]);
            expect(mockWriteBackupRecordsToCsv).not.toHaveBeenCalled();
            expect(mockSetFileReadonly).not.toHaveBeenCalled();
        });

        test('should proceed with default behavior when no callback function provided', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'existing-no-callback.csv');

            // Create existing backup file
            await fs.ensureDir(path.dirname(backupPath));
            await fs.writeFile(backupPath, 'existing content');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                    // No handleOverwriteBehaviorFunc provided
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);

            // Act
            await processFileAttributeAdjustments(entries);

            // Assert
            expect(mockWriteBackupRecordsToCsv).toHaveBeenCalled(); // Should proceed with default
            expect(mockSetFileReadonly).toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        test('should handle errors from isFileReadonly gracefully', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            mockIsFileReadonly.mockRejectedValue(new Error('Permission denied'));

            // Act & Assert
            await expect(processFileAttributeAdjustments(entries)).rejects.toThrow(
                'Permission denied'
            );
        });

        test('should handle errors from setFileReadonly gracefully', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);
            mockSetFileReadonly.mockRejectedValue(new Error('Read-only filesystem'));

            // Act & Assert
            await expect(processFileAttributeAdjustments(entries)).rejects.toThrow(
                'Read-only filesystem'
            );
        });

        test('should handle errors from writeBackupRecordsToCsv gracefully', async () => {
            // Arrange
            const backupPath = path.join(tmpRoot, 'backup', 'error.csv');

            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: backupPath,
                    },
                },
            ];

            mockIsFileReadonly.mockResolvedValue(false);
            mockWriteBackupRecordsToCsv.mockRejectedValue(new Error('Disk full'));

            // Act & Assert
            await expect(processFileAttributeAdjustments(entries)).rejects.toThrow('Disk full');
        });
    });
});
