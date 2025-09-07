import { ConfigParserService } from './config-parser.service';
import { LoggerService } from '../../logging/logger.service';
import * as normalizeConfigPathsFunction from './config-parser/normalize-config-paths.function';
import * as parseConfigFunction from './config-parser/parse-config.function';
import * as validateConfigFunction from './config-parser/validate-config.function';
import type { FileSystemOperationConfig } from './types/core/file-system-operation-config.interface';
import { DomainError } from '../../common';

jest.mock('../../logging/logger.service');
jest.mock('./config-parser/normalize-config-paths.function');
jest.mock('./config-parser/parse-config.function');
jest.mock('./config-parser/validate-config.function');

describe('config-parser.service', () => {
    let serviceUnderTest: ConfigParserService;
    let mockLoggerService: jest.Mocked<LoggerService>;
    let mockNormalizeConfigPaths: jest.MockedFunction<
        typeof normalizeConfigPathsFunction.normalizeConfigPaths
    >;
    let mockParseConfig: jest.MockedFunction<typeof parseConfigFunction.parseConfig>;
    let mockValidateConfig: jest.MockedFunction<typeof validateConfigFunction.validateConfig>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocked dependencies
        mockLoggerService = new LoggerService({} as any, {} as any) as jest.Mocked<LoggerService>;
        mockNormalizeConfigPaths =
            normalizeConfigPathsFunction.normalizeConfigPaths as jest.MockedFunction<
                typeof normalizeConfigPathsFunction.normalizeConfigPaths
            >;
        mockParseConfig = parseConfigFunction.parseConfig as jest.MockedFunction<
            typeof parseConfigFunction.parseConfig
        >;
        mockValidateConfig = validateConfigFunction.validateConfig as jest.MockedFunction<
            typeof validateConfigFunction.validateConfig
        >;

        // Create service instance with mocked dependencies
        serviceUnderTest = new ConfigParserService(mockLoggerService);
    });

    describe('Construction', () => {
        test('should construct successfully with injected logger service', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(ConfigParserService);
            expect(serviceUnderTest).toBeDefined();
        });
    });

    describe('Configuration parsing orchestration', () => {
        const mockConfigData = {
            targetDirectoryPath: './test',
            defaultOverwriteBehavior: 'overwrite' as const,
            operations: [],
            fileCountPromptThreshold: 100,
        };

        const mockParsedConfig: FileSystemOperationConfig = {
            targetDirectoryPath: './test',
            defaultOverwriteBehavior: 'overwrite',
            operations: [],
            postExecutionCommands: [],
            fileCountPromptThreshold: 100,
            silentMode: false,
            enableSourceDeduplication: false,
            disableCommandValidation: false,
            disableRegexValidation: false,
        };

        const mockNormalizedConfig: FileSystemOperationConfig = {
            ...mockParsedConfig,
            targetDirectoryPath: 'test',
        };

        test('should successfully parse and validate configuration', async () => {
            // Arrange
            mockParseConfig.mockResolvedValue(mockParsedConfig);
            mockNormalizeConfigPaths.mockReturnValue(mockNormalizedConfig);
            mockValidateConfig.mockResolvedValue(undefined);

            // Act
            const result = await serviceUnderTest.parseConfiguration(mockConfigData);

            // Assert
            expect(result).toEqual(mockNormalizedConfig);
            expect(mockParseConfig).toHaveBeenCalledWith(mockConfigData);
            expect(mockNormalizeConfigPaths).toHaveBeenCalledWith(mockParsedConfig);
            expect(mockValidateConfig).toHaveBeenCalledWith(mockNormalizedConfig);
        });

        test('should log silent mode configuration when silentMode is enabled', async () => {
            // Arrange
            const silentModeConfig = {
                ...mockNormalizedConfig,
                silentMode: true,
                defaultOverwriteBehavior: 'skip' as const,
                fileCountPromptThreshold: 500,
            };

            mockParseConfig.mockResolvedValue(mockParsedConfig);
            mockNormalizeConfigPaths.mockReturnValue(silentModeConfig);
            mockValidateConfig.mockResolvedValue(undefined);

            // Act
            await serviceUnderTest.parseConfiguration(mockConfigData);

            // Assert
            expect(mockLoggerService.info).toHaveBeenCalledWith('[Silent Mode] enabled', {
                operation: 'configurationParsing',
                defaultOverwriteBehavior: 'skip',
                symlinkCountPromptThreshold: 500,
            });
        });

        test('should not log when silentMode is disabled', async () => {
            // Arrange
            mockParseConfig.mockResolvedValue(mockParsedConfig);
            mockNormalizeConfigPaths.mockReturnValue(mockNormalizedConfig);
            mockValidateConfig.mockResolvedValue(undefined);

            // Act
            await serviceUnderTest.parseConfiguration(mockConfigData);

            // Assert
            expect(mockLoggerService.info).not.toHaveBeenCalled();
        });
    });

    describe('Error handling scenarios', () => {
        const mockConfigData = { test: 'data' };

        test('should handle parseConfig function errors', async () => {
            // Arrange
            const parseError = new Error('Parse failed');
            mockParseConfig.mockRejectedValue(parseError);

            // Act & Assert
            await expect(serviceUnderTest.parseConfiguration(mockConfigData)).rejects.toThrow(
                'Parse failed'
            );

            expect(mockParseConfig).toHaveBeenCalledWith(mockConfigData);
            expect(mockNormalizeConfigPaths).not.toHaveBeenCalled();
            expect(mockValidateConfig).not.toHaveBeenCalled();
        });

        test('should handle validation errors and log debug message', async () => {
            // Arrange
            const mockParsedConfig: FileSystemOperationConfig = {
                targetDirectoryPath: './test',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 100,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            const mockNormalizedConfig = mockParsedConfig;
            const validationError = new DomainError({
                key: 'CONFIG_VALIDATION_ERROR',
                message: 'Configuration validation failed',
                description: 'Target directory path is required and invalid operation type',
            });

            mockParseConfig.mockResolvedValue(mockParsedConfig);
            mockNormalizeConfigPaths.mockReturnValue(mockNormalizedConfig);
            mockValidateConfig.mockRejectedValue(validationError);

            // Act & Assert
            await expect(serviceUnderTest.parseConfiguration(mockConfigData)).rejects.toThrow(
                validationError
            );
        });

        test('should handle validation function throwing errors', async () => {
            // Arrange
            const mockParsedConfig: FileSystemOperationConfig = {
                targetDirectoryPath: './test',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 100,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            const mockNormalizedConfig = mockParsedConfig;
            const validationError = new Error('Validation function failed');

            mockParseConfig.mockResolvedValue(mockParsedConfig);
            mockNormalizeConfigPaths.mockReturnValue(mockNormalizedConfig);
            mockValidateConfig.mockRejectedValue(validationError);

            // Act & Assert
            await expect(serviceUnderTest.parseConfiguration(mockConfigData)).rejects.toThrow(
                'Validation function failed'
            );

            expect(mockValidateConfig).toHaveBeenCalledWith(mockNormalizedConfig);
        });
    });

    describe('Function coordination and orchestration', () => {
        test('should call functions in correct order', async () => {
            // Arrange
            const mockConfigData = { test: 'data' };
            const mockParsedConfig: FileSystemOperationConfig = {
                targetDirectoryPath: './test',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 100,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            const mockNormalizedConfig = mockParsedConfig;
            const callOrder: string[] = [];

            mockParseConfig.mockImplementation(async _data => {
                callOrder.push('parseConfig');
                return mockParsedConfig;
            });

            mockNormalizeConfigPaths.mockImplementation(_config => {
                callOrder.push('normalizeConfigPaths');
                return mockNormalizedConfig;
            });

            mockValidateConfig.mockImplementation(async _config => {
                callOrder.push('validateConfig');
                return undefined;
            });

            // Act
            await serviceUnderTest.parseConfiguration(mockConfigData);

            // Assert
            expect(callOrder).toEqual(['parseConfig', 'normalizeConfigPaths', 'validateConfig']);
        });

        test('should pass correct data between function calls', async () => {
            // Arrange
            const mockConfigData = { test: 'input' };
            const mockParsedConfig: FileSystemOperationConfig = {
                targetDirectoryPath: './parsed',
                defaultOverwriteBehavior: 'overwrite',
                operations: [],
                postExecutionCommands: [],
                fileCountPromptThreshold: 100,
                silentMode: false,
                enableSourceDeduplication: false,
                disableCommandValidation: false,
                disableRegexValidation: false,
            };

            const mockNormalizedConfig: FileSystemOperationConfig = {
                ...mockParsedConfig,
                targetDirectoryPath: 'normalized',
            };

            mockParseConfig.mockResolvedValue(mockParsedConfig);
            mockNormalizeConfigPaths.mockReturnValue(mockNormalizedConfig);
            mockValidateConfig.mockResolvedValue(undefined);

            // Act
            const result = await serviceUnderTest.parseConfiguration(mockConfigData);

            // Assert
            expect(mockParseConfig).toHaveBeenCalledWith(mockConfigData);
            expect(mockNormalizeConfigPaths).toHaveBeenCalledWith(mockParsedConfig);
            expect(mockValidateConfig).toHaveBeenCalledWith(mockNormalizedConfig);
            expect(result).toBe(mockNormalizedConfig);
        });
    });
});
