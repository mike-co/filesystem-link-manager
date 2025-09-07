import * as path from 'path';
import { normalizeConfigPaths } from './normalize-config-paths.function';
import type { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';

describe('normalize-config-paths.function', () => {
    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof normalizeConfigPaths).toBe('function');
        });
    });

    describe('Top-level path normalization', () => {
        test('should normalize targetDirectoryPath with mixed separators', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './source/folder/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.targetDirectoryPath).toBe(path.normalize('./source/folder/path'));
            expect(path.isAbsolute(result.targetDirectoryPath)).toBe(
                path.isAbsolute('./source/folder/path')
            );
        });

        test('should handle absolute paths correctly', () => {
            // Arrange
            const inputPath =
                process.platform === 'win32'
                    ? 'C:\\absolute\\path\\to\\directory'
                    : '/absolute/path/to/directory';
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: inputPath,
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.targetDirectoryPath).toBe(path.normalize(inputPath));
            expect(path.isAbsolute(result.targetDirectoryPath)).toBe(true);
        });
    });

    describe('Operations path normalization', () => {
        test('should normalize baseDirectoryPath in operations array', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: './source/files',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.ts' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.operations).toBeDefined();
            expect(result.operations).toHaveLength(1);
            const operation = result.operations?.[0];
            expect(operation?.baseDirectoryPath).toBe(path.normalize('./source/files'));
            expect(result.targetDirectoryPath).toBe(path.normalize('./target'));
        });

        test('should normalize destinationPath when present in operations', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'copy' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: './source',
                        destinationPath: './custom/destination',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.ts' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.operations).toBeDefined();
            expect(result.operations).toHaveLength(1);
            const operation = result.operations?.[0];
            expect(operation?.destinationPath).toBe(path.normalize('./custom/destination'));
        });

        test('should preserve undefined destinationPath in operations', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: './source',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.ts' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.operations).toBeDefined();
            expect(result.operations).toHaveLength(1);
            const operation = result.operations?.[0];
            expect(operation?.destinationPath).toBeUndefined();
        });
    });

    describe('Edge cases and boundary conditions', () => {
        test('should handle empty operations array', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.operations).toEqual([]);
        });

        test('should handle undefined operations array', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'overwrite',
                operations: undefined as any,
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.operations).toBeUndefined();
        });

        test('should handle null operations array', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'overwrite',
                operations: null as any,
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.operations).toBeNull();
        });

        test('should handle empty string paths', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: '',
                        destinationPath: '',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.targetDirectoryPath).toBe(path.normalize(''));
            expect(result.operations).toBeDefined();
            expect(result.operations).toHaveLength(1);
            const operation = result.operations?.[0];
            expect(operation?.baseDirectoryPath).toBe(path.normalize(''));
            // Empty string is truthy but results in undefined after conditional check
            expect(operation?.destinationPath).toBeUndefined();
        });
    });

    describe('Cross-platform compatibility scenarios', () => {
        test('should handle Unix-style paths', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/home/user/project',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: '/var/data/source',
                        destinationPath: '/opt/target/dest',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.log' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.targetDirectoryPath).toBe(path.normalize('/home/user/project'));
            expect(result.operations).toBeDefined();
            expect(result.operations).toHaveLength(1);
            const operation = result.operations?.[0];
            expect(operation?.baseDirectoryPath).toBe(path.normalize('/var/data/source'));
            expect(operation?.destinationPath).toBe(path.normalize('/opt/target/dest'));
        });

        test('should handle mixed separators consistently', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './mixed\\path/to\\directory',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: '../source/folder\\subfolder',
                        destinationPath: './dest\\sub/final',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '**/*' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.targetDirectoryPath).toBe(path.normalize('./mixed\\path/to\\directory'));
            expect(result.operations).toBeDefined();
            expect(result.operations).toHaveLength(1);
            const operation = result.operations?.[0];
            expect(operation?.baseDirectoryPath).toBe(
                path.normalize('../source/folder\\subfolder')
            );
            expect(operation?.destinationPath).toBe(path.normalize('./dest\\sub/final'));
        });
    });

    describe('Object immutability and side effects', () => {
        test('should not modify the original config object', () => {
            // Arrange
            const originalConfig: FileSystemOperationConfig = {
                targetDirectoryPath: './original/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: './original/source',
                        destinationPath: './original/dest',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            const originalConfigCopy = JSON.parse(JSON.stringify(originalConfig));

            // Act
            normalizeConfigPaths(originalConfig);

            // Assert
            expect(originalConfig).toEqual(originalConfigCopy);
        });

        test('should return a new object with normalized paths', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './test/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 749,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result).not.toBe(config); // Different object reference
            expect(result.targetDirectoryPath).toBe(path.normalize('./test/path'));
        });

        test('should preserve all non-path properties unchanged', () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: './target',
                defaultOverwriteBehavior: 'skip',
                operations: [],
                postExecutionCommands: [{ command: 'echo done', cwd: './' }],
                fileCountPromptThreshold: 500,
                silentMode: true,
                enableSourceDeduplication: true,
                disableCommandValidation: true,
                disableRegexValidation: true,
            };

            // Act
            const result = normalizeConfigPaths(config);

            // Assert
            expect(result.defaultOverwriteBehavior).toBe('skip');
            expect(result.fileCountPromptThreshold).toBe(500);
            expect(result.silentMode).toBe(true);
            expect(result.enableSourceDeduplication).toBe(true);
            expect(result.disableCommandValidation).toBe(true);
            expect(result.disableRegexValidation).toBe(true);
            expect(result.postExecutionCommands).toEqual(config.postExecutionCommands);
        });
    });
});
