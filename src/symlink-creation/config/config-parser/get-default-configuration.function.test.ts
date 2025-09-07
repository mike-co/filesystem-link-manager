import { getDefaultConfiguration } from './get-default-configuration.function';
import type { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';

describe('get-default-configuration.function', () => {
    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof getDefaultConfiguration).toBe('function');
        });
    });

    describe('Default configuration properties', () => {
        test('should return valid FileSystemOperationConfig object', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
        });

        test('should provide correct targetDirectoryPath default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.targetDirectoryPath).toBe('.');
            expect(typeof result.targetDirectoryPath).toBe('string');
        });

        test('should provide correct silentMode default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.silentMode).toBe(false);
            expect(typeof result.silentMode).toBe('boolean');
        });

        test('should provide correct defaultOverwriteBehavior default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.defaultOverwriteBehavior).toBe('overwrite');
            expect(typeof result.defaultOverwriteBehavior).toBe('string');
        });

        test('should provide correct operations default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.operations).toEqual([]);
            expect(Array.isArray(result.operations)).toBe(true);
            expect(result.operations).toHaveLength(0);
        });

        test('should provide correct postExecutionCommands default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.postExecutionCommands).toEqual([]);
            expect(Array.isArray(result.postExecutionCommands)).toBe(true);
            expect(result.postExecutionCommands).toHaveLength(0);
        });

        test('should provide correct fileCountPromptThreshold default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.fileCountPromptThreshold).toBe(749);
            expect(typeof result.fileCountPromptThreshold).toBe('number');
            expect(result.fileCountPromptThreshold).toBeGreaterThan(0);
        });

        test('should provide correct enableSourceDeduplication default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.enableSourceDeduplication).toBe(false);
            expect(typeof result.enableSourceDeduplication).toBe('boolean');
        });

        test('should provide correct disableCommandValidation default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.disableCommandValidation).toBe(false);
            expect(typeof result.disableCommandValidation).toBe('boolean');
        });

        test('should provide correct disableRegexValidation default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(result.disableRegexValidation).toBe(false);
            expect(typeof result.disableRegexValidation).toBe('boolean');
        });
    });

    describe('Interface compliance', () => {
        test('should have all required FileSystemOperationConfig properties', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - Check all required properties exist
            expect(result).toHaveProperty('targetDirectoryPath');
            expect(result).toHaveProperty('silentMode');
            expect(result).toHaveProperty('defaultOverwriteBehavior');
            expect(result).toHaveProperty('operations');
            expect(result).toHaveProperty('postExecutionCommands');
            expect(result).toHaveProperty('fileCountPromptThreshold');
            expect(result).toHaveProperty('enableSourceDeduplication');
            expect(result).toHaveProperty('disableCommandValidation');
            expect(result).toHaveProperty('disableRegexValidation');
        });

        test('should conform to FileSystemOperationConfig interface structure', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - Verify type conformance
            const config: FileSystemOperationConfig = result; // Should not cause TypeScript error
            expect(config).toBeDefined();
        });

        test('should not have any additional unexpected properties', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            const expectedKeys = [
                'targetDirectoryPath',
                'silentMode',
                'defaultOverwriteBehavior',
                'operations',
                'postExecutionCommands',
                'fileCountPromptThreshold',
                'enableSourceDeduplication',
                'disableCommandValidation',
                'disableRegexValidation',
            ];

            const actualKeys = Object.keys(result).sort();
            expect(actualKeys).toEqual(expectedKeys.sort());
        });
    });

    describe('Security and safety defaults', () => {
        test('should provide secure default overwrite behavior', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - Overwrite is safer than skip for symlinks
            expect(result.defaultOverwriteBehavior).toBe('overwrite');
        });

        test('should provide safe file count threshold', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - 700 is a reasonable threshold that prevents overwhelming the user
            expect(result.fileCountPromptThreshold).toBe(749);
            expect(result.fileCountPromptThreshold).toBeGreaterThan(0);
            expect(result.fileCountPromptThreshold).toBeLessThan(10000); // Reasonable upper bound
        });

        test('should enable validation by default for security', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - Validation should be enabled by default for security
            expect(result.disableCommandValidation).toBe(false);
            expect(result.disableRegexValidation).toBe(false);
        });

        test('should disable source deduplication by default for safety', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - Deduplication disabled for safer operation
            expect(result.enableSourceDeduplication).toBe(false);
        });

        test('should use interactive mode by default', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert - Interactive mode is safer than silent mode
            expect(result.silentMode).toBe(false);
        });
    });

    describe('Function behavior and immutability', () => {
        test('should return a new object on each call', () => {
            // Arrange & Act
            const result1 = getDefaultConfiguration();
            const result2 = getDefaultConfiguration();

            // Assert
            expect(result1).not.toBe(result2); // Different object references
            expect(result1).toEqual(result2); // Same content
        });

        test('should return consistent values across multiple calls', () => {
            // Arrange & Act
            const results = Array.from({ length: 5 }, () => getDefaultConfiguration());

            // Assert
            const firstResult = results[0];
            results.forEach(result => {
                expect(result).toEqual(firstResult);
            });
        });

        test('should not be affected by modifying returned object', () => {
            // Arrange
            const result1 = getDefaultConfiguration();

            // Act - Modify the returned object
            result1.targetDirectoryPath = './modified';
            result1.silentMode = true;
            if (result1.operations) {
                result1.operations.push({
                    action: 'symlink' as const,
                    itemType: 'file' as const,
                    baseDirectoryPath: './test',
                    searchPatterns: [{ patternType: 'glob' as const, pattern: '*.ts' }],
                });
            }

            const result2 = getDefaultConfiguration();

            // Assert - New calls should return unmodified defaults
            expect(result2.targetDirectoryPath).toBe('.');
            expect(result2.silentMode).toBe(false);
            expect(result2.operations).toEqual([]);
        });

        test('should return arrays that can be safely modified', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Act - Modify arrays
            if (result.operations) {
                result.operations.push({
                    action: 'copy' as const,
                    itemType: 'directory' as const,
                    baseDirectoryPath: './test',
                    searchPatterns: [{ patternType: 'regex' as const, pattern: '.*' }],
                });
            }
            if (result.postExecutionCommands) {
                result.postExecutionCommands.push({ command: 'echo test', cwd: './' });
            }

            // Assert - Should not throw errors
            expect(result.operations).toHaveLength(1);
            expect(result.postExecutionCommands).toHaveLength(1);
            if (result.operations) {
                expect(() => result.operations?.push({} as any)).not.toThrow();
            }
            if (result.postExecutionCommands) {
                expect(() => result.postExecutionCommands?.push({} as any)).not.toThrow();
            }
        });
    });

    describe('Type safety and edge cases', () => {
        test('should return object with correct property types', () => {
            // Arrange & Act
            const result = getDefaultConfiguration();

            // Assert
            expect(typeof result.targetDirectoryPath).toBe('string');
            expect(typeof result.silentMode).toBe('boolean');
            expect(typeof result.defaultOverwriteBehavior).toBe('string');
            expect(typeof result.fileCountPromptThreshold).toBe('number');
            expect(typeof result.enableSourceDeduplication).toBe('boolean');
            expect(typeof result.disableCommandValidation).toBe('boolean');
            expect(typeof result.disableRegexValidation).toBe('boolean');
            expect(Array.isArray(result.operations)).toBe(true);
            expect(Array.isArray(result.postExecutionCommands)).toBe(true);
        });

        test('should not accept any parameters', () => {
            // Arrange & Act & Assert - Function should work without parameters
            expect(() => getDefaultConfiguration()).not.toThrow();

            // Should also work if accidentally called with parameters
            expect(() => (getDefaultConfiguration as any)('unexpected')).not.toThrow();
            expect(() => (getDefaultConfiguration as any)({})).not.toThrow();
            expect(() => (getDefaultConfiguration as any)(null)).not.toThrow();
        });

        test('should handle function call in various contexts', () => {
            // Arrange & Act & Assert
            expect(() => {
                const config = getDefaultConfiguration();
                return config;
            }).not.toThrow();

            expect(() => {
                const { targetDirectoryPath } = getDefaultConfiguration();
                return targetDirectoryPath;
            }).not.toThrow();

            expect(() => {
                const configs = [getDefaultConfiguration(), getDefaultConfiguration()];
                return configs;
            }).not.toThrow();
        });
    });
});
