import * as path from 'path';
import * as vscode from 'vscode';
import mockFs from 'mock-fs';
import { executeWorkflow } from './execute-workflow.function';
import { ExecuteWorkflowParams } from '../types/execute-workflow-params.interface';
import { DomainError } from '../../../common';

jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
    },
}));

describe('execute-workflow.function', () => {
    let mockParams: ExecuteWorkflowParams;
    let mockProgress: jest.Mocked<vscode.Progress<{ increment?: number; message?: string }>>;
    let mockWindow: any;
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with expected structure
        mockFs({
            [tmpRoot]: {
                source: {
                    'file1.txt': 'content1',
                    'file2.txt': 'content2',
                    subdir: {
                        'file3.txt': 'content3',
                    },
                },
                target: {},
                workspace: {
                    'config.json': JSON.stringify({
                        targetDirectoryPath: 'relative/target',
                        operations: [],
                    }),
                },
            },
            // Preserve node_modules for Jest functionality
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    afterAll(() => {
        mockFs.restore();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset the VS Code window mock functions
        mockWindow = vscode.window as any;
        mockWindow.showInformationMessage.mockResolvedValue(undefined);
        mockWindow.showErrorMessage.mockResolvedValue(undefined);

        // Mock progress reporter
        mockProgress = {
            report: jest.fn(),
        } as jest.Mocked<vscode.Progress<{ increment?: number; message?: string }>>;

        // Setup mock services
        mockParams = {
            configData: {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [],
            },
            logger: {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
            } as any,
            configParserService: {
                parseConfiguration: jest.fn().mockResolvedValue({
                    targetDirectoryPath: path.join(tmpRoot, 'target'),
                    operations: [],
                }),
            } as any,
            copyManagerService: {
                copyDirectories: jest.fn().mockResolvedValue([]),
                copyFiles: jest.fn().mockResolvedValue([]),
            } as any,
            linkManagerService: {
                createDirectorySymlink: jest.fn().mockResolvedValue(true),
                createFileLink: jest.fn().mockResolvedValue(true),
            } as any,
            commandExecutorService: {
                executeCommand: jest.fn().mockResolvedValue(true),
            } as any,
            fileDiscoveryService: {
                discoverFiles: jest.fn().mockResolvedValue([]),
                discoverDirectories: jest.fn().mockResolvedValue([]),
                countFilesInDirectories: jest.fn().mockResolvedValue(0),
            } as any,
            attributeAdjustmentService: {
                processFileAttributeAdjustments: jest.fn().mockResolvedValue(true),
            } as any,
            progress: mockProgress,
            initialProgressIncrement: 10,
            workspaceRoot: path.join(tmpRoot, 'workspace'),
        };
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof executeWorkflow).toBe('function');
        });
    });

    describe('Configuration parsing and validation', () => {
        test('should parse and validate configuration successfully', async () => {
            // Arrange
            const configData = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [],
            };
            mockParams.configData = configData;

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.configParserService.parseConfiguration).toHaveBeenCalledWith(
                configData
            );
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 0,
                message: 'Parsing and validating configuration...',
            });
        });

        test('should convert relative target path to absolute using workspace root', async () => {
            // Arrange
            mockParams.configParserService.parseConfiguration = jest.fn().mockResolvedValue({
                targetDirectoryPath: 'relative/target',
                operations: [],
            });

            // Act
            await executeWorkflow(mockParams);

            // Assert
            expect(mockParams.logger.debug).toHaveBeenCalledWith(
                'Converted relative path to absolute using workspace root',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                    filePath: 'relative/target',
                    workingDirectory: mockParams.workspaceRoot,
                })
            );
        });

        test('should handle configuration parsing errors', async () => {
            // Arrange
            const configError = new DomainError({
                key: 'CONFIG_PARSE_ERROR',
                message: 'Invalid configuration',
                description: 'Configuration validation failed',
            });
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockRejectedValue(configError);

            // Act & Assert
            await expect(executeWorkflow(mockParams)).rejects.toThrow(configError);
        });
    });

    describe('Progress reporting', () => {
        test('should report progress throughout workflow execution', async () => {
            // Act
            await executeWorkflow(mockParams);

            // Assert
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 0,
                message: 'Parsing and validating configuration...',
            });
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 10,
                message: 'Configuration validation successful',
            });
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 100,
                message: 'Workflow completed successfully',
            });
        });

        test('should calculate progress based on total operations', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
                postExecutionCommands: [{ command: 'echo test', cwd: '.' }],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            // Act
            await executeWorkflow(mockParams);

            // Assert
            expect(mockProgress.report).toHaveBeenCalledTimes(6); // Initial, validation, operations, attributes, post-commands, completion
        });
    });

    describe('File system operations execution', () => {
        test('should execute file operations when operations are configured', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([
                    path.join(tmpRoot, 'source', 'file1.txt'),
                    path.join(tmpRoot, 'source', 'file2.txt'),
                ]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.fileDiscoveryService.discoverFiles).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source'),
                [{ patternType: 'glob', pattern: '*.txt' }]
            );
            expect(mockParams.linkManagerService.createFileLink).toHaveBeenCalledTimes(2);
        });

        test('should execute directory operations when directories are configured', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'directory' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverDirectories = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'subdir')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.fileDiscoveryService.discoverDirectories).toHaveBeenCalled();
            expect(mockParams.linkManagerService.createDirectorySymlink).toHaveBeenCalledTimes(1);
        });

        test('should handle copy operations for files', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'copy' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.copyManagerService.copyFiles).toHaveBeenCalled();
        });

        test('should handle copy operations for directories', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'directory' as const,
                        action: 'copy' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverDirectories = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'subdir')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.copyManagerService.copyDirectories).toHaveBeenCalled();
        });

        test('should retain duplicate source paths with unique destination overrides', async () => {
            // Arrange
            const baseDirectoryPath = path.join(tmpRoot, 'source');
            const targetDirectoryPath = path.join(tmpRoot, 'target');
            const operationDestinationPath = 'custom/base';
            const mappingEntryA = {
                sourcePath: 'docs/file.txt',
                destinationPath: 'renamed/version-a.txt',
            } as const;
            const mappingEntryB = {
                sourcePath: 'docs/file.txt',
                destinationPath: 'renamed/version-b.txt',
            } as const;
            const discoveredSourcePath = path.join(baseDirectoryPath, mappingEntryA.sourcePath);

            const mockConfig = {
                targetDirectoryPath,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'copy' as const,
                        baseDirectoryPath,
                        destinationPath: operationDestinationPath,
                        searchPatterns: [
                            {
                                patternType: 'path' as const,
                                pattern: [mappingEntryA, mappingEntryB],
                            },
                        ],
                    },
                ],
            };

            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValueOnce([discoveredSourcePath])
                .mockResolvedValueOnce([discoveredSourcePath]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.copyManagerService.copyFiles).toHaveBeenCalledTimes(1);

            const copyFilesArgs = mockParams.copyManagerService.copyFiles as jest.Mock;
            const operations = copyFilesArgs.mock.calls[0][0] as Array<{
                sourcePath: string;
                destinationPath: string;
            }>;

            expect(operations).toHaveLength(2);
            const destinationPaths = operations.map(operation => operation.destinationPath);
            const expectedDestinationA = path.resolve(
                targetDirectoryPath,
                operationDestinationPath,
                mappingEntryA.destinationPath
            );
            const expectedDestinationB = path.resolve(
                targetDirectoryPath,
                operationDestinationPath,
                mappingEntryB.destinationPath
            );

            expect(destinationPaths).toEqual(
                expect.arrayContaining([expectedDestinationA, expectedDestinationB])
            );
            operations.forEach(operation => {
                expect(operation.sourcePath).toBe(discoveredSourcePath);
            });
        });

        test('should deduplicate duplicate source paths sharing destination overrides', async () => {
            // Arrange
            const baseDirectoryPath = path.join(tmpRoot, 'source');
            const targetDirectoryPath = path.join(tmpRoot, 'target');
            const operationDestinationPath = 'custom/base';
            const mappingEntryA = {
                sourcePath: 'docs/file.txt',
                destinationPath: 'renamed/shared.txt',
            } as const;
            const mappingEntryB = {
                sourcePath: 'docs/file.txt',
                destinationPath: 'renamed/shared.txt',
            } as const;
            const discoveredSourcePath = path.join(baseDirectoryPath, mappingEntryA.sourcePath);

            const mockConfig = {
                targetDirectoryPath,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'copy' as const,
                        baseDirectoryPath,
                        destinationPath: operationDestinationPath,
                        searchPatterns: [
                            {
                                patternType: 'path' as const,
                                pattern: [mappingEntryA, mappingEntryB],
                            },
                        ],
                    },
                ],
            };

            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValueOnce([discoveredSourcePath])
                .mockResolvedValueOnce([discoveredSourcePath]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.copyManagerService.copyFiles).toHaveBeenCalledTimes(1);

            const copyFilesArgs = mockParams.copyManagerService.copyFiles as jest.Mock;
            const operations = copyFilesArgs.mock.calls[0][0] as Array<{
                sourcePath: string;
                destinationPath: string;
            }>;

            expect(operations).toHaveLength(1);
            const [operation] = operations;
            expect(operation).toBeDefined();
            expect(operation?.sourcePath).toBe(discoveredSourcePath);
            expect(operation?.destinationPath).toBe(
                path.resolve(
                    targetDirectoryPath,
                    operationDestinationPath,
                    mappingEntryA.destinationPath
                )
            );
        });

        describe('path mapping entries', () => {
            test('should apply destination overrides from path mapping search patterns', async () => {
                // Arrange
                const baseDirectoryPath = path.join(tmpRoot, 'source');
                const targetDirectoryPath = path.join(tmpRoot, 'target');
                const operationDestinationPath = 'custom/base';
                const mappingEntry = {
                    sourcePath: 'docs/file1.txt',
                    destinationPath: 'renamed/file1-renamed.txt',
                } as const;
                const regularPath = 'docs/file2.txt';
                const mockConfig = {
                    targetDirectoryPath,
                    operations: [
                        {
                            itemType: 'file' as const,
                            action: 'copy' as const,
                            baseDirectoryPath,
                            destinationPath: operationDestinationPath,
                            searchPatterns: [
                                {
                                    patternType: 'path' as const,
                                    pattern: [mappingEntry, regularPath],
                                },
                            ],
                        },
                    ],
                };

                const discoveredRegularPath = path.join(baseDirectoryPath, regularPath);
                const discoveredMappingPath = path.join(baseDirectoryPath, mappingEntry.sourcePath);

                mockParams.configParserService.parseConfiguration = jest
                    .fn()
                    .mockResolvedValue(mockConfig);

                mockParams.fileDiscoveryService.discoverFiles = jest
                    .fn()
                    .mockResolvedValueOnce([discoveredRegularPath])
                    .mockResolvedValueOnce([discoveredMappingPath]);

                // Act
                const result = await executeWorkflow(mockParams);

                // Assert
                expect(result).toBe(true);
                expect(mockParams.fileDiscoveryService.discoverFiles).toHaveBeenCalledTimes(2);

                const discoverFilesMock = mockParams.fileDiscoveryService
                    .discoverFiles as jest.Mock;
                const [regularCallArgs, mappingCallArgs] = discoverFilesMock.mock.calls;
                const regularPatterns = regularCallArgs[1] as Array<{ pattern: unknown }>;
                const mappingPatterns = mappingCallArgs[1] as Array<{ pattern: unknown }>;

                const regularPatternsContainMappingEntries = regularPatterns.some(
                    ({ pattern: patternValue }) => {
                        if (Array.isArray(patternValue)) {
                            return patternValue.some(value => {
                                if (typeof value !== 'object' || value === null) {
                                    return false;
                                }

                                return 'sourcePath' in (value as Record<string, unknown>);
                            });
                        }

                        if (typeof patternValue !== 'object' || patternValue === null) {
                            return false;
                        }

                        return 'sourcePath' in (patternValue as Record<string, unknown>);
                    }
                );

                expect(regularPatternsContainMappingEntries).toBe(false);
                expect(mappingPatterns).toHaveLength(1);
                const mappingPatternEntry = mappingPatterns[0];
                expect(mappingPatternEntry).toBeDefined();
                expect(mappingPatternEntry?.pattern).toEqual(expect.objectContaining(mappingEntry));

                expect(mockParams.copyManagerService.copyFiles).toHaveBeenCalledTimes(1);
                const copyFilesMock = mockParams.copyManagerService.copyFiles as jest.Mock;
                const copyOperations = copyFilesMock.mock.calls[0][0] as Array<{
                    destinationPath: string;
                    sourcePath: string;
                }>;

                expect(copyOperations).toHaveLength(2);

                const mappingOperation = copyOperations.find(operation => {
                    return operation.sourcePath === discoveredMappingPath;
                });
                expect(mappingOperation).toBeDefined();
                expect(mappingOperation?.destinationPath).toBe(
                    path.resolve(
                        targetDirectoryPath,
                        operationDestinationPath,
                        mappingEntry.destinationPath
                    )
                );

                const regularOperation = copyOperations.find(operation => {
                    return operation.sourcePath === discoveredRegularPath;
                });
                expect(regularOperation).toBeDefined();
                expect(regularOperation?.destinationPath).toBe(
                    path.resolve(
                        targetDirectoryPath,
                        operationDestinationPath,
                        path.relative(baseDirectoryPath, discoveredRegularPath)
                    )
                );
            });
        });
    });

    describe('Deduplication handling', () => {
        test('should perform deduplication when enabled', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                enableSourceDeduplication: true,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest.fn().mockResolvedValue([
                path.join(tmpRoot, 'source', 'file1.txt'),
                path.join(tmpRoot, 'source', 'file1.txt'), // Duplicate
            ]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.logger.debug).toHaveBeenCalledWith(
                'Operation deduplication started',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                })
            );
        });

        test('should skip deduplication when disabled', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                enableSourceDeduplication: false,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.logger.debug).toHaveBeenCalledWith(
                'Operation deduplication skipped for performance',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                })
            );
        });
    });

    describe('File count threshold handling', () => {
        test('should prompt user when file count exceeds threshold', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                fileCountPromptThreshold: 1,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([
                    path.join(tmpRoot, 'source', 'file1.txt'),
                    path.join(tmpRoot, 'source', 'file2.txt'),
                ]);
            mockWindow.showInformationMessage.mockResolvedValue('Continue');

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'FS link manager will create 2 links with files. Do you want to continue?',
                { modal: true },
                'Continue'
            );
        });

        test('should cancel workflow when user cancels file count prompt', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                fileCountPromptThreshold: 1,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([
                    path.join(tmpRoot, 'source', 'file1.txt'),
                    path.join(tmpRoot, 'source', 'file2.txt'),
                ]);
            mockWindow.showInformationMessage.mockResolvedValue('Cancel');

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(false);
            expect(mockParams.logger.info).toHaveBeenCalledWith(
                'Workflow cancelled by user during symlink count confirmation',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                })
            );
        });
    });

    describe('File attribute adjustments', () => {
        test('should process file attribute adjustments when configured', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                        fileAttributeAdjustment: {
                            readonly: true,
                        },
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(
                mockParams.attributeAdjustmentService.processFileAttributeAdjustments
            ).toHaveBeenCalled();
        });

        test('should skip file attribute adjustments when none configured', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.logger.debug).toHaveBeenCalledWith(
                'No file attribute adjustments required',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                })
            );
        });
    });

    describe('Post-execution commands', () => {
        test('should execute post-execution commands when configured', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [],
                postExecutionCommands: [
                    { command: 'echo test', cwd: '.' },
                    { command: 'ls -la', cwd: '/absolute/path' },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.commandExecutorService.executeCommand).toHaveBeenCalledTimes(2);
            expect(mockParams.commandExecutorService.executeCommand).toHaveBeenCalledWith(
                path.join(tmpRoot, 'target'),
                {
                    command: 'echo test',
                    cwd: path.join(tmpRoot, 'target', '.'),
                }
            );
            expect(mockParams.commandExecutorService.executeCommand).toHaveBeenCalledWith(
                path.join(tmpRoot, 'target'),
                {
                    command: 'ls -la',
                    cwd: '/absolute/path',
                }
            );
        });

        test('should handle failed post-execution commands gracefully', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [],
                postExecutionCommands: [{ command: 'failing-command', cwd: '.' }],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.commandExecutorService.executeCommand = jest.fn().mockResolvedValue(false);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.logger.warn).toHaveBeenCalledWith(
                'Post-execution command failed',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                    command: 'failing-command',
                })
            );
        });

        test('should skip post-execution commands when none configured', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.commandExecutorService.executeCommand).not.toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        test('should handle workflow cancellation', async () => {
            // Arrange
            const cancellationError = new Error('Workflow cancelled by user');
            mockParams.configParserService.parseConfiguration = jest.fn().mockResolvedValue({
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            });

            // Mock file discovery to return files
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file.txt')]);

            // Mock the linkManagerService to throw cancellation error
            mockParams.linkManagerService.createFileLink = jest
                .fn()
                .mockRejectedValue(cancellationError);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(false);
        });

        test('should propagate other errors', async () => {
            // Arrange
            const operationError = new Error('Operation failed');
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockRejectedValue(operationError);

            // Act & Assert
            await expect(executeWorkflow(mockParams)).rejects.toThrow('Operation failed');
        });

        test('should handle symlink creation failures', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);
            mockParams.linkManagerService.createFileLink = jest
                .fn()
                .mockRejectedValue(new Error('Symlink failed'));

            // Act & Assert
            await expect(executeWorkflow(mockParams)).rejects.toThrow('Symlink failed');
        });
    });

    describe('User confirmation functions', () => {
        test('should handle symlink overwrite behavior in silent mode', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                silentMode: true,
                defaultOverwriteBehavior: 'overwrite' as const,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Mock link creation to trigger overwrite behavior
            mockParams.linkManagerService.createFileLink = jest
                .fn()
                .mockImplementation(async (source, target, options) => {
                    // Simulate overwrite behavior call
                    const behavior = await options.handleOverwriteBehaviorFunc(
                        source,
                        target,
                        'existing'
                    );
                    expect(behavior).toBe('overwrite');
                    return true;
                });

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle symlink overwrite behavior with user prompt - overwrite', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                silentMode: false,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);
            mockWindow.showInformationMessage.mockResolvedValue('Replace symlink');

            // Mock link creation to trigger overwrite behavior
            mockParams.linkManagerService.createFileLink = jest
                .fn()
                .mockImplementation(async (source, target, options) => {
                    const behavior = await options.handleOverwriteBehaviorFunc(
                        source,
                        target,
                        'existing'
                    );
                    expect(behavior).toBe('overwrite');
                    return true;
                });

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('A symlink already exists at'),
                { modal: true },
                'Replace symlink',
                'Skip (leave existing)',
                'Cancel (abort operation)'
            );
        });

        test('should handle symlink overwrite behavior with user prompt - skip', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                silentMode: false,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);
            mockWindow.showInformationMessage.mockResolvedValue('Skip (leave existing)');

            // Mock link creation to trigger overwrite behavior
            mockParams.linkManagerService.createFileLink = jest
                .fn()
                .mockImplementation(async (source, target, options) => {
                    const behavior = await options.handleOverwriteBehaviorFunc(
                        source,
                        target,
                        'existing'
                    );
                    expect(behavior).toBe('skip');
                    return true;
                });

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle symlink overwrite behavior with user prompt - error', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                silentMode: false,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);
            mockWindow.showInformationMessage.mockResolvedValue(undefined); // User cancelled

            // Mock link creation to trigger overwrite behavior
            mockParams.linkManagerService.createFileLink = jest
                .fn()
                .mockImplementation(async (source, target, options) => {
                    const behavior = await options.handleOverwriteBehaviorFunc(
                        source,
                        target,
                        'existing'
                    );
                    expect(behavior).toBe('error');
                    return true;
                });

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle file attribute backup overwrite behavior in silent mode', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                silentMode: true,
                defaultOverwriteBehavior: 'skip' as const,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                        fileAttributeAdjustment: {
                            readonly: true,
                        },
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Mock attribute adjustment to trigger backup overwrite behavior
            mockParams.attributeAdjustmentService.processFileAttributeAdjustments = jest
                .fn()
                .mockImplementation(async entries => {
                    const behavior = await entries[0].handleOverwriteBehaviorFunc([
                        'backup1.txt',
                        'backup2.txt',
                    ]);
                    expect(behavior).toBe('skip');
                    return true;
                });

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
        });

        test('should handle file attribute backup overwrite behavior with user prompt', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                silentMode: false,
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                        fileAttributeAdjustment: {
                            readonly: true,
                        },
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);
            mockWindow.showInformationMessage.mockResolvedValue('Replace backup files');

            // Mock attribute adjustment to trigger backup overwrite behavior
            mockParams.attributeAdjustmentService.processFileAttributeAdjustments = jest
                .fn()
                .mockImplementation(async entries => {
                    const behavior = await entries[0].handleOverwriteBehaviorFunc(['backup1.txt']);
                    expect(behavior).toBe('overwrite');
                    return true;
                });

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Backup files already exist at'),
                { modal: true },
                'Replace backup files',
                'Skip (keep existing)'
            );
        });
    });

    describe('Hardlink operations', () => {
        test('should handle hardlink operations', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'hardlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.linkManagerService.createFileLink).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                expect.stringContaining('file1.txt'),
                expect.objectContaining({
                    action: 'hardlink',
                    itemType: 'file',
                })
            );
        });
    });

    describe('Directory operations with missing search patterns', () => {
        test('should handle directory operations without search patterns', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'directory' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        // No searchPatterns - should be skipped
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.fileDiscoveryService.discoverDirectories).not.toHaveBeenCalled();
        });
    });

    describe('Workflow completion', () => {
        test('should complete workflow successfully with empty operations', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.logger.info).toHaveBeenCalledWith(
                'Workflow execution completed successfully',
                expect.objectContaining({
                    operation: 'executeWorkflow',
                })
            );
        });

        test('should log completion with correct operation count', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 100,
                message: 'Workflow completed successfully',
            });
        });

        test('should handle progress reporting for periodic symlink updates', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);

            // Create 15 files to trigger periodic progress updates (every 10 files)
            const files = Array.from({ length: 15 }, (_, i) =>
                path.join(tmpRoot, 'source', `file${i}.txt`)
            );
            mockParams.fileDiscoveryService.discoverFiles = jest.fn().mockResolvedValue(files);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.linkManagerService.createFileLink).toHaveBeenCalledTimes(15);
            // Should have progress updates at 10th and 15th operations
            expect(mockProgress.report).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Completed steps 10/15'),
                })
            );
        });

        test('should handle destinationPath in operations', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'symlink' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        destinationPath: 'custom/destination',
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockParams.linkManagerService.createFileLink).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                path.join(tmpRoot, 'target', 'custom', 'destination', 'file1.txt'),
                expect.objectContaining({
                    action: 'symlink',
                    itemType: 'file',
                })
            );
        });
    });

    describe('Copy operation error handling', () => {
        test('should handle copy operation errors and prompt user', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'copy' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Mock copy operation failure
            const copyError = new Error('Copy failed');
            mockParams.copyManagerService.copyFiles = jest.fn().mockResolvedValue([
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    targetPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    status: 'error',
                    error: copyError,
                },
            ]);

            mockWindow.showInformationMessage.mockResolvedValue('Continue');

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(true);
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Some copy operations failed for 1 items:'),
                { modal: true },
                'Continue',
                'Show Details'
            );
        });

        test('should cancel workflow when user chooses not to continue after copy errors', async () => {
            // Arrange
            const mockConfig = {
                targetDirectoryPath: path.join(tmpRoot, 'target'),
                operations: [
                    {
                        itemType: 'file' as const,
                        action: 'copy' as const,
                        baseDirectoryPath: path.join(tmpRoot, 'source'),
                        searchPatterns: [{ patternType: 'glob' as const, pattern: '*.txt' }],
                    },
                ],
            };
            mockParams.configParserService.parseConfiguration = jest
                .fn()
                .mockResolvedValue(mockConfig);
            mockParams.fileDiscoveryService.discoverFiles = jest
                .fn()
                .mockResolvedValue([path.join(tmpRoot, 'source', 'file1.txt')]);

            // Mock copy operation failure
            const copyError = new Error('Copy failed');
            mockParams.copyManagerService.copyFiles = jest.fn().mockResolvedValue([
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    targetPath: path.join(tmpRoot, 'target', 'file1.txt'),
                    status: 'error',
                    error: copyError,
                },
            ]);

            mockWindow.showInformationMessage.mockResolvedValue(undefined); // User cancelled

            // Act
            const result = await executeWorkflow(mockParams);

            // Assert
            expect(result).toBe(false);
        });
    });
});
