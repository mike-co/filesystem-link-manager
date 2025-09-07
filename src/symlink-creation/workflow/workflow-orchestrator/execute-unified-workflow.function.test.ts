import * as vscode from 'vscode';
import { DomainError } from '../../../common';
import { executeUnifiedWorkflow } from './execute-unified-workflow.function';
import * as executeWorkflowFunction from './execute-workflow.function';
import * as fsExtra from 'fs-extra';

jest.mock('vscode');
jest.mock('./execute-workflow.function');
jest.mock('fs-extra');

describe('execute-unified-workflow.function', () => {
    let mockProgress: jest.Mocked<vscode.Progress<{ increment?: number; message?: string }>>;
    let mockExecuteWorkflow: jest.MockedFunction<typeof executeWorkflowFunction.executeWorkflow>;
    let mockReadJson: jest.MockedFunction<typeof fsExtra.readJson>;
    let mockWindow: jest.Mocked<typeof vscode.window>;
    let mockWorkspace: jest.Mocked<typeof vscode.workspace>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock VS Code window
        mockWindow = {
            withProgress: jest.fn(),
            showInformationMessage: jest.fn().mockResolvedValue(undefined),
            showErrorMessage: jest.fn().mockResolvedValue(undefined),
        } as any;
        (vscode.window as any) = mockWindow;

        // Mock VS Code workspace
        mockWorkspace = {
            getConfiguration: jest.fn(),
            workspaceFolders: [
                {
                    uri: { fsPath: '/workspace/root' },
                    name: 'test-workspace',
                    index: 0,
                },
            ],
        } as any;
        (vscode.workspace as any) = mockWorkspace;

        // Mock progress reporter
        mockProgress = {
            report: jest.fn(),
        } as jest.Mocked<vscode.Progress<{ increment?: number; message?: string }>>;

        // Mock functions
        mockExecuteWorkflow = executeWorkflowFunction.executeWorkflow as jest.MockedFunction<
            typeof executeWorkflowFunction.executeWorkflow
        >;
        mockReadJson = fsExtra.readJson as jest.MockedFunction<typeof fsExtra.readJson>;

        // Setup withProgress to call the callback immediately
        mockWindow.withProgress.mockImplementation(async (_options, callback) => {
            return await callback(mockProgress, {} as vscode.CancellationToken);
        });
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof executeUnifiedWorkflow).toBe('function');
        });
    });

    describe('File-based configuration workflow', () => {
        test('should execute workflow from config file successfully', async () => {
            // Arrange
            const params = {
                configSource: 'file' as const,
                configPath: '/test/config.json',
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            mockReadJson.mockResolvedValue(mockConfigData);
            mockExecuteWorkflow.mockResolvedValue(true);
            mockWindow.showInformationMessage.mockResolvedValue(undefined);

            // Act
            const result = await executeUnifiedWorkflow(params);

            // Assert
            expect(result).toBe(true);
            expect(mockReadJson).toHaveBeenCalledWith('/test/config.json');
            expect(mockExecuteWorkflow).toHaveBeenCalledWith({
                configData: mockConfigData,
                logger: params.logger,
                configParserService: params.configParserService,
                copyManagerService: params.copyManagerService,
                linkManagerService: params.linkManagerService,
                commandExecutorService: params.commandExecutorService,
                progress: mockProgress,
                initialProgressIncrement: 10,
                workspaceRoot: '/workspace/root',
                fileDiscoveryService: params.fileDiscoveryService,
                attributeAdjustmentService: params.attributeAdjustmentService,
            });
        });

        test('should throw error when config file path is missing', async () => {
            // Arrange
            const params = {
                configSource: 'file' as const,
                // configPath is intentionally missing
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            // Act & Assert
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(DomainError);
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(
                'Configuration file path is required for file-based workflow'
            );
        });

        test('should handle config file read errors', async () => {
            // Arrange
            const params = {
                configSource: 'file' as const,
                configPath: '/test/nonexistent.json',
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const readError = new Error('ENOENT: no such file or directory');
            mockReadJson.mockRejectedValue(readError);

            // Act & Assert
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(readError);
        });
    });

    describe('Settings-based configuration workflow', () => {
        test('should execute workflow from VS Code settings successfully', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);
            mockExecuteWorkflow.mockResolvedValue(true);
            mockWindow.showInformationMessage.mockResolvedValue(undefined);

            // Act
            const result = await executeUnifiedWorkflow(params);

            // Assert
            expect(result).toBe(true);
            expect(mockWorkspace.getConfiguration).toHaveBeenCalledWith('filesystemLinkManager');
            expect(mockConfiguration.get).toHaveBeenCalledWith('config');
            expect(mockExecuteWorkflow).toHaveBeenCalledWith({
                configData: mockConfigData,
                logger: params.logger,
                configParserService: params.configParserService,
                copyManagerService: params.copyManagerService,
                linkManagerService: params.linkManagerService,
                commandExecutorService: params.commandExecutorService,
                progress: mockProgress,
                initialProgressIncrement: 10,
                workspaceRoot: '/workspace/root',
                fileDiscoveryService: params.fileDiscoveryService,
                attributeAdjustmentService: params.attributeAdjustmentService,
            });
        });

        test('should handle missing workspace root', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            // Mock workspace with no folders
            (vscode.workspace as any).workspaceFolders = undefined;

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);

            // Act & Assert
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(DomainError);
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(
                'VS Code workspace root directory not found'
            );
        });
    });

    describe('Error handling', () => {
        test('should handle workflow execution failure', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);
            mockExecuteWorkflow.mockResolvedValue(false);

            // Act
            const result = await executeUnifiedWorkflow(params);

            // Assert
            expect(result).toBe(false);
        });

        test('should handle Zod validation errors specially', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);

            const zodError = new Error('Validation failed');
            zodError.name = 'ZodError';
            mockExecuteWorkflow.mockRejectedValue(zodError);

            // Act & Assert
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(DomainError);
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(
                'Configuration validation failed'
            );
        });

        test('should handle general errors', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);

            const generalError = new Error('Something went wrong');
            mockExecuteWorkflow.mockRejectedValue(generalError);

            // Act & Assert
            await expect(executeUnifiedWorkflow(params)).rejects.toThrow(generalError);
        });
    });

    describe('Progress reporting', () => {
        test('should report progress during workflow execution', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);
            mockExecuteWorkflow.mockResolvedValue(true);

            // Act
            await executeUnifiedWorkflow(params);

            // Assert
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 0,
                message: 'Loading configuration...',
            });
            expect(mockProgress.report).toHaveBeenCalledWith({
                increment: 10,
                message: 'Configuration loaded successfully',
            });
        });

        test('should use correct progress title for file source', async () => {
            // Arrange
            const params = {
                configSource: 'file' as const,
                configPath: '/test/config.json',
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            mockReadJson.mockResolvedValue(mockConfigData);
            mockExecuteWorkflow.mockResolvedValue(true);

            // Act
            await executeUnifiedWorkflow(params);

            // Assert
            expect(mockWindow.withProgress).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'FS link manager: Executing workflow from config file',
                }),
                expect.any(Function)
            );
        });

        test('should use correct progress title for settings source', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);
            mockExecuteWorkflow.mockResolvedValue(true);

            // Act
            await executeUnifiedWorkflow(params);

            // Assert
            expect(mockWindow.withProgress).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'FS link manager: Executing workflow from settings',
                }),
                expect.any(Function)
            );
        });
    });

    describe('User notifications', () => {
        test('should show success notification when workflow completes', async () => {
            // Arrange
            const params = {
                configSource: 'settings' as const,
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            const mockConfiguration = {
                get: jest.fn().mockReturnValue(mockConfigData),
            };
            mockWorkspace.getConfiguration.mockReturnValue(mockConfiguration as any);
            mockExecuteWorkflow.mockResolvedValue(true);
            mockWindow.showInformationMessage.mockResolvedValue({ title: 'Show Output' } as any);

            // Act
            await executeUnifiedWorkflow(params);

            // Assert
            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'FS link manager workflow executed successfully from settings!',
                'Show Output'
            );
        });

        test('should handle Show Output button click', async () => {
            // Arrange
            const params = {
                configSource: 'file' as const,
                configPath: '/test/config.json',
                logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } as any,
                configParserService: {} as any,
                copyManagerService: {} as any,
                linkManagerService: {} as any,
                commandExecutorService: {} as any,
                fileDiscoveryService: {} as any,
                attributeAdjustmentService: {} as any,
            };

            const mockConfigData = { targetDirectoryPath: '/target', operations: [] };
            mockReadJson.mockResolvedValue(mockConfigData);
            mockExecuteWorkflow.mockResolvedValue(true);
            mockWindow.showInformationMessage.mockResolvedValue('Show Output' as any);

            // Act
            await executeUnifiedWorkflow(params);

            // Assert
            expect(params.logger.info).toHaveBeenCalledWith(
                'User requested to show output',
                expect.objectContaining({
                    operation: 'executeConfigFileWorkflow',
                })
            );
        });
    });
});
