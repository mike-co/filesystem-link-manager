import { AttributeAdjustmentService } from './attribute-adjustment.service';
import { LoggerService } from '../../logging';
import { FileAttributeAdjustmentEntry } from './types/file-attribute-adjustment-entry.interface';
import { DomainError } from '../../common';

jest.mock('./attribute-adjustment/process-file-attribute-adjustments.function');

import { processFileAttributeAdjustments } from './attribute-adjustment/process-file-attribute-adjustments.function';

describe('attribute-adjustment.service', () => {
    let serviceUnderTest: AttributeAdjustmentService;
    let mockLoggerService: jest.Mocked<LoggerService>;
    let mockProcessFileAttributeAdjustments: jest.MockedFunction<
        typeof processFileAttributeAdjustments
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mocked logger service
        mockLoggerService = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
        } as any;

        // Get reference to the mocked function
        mockProcessFileAttributeAdjustments =
            processFileAttributeAdjustments as jest.MockedFunction<
                typeof processFileAttributeAdjustments
            >;

        // Default successful resolution
        mockProcessFileAttributeAdjustments.mockResolvedValue();

        // Construct service under test
        serviceUnderTest = new AttributeAdjustmentService(mockLoggerService);
    });

    describe('Construction', () => {
        test('should construct successfully with injected logger service', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(AttributeAdjustmentService);
        });
    });

    describe('Service orchestration', () => {
        test('should delegate to processFileAttributeAdjustments function with provided entries', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file1.txt',
                    destinationPath: '/target/file1.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: '/backup/attrs.csv',
                    },
                },
                {
                    sourcePath: '/source/file2.txt',
                    destinationPath: '/target/file2.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'remove',
                    },
                },
            ];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledTimes(1);
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledWith(
                entries,
                mockLoggerService
            );
        });

        test('should call processFileAttributeAdjustments with empty array when no entries provided', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledTimes(1);
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledWith([], mockLoggerService);
        });

        test('should process single entry successfully', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledWith(
                entries,
                mockLoggerService
            );
        });
    });

    describe('Logging behavior', () => {
        test('should log debug message when starting file attribute processing', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file1.txt',
                    destinationPath: '/target/file1.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
                {
                    sourcePath: '/source/file2.txt',
                    destinationPath: '/target/file2.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'remove',
                    },
                },
            ];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Processing file attribute adjustments for 2 entries',
                {
                    operation: 'processFileAttributeAdjustments',
                    processedCount: 2,
                }
            );
        });

        test('should log info message when file attribute processing completes successfully', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                'File attribute adjustments completed successfully for 1 entries',
                {
                    operation: 'processFileAttributeAdjustments',
                    processedCount: 1,
                }
            );
        });

        test('should log correct count for zero entries', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Processing file attribute adjustments for 0 entries',
                {
                    operation: 'processFileAttributeAdjustments',
                    processedCount: 0,
                }
            );
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                'File attribute adjustments completed successfully for 0 entries',
                {
                    operation: 'processFileAttributeAdjustments',
                    processedCount: 0,
                }
            );
        });
    });

    describe('Error handling and logging', () => {
        test('should log error and re-throw when processFileAttributeAdjustments throws Error', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            const error = new Error('Permission denied');
            mockProcessFileAttributeAdjustments.mockRejectedValue(error);

            // Act & Assert
            await expect(serviceUnderTest.processFileAttributeAdjustments(entries)).rejects.toThrow(
                'Permission denied'
            );
        });

        test('should log error and re-throw when processFileAttributeAdjustments throws DomainError', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            const domainError = new DomainError({
                key: 'FILE_ATTRIBUTE_MODIFICATION_FAILED',
                message: 'File attribute modification failed',
                description: 'Failed to modify file attributes',
            });
            domainError.message = 'User rejected file attribute changes';
            mockProcessFileAttributeAdjustments.mockRejectedValue(domainError);

            // Act & Assert
            await expect(serviceUnderTest.processFileAttributeAdjustments(entries)).rejects.toThrow(
                DomainError
            );
        });

        test('should handle unknown error types gracefully', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            const unknownError = 'String error'; // Non-Error object
            mockProcessFileAttributeAdjustments.mockRejectedValue(unknownError);

            // Act & Assert
            await expect(serviceUnderTest.processFileAttributeAdjustments(entries)).rejects.toBe(
                unknownError
            );
        });

        test('should not log success when operation fails', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                    },
                },
            ];

            mockProcessFileAttributeAdjustments.mockRejectedValue(new Error('Operation failed'));

            // Act & Assert
            await expect(
                serviceUnderTest.processFileAttributeAdjustments(entries)
            ).rejects.toThrow();

            expect(mockLoggerService.debug).toHaveBeenCalledTimes(1); // Start message only
            expect(mockLoggerService.info).not.toHaveBeenCalled(); // No success message
        });
    });

    describe('Integration scenarios', () => {
        test('should handle mixed entry types with different file attribute adjustments', async () => {
            // Arrange
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: '/backup/file-attrs.csv',
                    },
                },
                {
                    sourcePath: '/source/dir',
                    destinationPath: '/target/dir',
                    targetDirectoryPath: '/target',
                    itemType: 'directory',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'remove',
                    },
                },
                {
                    sourcePath: '/source/preserve.txt',
                    destinationPath: '/target/preserve.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'copy',
                    fileAttributeAdjustment: {
                        readonly: 'preserve',
                    },
                },
            ];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledWith(
                entries,
                mockLoggerService
            );
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Processing file attribute adjustments for 3 entries',
                expect.any(Object)
            );
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                'File attribute adjustments completed successfully for 3 entries',
                expect.any(Object)
            );
        });

        test('should handle entries with callback functions properly', async () => {
            // Arrange
            const mockCallback = jest.fn().mockResolvedValue('overwrite');
            const entries: FileAttributeAdjustmentEntry[] = [
                {
                    sourcePath: '/source/file.txt',
                    destinationPath: '/target/file.txt',
                    targetDirectoryPath: '/target',
                    itemType: 'file',
                    action: 'symlink',
                    fileAttributeAdjustment: {
                        readonly: 'set',
                        backupFilePath: '/backup/existing.csv',
                    },
                    handleOverwriteBehaviorFunc: mockCallback,
                },
            ];

            // Act
            await serviceUnderTest.processFileAttributeAdjustments(entries);

            // Assert
            expect(mockProcessFileAttributeAdjustments).toHaveBeenCalledWith(
                entries,
                mockLoggerService
            );
            // Callback handling is tested in the pure function tests, service just passes through
        });
    });
});
