import * as path from 'path';
import { pathExists } from 'fs-extra';
import mockFs from 'mock-fs';
import { EXECUTION_DOMAIN_ERRORS } from '../execution-domain-errors.const';
import { skipIfPathExists } from './skip-if-path-exists.function';
import { createExecutionError } from './create-execution-error.function';

jest.mock('./create-execution-error.function');

describe('skip-if-path-exists.function', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());
    let mockCreateExecutionError: jest.MockedFunction<typeof createExecutionError>;

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with expected directories and files
        mockFs({
            [tmpRoot]: {
                'existing-file.txt': 'content',
                'existing-dir': {
                    'nested-file.txt': 'nested content',
                },
                'target-dir': {},
            },
            // Preserve node_modules for Jest functionality
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateExecutionError = createExecutionError as jest.MockedFunction<
            typeof createExecutionError
        >;
    });

    afterAll(() => {
        mockFs.restore();
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof skipIfPathExists).toBe('function');
        });
    });

    describe('Path existence checking with absolute paths', () => {
        test('should return true when absolute path exists and is a file', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const absoluteFilePath = path.join(tmpRoot, 'existing-file.txt');

            // Verify file exists in mock filesystem
            expect(await pathExists(absoluteFilePath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, absoluteFilePath);

            // Assert
            expect(result).toBe(true);
        });

        test('should return true when absolute path exists and is a directory', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const absoluteDirPath = path.join(tmpRoot, 'existing-dir');

            // Verify directory exists in mock filesystem
            expect(await pathExists(absoluteDirPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, absoluteDirPath);

            // Assert
            expect(result).toBe(true);
        });

        test('should return false when absolute path does not exist', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const nonExistentPath = path.join(tmpRoot, 'non-existent-file.txt');

            // Verify path does not exist in mock filesystem
            expect(await pathExists(nonExistentPath)).toBe(false);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, nonExistentPath);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('Path existence checking with relative paths', () => {
        test('should return true when relative path resolves to existing file', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const relativePath = 'existing-file.txt';
            const resolvedPath = path.resolve(targetDirectoryPath, relativePath);

            // Verify resolved path exists in mock filesystem
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, relativePath);

            // Assert
            expect(result).toBe(true);
        });

        test('should return true when relative path resolves to existing directory', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const relativePath = 'existing-dir';
            const resolvedPath = path.resolve(targetDirectoryPath, relativePath);

            // Verify resolved directory exists in mock filesystem
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, relativePath);

            // Assert
            expect(result).toBe(true);
        });

        test('should return true when nested relative path resolves to existing file', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const relativePath = 'existing-dir/nested-file.txt';
            const resolvedPath = path.resolve(targetDirectoryPath, relativePath);

            // Verify nested file exists in mock filesystem
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, relativePath);

            // Assert
            expect(result).toBe(true);
        });

        test('should return false when relative path resolves to non-existent file', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const relativePath = 'non-existent-file.txt';
            const resolvedPath = path.resolve(targetDirectoryPath, relativePath);

            // Verify resolved path does not exist in mock filesystem
            expect(await pathExists(resolvedPath)).toBe(false);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, relativePath);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('Error handling', () => {
        test('should throw domain error when pathExists fails', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const problematicPath = '/invalid/protected/path';
            const originalError = new Error('EACCES: permission denied');
            const expectedDomainError = {
                message: 'Access denied',
                errorInfo: EXECUTION_DOMAIN_ERRORS.EXECUTION_ACCESS_PATH_EXISTS_CHECK,
            };

            // Mock pathExists to throw an error by restoring mockFs temporarily
            mockFs.restore();

            // Mock pathExists directly to simulate access error
            jest.spyOn(require('fs-extra'), 'pathExists').mockRejectedValue(originalError);
            mockCreateExecutionError.mockReturnValue(expectedDomainError as any);

            // Act & Assert
            await expect(skipIfPathExists(targetDirectoryPath, problematicPath)).rejects.toEqual(
                expectedDomainError
            );

            expect(mockCreateExecutionError).toHaveBeenCalledWith(
                originalError,
                EXECUTION_DOMAIN_ERRORS.EXECUTION_ACCESS_PATH_EXISTS_CHECK
            );

            // Restore mockFs for subsequent tests
            const nodeModulesPath = path.join(process.cwd(), 'node_modules');
            mockFs({
                [tmpRoot]: {
                    'existing-file.txt': 'content',
                    'existing-dir': {
                        'nested-file.txt': 'nested content',
                    },
                    'target-dir': {},
                },
                [nodeModulesPath]: mockFs.load(nodeModulesPath),
            });

            // Clear the mock to avoid affecting other tests
            jest.restoreAllMocks();
        });
    });

    describe('Edge cases', () => {
        test('should handle empty relative path', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const emptyPath = '';
            const resolvedPath = path.resolve(targetDirectoryPath, emptyPath);

            // Verify resolved path exists (should resolve to targetDirectoryPath itself)
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, emptyPath);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle dot relative path', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const dotPath = '.';
            const resolvedPath = path.resolve(targetDirectoryPath, dotPath);

            // Verify resolved path exists (should resolve to targetDirectoryPath itself)
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, dotPath);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle parent directory relative path', async () => {
            // Arrange
            const targetDirectoryPath = path.join(tmpRoot, 'target-dir');
            const parentPath = '..';
            const resolvedPath = path.resolve(targetDirectoryPath, parentPath);

            // Verify resolved path exists (should resolve to tmpRoot)
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, parentPath);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle path with backslashes on Windows', async () => {
            // Arrange
            const targetDirectoryPath = tmpRoot;
            const windowsStylePath = 'existing-dir\\nested-file.txt';

            // Path resolution should work regardless of separator style
            const resolvedPath = path.resolve(targetDirectoryPath, windowsStylePath);
            expect(await pathExists(resolvedPath)).toBe(true);

            // Act
            const result = await skipIfPathExists(targetDirectoryPath, windowsStylePath);

            // Assert
            expect(result).toBe(true);
        });
    });
});
