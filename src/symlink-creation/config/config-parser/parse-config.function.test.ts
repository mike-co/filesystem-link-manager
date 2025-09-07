import { parseConfig } from './parse-config.function';
import { DomainError } from '../../../common';
import { CONFIG_DOMAIN_ERRORS } from '../config-domain-errors.const';
import * as getDefaultConfigurationFunction from './get-default-configuration.function';
import type { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';

jest.mock('./get-default-configuration.function');

describe('parse-config.function', () => {
    let mockGetDefaultConfiguration: jest.MockedFunction<
        typeof getDefaultConfigurationFunction.getDefaultConfiguration
    >;

    const mockDefaultConfig: FileSystemOperationConfig = {
        targetDirectoryPath: '.',
        silentMode: false,
        defaultOverwriteBehavior: 'overwrite',
        operations: [],
        postExecutionCommands: [],
        fileCountPromptThreshold: 749,
        enableSourceDeduplication: false,
        disableCommandValidation: false,
        disableRegexValidation: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDefaultConfiguration =
            getDefaultConfigurationFunction.getDefaultConfiguration as jest.MockedFunction<
                typeof getDefaultConfigurationFunction.getDefaultConfiguration
            >;

        mockGetDefaultConfiguration.mockReturnValue(mockDefaultConfig);
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof parseConfig).toBe('function');
        });
    });

    describe('Configuration parsing logic', () => {
        test('should merge provided config with defaults when valid object provided', async () => {
            // Arrange
            const inputConfig = {
                targetDirectoryPath: '/custom/path',
                silentMode: true,
            };

            const expectedResult: FileSystemOperationConfig = {
                ...mockDefaultConfig,
                targetDirectoryPath: '/custom/path',
                silentMode: true,
            };

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockGetDefaultConfiguration).toHaveBeenCalledTimes(1);
        });

        test('should return defaults when empty object provided', async () => {
            // Arrange
            const inputConfig = {};

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result).toEqual(mockDefaultConfig);
            expect(mockGetDefaultConfiguration).toHaveBeenCalledTimes(1);
        });

        test('should override specific properties while keeping defaults for others', async () => {
            // Arrange
            const inputConfig = {
                fileCountPromptThreshold: 1000,
                enableSourceDeduplication: true,
            };

            const expectedResult: FileSystemOperationConfig = {
                ...mockDefaultConfig,
                fileCountPromptThreshold: 1000,
                enableSourceDeduplication: true,
            };

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result).toEqual(expectedResult);
        });

        test('should handle complex configuration objects with nested properties', async () => {
            // Arrange
            const inputConfig = {
                targetDirectoryPath: '/complex/path',
                operations: [
                    {
                        action: 'symlink' as const,
                        itemType: 'file' as const,
                        baseDirectoryPath: '/source',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.ts' }],
                    },
                ],
                postExecutionCommands: [
                    {
                        command: 'echo "done"',
                        workingDirectory: '/working',
                    },
                ],
            };

            const expectedResult: FileSystemOperationConfig = {
                ...mockDefaultConfig,
                targetDirectoryPath: '/complex/path',
                operations: inputConfig.operations,
                postExecutionCommands: inputConfig.postExecutionCommands,
            };

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result).toEqual(expectedResult);
        });
    });

    describe('Error handling scenarios', () => {
        test('should throw CONFIG_VALUE_NULL domain error when config is explicitly null', async () => {
            // Arrange
            const inputConfig = null;

            // Act & Assert
            await expect(parseConfig(inputConfig)).rejects.toThrow(DomainError);
            await expect(parseConfig(inputConfig)).rejects.toThrow(
                CONFIG_DOMAIN_ERRORS.CONFIG_VALUE_NULL.message
            );

            try {
                await parseConfig(inputConfig);
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_VALUE_NULL.key
                );
            }
        });

        test('should throw CONFIG_TYPE domain error when config is not an object - string', async () => {
            // Arrange
            const inputConfig = 'not an object';

            // Act & Assert
            await expect(parseConfig(inputConfig)).rejects.toThrow(DomainError);

            try {
                await parseConfig(inputConfig);
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_TYPE.key
                );
                expect((error as DomainError).message).toContain('received: string');
            }
        });

        test('should throw CONFIG_TYPE domain error when config is not an object - number', async () => {
            // Arrange
            const inputConfig = 123;

            // Act & Assert
            await expect(parseConfig(inputConfig)).rejects.toThrow(DomainError);

            try {
                await parseConfig(inputConfig);
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_TYPE.key
                );
                expect((error as DomainError).message).toContain('received: number');
            }
        });

        test('should throw CONFIG_TYPE domain error when config is not an object - boolean', async () => {
            // Arrange
            const inputConfig = true;

            // Act & Assert
            await expect(parseConfig(inputConfig)).rejects.toThrow(DomainError);

            try {
                await parseConfig(inputConfig);
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_TYPE.key
                );
                expect((error as DomainError).message).toContain('received: boolean');
            }
        });

        test('should throw CONFIG_TYPE domain error when config is undefined', async () => {
            // Arrange
            const inputConfig = undefined;

            // Act & Assert
            await expect(parseConfig(inputConfig)).rejects.toThrow(DomainError);

            try {
                await parseConfig(inputConfig);
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_TYPE.key
                );
                expect((error as DomainError).message).toContain('received: undefined');
            }
        });

        test('should re-throw DomainError instances without wrapping', async () => {
            // Arrange
            const customDomainError = new DomainError({
                key: 'CUSTOM_ERROR',
                message: 'Custom domain error',
            });

            mockGetDefaultConfiguration.mockImplementation(() => {
                throw customDomainError;
            });

            // Act & Assert
            await expect(parseConfig({})).rejects.toThrow(customDomainError);
            await expect(parseConfig({})).rejects.toThrow('Custom domain error');
        });

        test('should wrap generic Error with CONFIG_PARSE domain error', async () => {
            // Arrange
            const genericError = new Error('Generic parsing error');

            mockGetDefaultConfiguration.mockImplementation(() => {
                throw genericError;
            });

            // Act & Assert
            await expect(parseConfig({})).rejects.toThrow(DomainError);

            try {
                await parseConfig({});
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_PARSE.key
                );
                expect((error as DomainError).cause).toBe(genericError);
            }
        });

        test('should wrap non-Error objects with CONFIG_PARSE domain error', async () => {
            // Arrange
            const nonErrorObject = 'some string error';

            mockGetDefaultConfiguration.mockImplementation(() => {
                throw nonErrorObject;
            });

            // Act & Assert
            await expect(parseConfig({})).rejects.toThrow(DomainError);

            try {
                await parseConfig({});
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect((error as DomainError).domainErrorInfo.key).toBe(
                    CONFIG_DOMAIN_ERRORS.CONFIG_PARSE.key
                );
                expect((error as DomainError).message).toContain('some string error');
            }
        });
    });

    describe('Edge cases and boundary conditions', () => {
        test('should handle arrays as valid input (arrays are objects in JavaScript)', async () => {
            // Arrange
            const inputConfig: unknown[] = [];

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result).toEqual(expect.objectContaining(mockDefaultConfig));
        });

        test('should handle Date objects as valid input', async () => {
            // Arrange
            const inputConfig = new Date();

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result).toEqual(expect.objectContaining(mockDefaultConfig));
        });

        test('should handle objects with prototype chain', async () => {
            // Arrange
            class CustomConfig {
                public targetDirectoryPath = '/custom';
                public silentMode = true;
            }
            const inputConfig = new CustomConfig();

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result.targetDirectoryPath).toBe('/custom');
            expect(result.silentMode).toBe(true);
        });

        test('should handle objects with null properties', async () => {
            // Arrange
            const inputConfig = {
                targetDirectoryPath: null,
                operations: null,
            };

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result.targetDirectoryPath).toBe(null);
            expect(result.operations).toBe(null);
        });

        test('should handle objects with undefined properties', async () => {
            // Arrange
            const inputConfig = {
                targetDirectoryPath: undefined,
                operations: undefined,
            };

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(result.targetDirectoryPath).toBe(undefined);
            expect(result.operations).toBe(undefined);
        });

        test('should preserve all property types from input config', async () => {
            // Arrange
            const inputConfig = {
                targetDirectoryPath: '/path',
                silentMode: true,
                fileCountPromptThreshold: 500,
                operations: [{ type: 'symlink' }],
                postExecutionCommands: [{ command: 'test' }],
            };

            // Act
            const result = await parseConfig(inputConfig);

            // Assert
            expect(typeof result.targetDirectoryPath).toBe('string');
            expect(typeof result.silentMode).toBe('boolean');
            expect(typeof result.fileCountPromptThreshold).toBe('number');
            expect(Array.isArray(result.operations)).toBe(true);
            expect(Array.isArray(result.postExecutionCommands)).toBe(true);
        });
    });

    describe('Promise behavior and async handling', () => {
        test('should return a Promise that resolves', async () => {
            // Arrange
            const inputConfig = {};

            // Act
            const result = parseConfig(inputConfig);

            // Assert
            expect(result).toBeInstanceOf(Promise);
            await expect(result).resolves.toBeDefined();
        });

        test('should return a Promise that rejects for invalid input', async () => {
            // Arrange
            const inputConfig = null;

            // Act
            const result = parseConfig(inputConfig);

            // Assert
            expect(result).toBeInstanceOf(Promise);
            await expect(result).rejects.toThrow(DomainError);
        });

        test('should handle async errors properly', async () => {
            // Arrange
            mockGetDefaultConfiguration.mockImplementation(() => {
                throw new Error('Async error');
            });

            // Act & Assert
            await expect(parseConfig({})).rejects.toThrow(DomainError);
        });
    });
});
