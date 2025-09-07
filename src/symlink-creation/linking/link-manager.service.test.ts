import { LoggerService } from '../../logging';
import { LinkManagerService } from './link-manager.service';
import { FileLinkOptions, DirectoryLinkOptions } from './types/link-creation-options.interface';
import { LinkingOperationResult } from './types/linking-operation-result.interface';
import * as createLinkFunction from './link-manager/create-link.function';

jest.mock('./link-manager/create-link.function');

describe('link-manager.service', () => {
    let serviceUnderTest: LinkManagerService;
    let mockLoggerService: jest.Mocked<LoggerService>;
    let mockCreateLink: jest.MockedFunction<typeof createLinkFunction.createLink>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock logger service with all required methods
        mockLoggerService = jest.createMockFromModule(
            '../../logging/logger.service'
        ) as jest.Mocked<LoggerService>;
        mockLoggerService.debug = jest.fn();
        mockLoggerService.info = jest.fn();
        mockLoggerService.warn = jest.fn();
        mockLoggerService.error = jest.fn();

        // Get the mocked createLink function
        mockCreateLink = createLinkFunction.createLink as jest.MockedFunction<
            typeof createLinkFunction.createLink
        >;

        // Create service under test
        serviceUnderTest = new LinkManagerService(mockLoggerService);
    });

    describe('Construction', () => {
        test('should construct successfully with logger dependency', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(LinkManagerService);
        });
    });

    describe('File link creation', () => {
        test('should create file symlink successfully and log operation', async () => {
            // Arrange
            const sourcePath = '/source/file.txt';
            const targetPath = '/target/file.txt';
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };
            const expectedResult: LinkingOperationResult = {
                success: true,
                sourcePath,
                targetPath,
                operation: 'create',
                itemType: 'file',
                action: 'symlink',
                metadata: {
                    timestamp: '2025-09-06T10:00:00.000Z',
                },
            };

            mockCreateLink.mockResolvedValue(expectedResult);

            // Act
            const result = await serviceUnderTest.createFileLink(sourcePath, targetPath, options);

            // Assert
            expect(result).toBe(expectedResult);
            expect(mockCreateLink).toHaveBeenCalledWith(sourcePath, targetPath, options);
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                `Creating file symlink: ${sourcePath} -> ${targetPath}`,
                expect.objectContaining({
                    operation: 'createSymlink',
                    filePath: sourcePath,
                    targetPath: targetPath,
                })
            );
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                `File symlink created successfully: ${targetPath}`,
                expect.objectContaining({
                    operation: 'createSymlink',
                    filePath: sourcePath,
                    targetPath: targetPath,
                })
            );
        });

        test('should create file hardlink successfully', async () => {
            // Arrange
            const sourcePath = '/source/file.txt';
            const targetPath = '/target/file.txt';
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'hardlink',
            };
            const expectedResult: LinkingOperationResult = {
                success: true,
                sourcePath,
                targetPath,
                operation: 'create',
                itemType: 'file',
                action: 'hardlink',
                metadata: {
                    timestamp: '2025-09-06T10:00:00.000Z',
                },
            };

            mockCreateLink.mockResolvedValue(expectedResult);

            // Act
            const result = await serviceUnderTest.createFileLink(sourcePath, targetPath, options);

            // Assert
            expect(result).toBe(expectedResult);
            expect(mockCreateLink).toHaveBeenCalledWith(sourcePath, targetPath, options);
        });

        test('should handle and re-throw domain errors from createLink function', async () => {
            // Arrange
            const sourcePath = '/source/file.txt';
            const targetPath = '/target/file.txt';
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };
            const domainError = new Error('Access denied');

            mockCreateLink.mockRejectedValue(domainError);

            // Act & Assert
            await expect(
                serviceUnderTest.createFileLink(sourcePath, targetPath, options)
            ).rejects.toThrow('Access denied');
        });

        test('should handle unknown error types and log appropriately', async () => {
            // Arrange
            const sourcePath = '/source/file.txt';
            const targetPath = '/target/file.txt';
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };
            const unknownError = 'string error';

            mockCreateLink.mockRejectedValue(unknownError);

            // Act & Assert
            await expect(
                serviceUnderTest.createFileLink(sourcePath, targetPath, options)
            ).rejects.toBe(unknownError);
        });
    });

    describe('Directory link creation', () => {
        test('should create directory symlink successfully and log operation', async () => {
            // Arrange
            const sourcePath = '/source/directory';
            const targetPath = '/target/directory';
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };
            const expectedResult: LinkingOperationResult = {
                success: true,
                sourcePath,
                targetPath,
                operation: 'create',
                itemType: 'directory',
                action: 'symlink',
                metadata: {
                    timestamp: '2025-09-06T10:00:00.000Z',
                },
            };

            mockCreateLink.mockResolvedValue(expectedResult);

            // Act
            const result = await serviceUnderTest.createDirectorySymlink(
                sourcePath,
                targetPath,
                options
            );

            // Assert
            expect(result).toBe(expectedResult);
            expect(mockCreateLink).toHaveBeenCalledWith(sourcePath, targetPath, options);
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                `Creating directory link: ${sourcePath} -> ${targetPath}`,
                expect.objectContaining({
                    operation: 'createDirectoryLink',
                    filePath: sourcePath,
                    targetPath: targetPath,
                })
            );
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                `Directory link created successfully: ${targetPath}`,
                expect.objectContaining({
                    operation: 'createDirectoryLink',
                    filePath: sourcePath,
                    targetPath: targetPath,
                })
            );
        });

        test('should handle and re-throw domain errors from createLink function', async () => {
            // Arrange
            const sourcePath = '/source/directory';
            const targetPath = '/target/directory';
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };
            const domainError = new Error('Directory not found');

            mockCreateLink.mockRejectedValue(domainError);

            // Act & Assert
            await expect(
                serviceUnderTest.createDirectorySymlink(sourcePath, targetPath, options)
            ).rejects.toThrow('Directory not found');
        });

        test('should handle unknown error types and log appropriately', async () => {
            // Arrange
            const sourcePath = '/source/directory';
            const targetPath = '/target/directory';
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };
            const unknownError = null;

            mockCreateLink.mockRejectedValue(unknownError);

            // Act & Assert
            await expect(
                serviceUnderTest.createDirectorySymlink(sourcePath, targetPath, options)
            ).rejects.toBe(null);
        });
    });

    describe('Service orchestration patterns', () => {
        test('should coordinate multiple operations with proper error isolation', async () => {
            // Arrange
            const filePath1 = '/source/file1.txt';
            const filePath2 = '/source/file2.txt';
            const targetPath1 = '/target/file1.txt';
            const targetPath2 = '/target/file2.txt';
            const fileOptions: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };

            const successResult: LinkingOperationResult = {
                success: true,
                sourcePath: filePath1,
                targetPath: targetPath1,
                operation: 'create',
                itemType: 'file',
                action: 'symlink',
            };

            mockCreateLink.mockResolvedValueOnce(successResult);
            mockCreateLink.mockRejectedValueOnce(new Error('Second operation failed'));

            // Act
            const result1Promise = serviceUnderTest.createFileLink(
                filePath1,
                targetPath1,
                fileOptions
            );
            const result2Promise = serviceUnderTest.createFileLink(
                filePath2,
                targetPath2,
                fileOptions
            );

            // Assert
            const result1 = await result1Promise;
            expect(result1).toBe(successResult);

            await expect(result2Promise).rejects.toThrow('Second operation failed');
            expect(mockCreateLink).toHaveBeenCalledTimes(2);
        });

        test('should pass through complex options with verbose metadata', async () => {
            // Arrange
            const sourcePath = '/source/file.txt';
            const targetPath = '/target/file.txt';
            const complexOptions: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                createParentDirectories: true,
                verboseMetadata: true,
                handleOverwriteBehaviorFunc: jest.fn().mockResolvedValue('overwrite'),
            };

            const expectedResult: LinkingOperationResult = {
                success: true,
                sourcePath,
                targetPath,
                operation: 'create',
                itemType: 'file',
                action: 'symlink',
                metadata: {
                    timestamp: '2025-09-06T10:00:00.000Z',
                    targetExisted: false,
                    parentDirectoriesCreated: true,
                    overwritePerformed: false,
                },
            };

            mockCreateLink.mockResolvedValue(expectedResult);

            // Act
            const result = await serviceUnderTest.createFileLink(
                sourcePath,
                targetPath,
                complexOptions
            );

            // Assert
            expect(result).toBe(expectedResult);
            expect(mockCreateLink).toHaveBeenCalledWith(sourcePath, targetPath, complexOptions);
        });
    });
});
