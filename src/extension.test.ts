import 'reflect-metadata';
import * as vscode from 'vscode';
import type { DependencyContainer } from 'tsyringe';
import { activate, deactivate } from './extension';
import { LoggerService, LogLevel } from './logging';
import { WorkflowOrchestratorService } from './symlink-creation/workflow';
import { DomainError } from './common';
import * as containerSetup from './container';

jest.mock('vscode', () => ({
    ExtensionContext: jest.fn(),
    OutputChannel: jest.fn(),
    commands: {
        registerCommand: jest.fn(),
    },
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showOpenDialog: jest.fn(),
        showQuickPick: jest.fn(),
        createOutputChannel: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(),
        onDidChangeConfiguration: jest.fn(),
    },
    Uri: {
        file: jest.fn(),
    },
}));

jest.mock('./container');
jest.mock('./logging');
jest.mock('./symlink-creation/workflow');

describe('extension', () => {
    let mockContext: Partial<vscode.ExtensionContext>;
    let mockOutputChannel: Partial<vscode.OutputChannel>;
    let mockLogger: Partial<LoggerService>;
    let mockWorkflowService: Partial<WorkflowOrchestratorService>;
    let mockContainer: Partial<DependencyContainer>;
    let mockConfiguration: Partial<vscode.WorkspaceConfiguration>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Setup mock context
        mockContext = {
            subscriptions: [],
            extensionPath: '/mock/extension/path',
        };

        // Setup mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            show: jest.fn(),
        };

        // Setup mock logger
        mockLogger = {
            setLevel: jest.fn(),
            getLevel: jest.fn().mockReturnValue(LogLevel.INFO),
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };

        // Setup mock workflow service
        mockWorkflowService = {
            executeFromSettings: jest.fn(),
            executeFromConfigFile: jest.fn(),
        };

        // Setup mock DI container
        mockContainer = {
            resolve: jest.fn().mockImplementation((token: any) => {
                if (token === LoggerService) {
                    return mockLogger;
                }
                if (token === WorkflowOrchestratorService) {
                    return mockWorkflowService;
                }
                if (token === 'OutputChannel') {
                    return mockOutputChannel;
                }
                return {};
            }),
        } as any;

        // Setup mock configuration
        mockConfiguration = {
            get: jest.fn().mockReturnValue('info'),
            update: jest.fn(),
        };

        // Setup mock VS Code APIs
        (vscode.commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfiguration);
        (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockReturnValue({
            dispose: jest.fn(),
        });
        (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);
        (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

        // Setup container setup mock
        (containerSetup.setupContainer as jest.Mock).mockReturnValue(mockContainer);
    });

    describe('Construction', () => {
        test('should export activate function', () => {
            // Arrange & Act & Assert
            expect(typeof activate).toBe('function');
        });

        test('should export deactivate function', () => {
            // Arrange & Act & Assert
            expect(typeof deactivate).toBe('function');
        });
    });

    describe('Extension activation', () => {
        test('should activate successfully with proper DI container setup', async () => {
            // Arrange
            const mockRegisterCommand = vscode.commands.registerCommand as jest.Mock;

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(containerSetup.setupContainer).toHaveBeenCalledWith(mockContext);
            expect(mockContainer.resolve).toHaveBeenCalledWith(LoggerService);
            expect(mockContainer.resolve).toHaveBeenCalledWith('OutputChannel');
            expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Logging system initialized',
                expect.any(Object)
            );
            expect(mockRegisterCommand).toHaveBeenCalledTimes(3);
        });

        test('should register all three commands with correct names', async () => {
            // Arrange
            const mockRegisterCommand = vscode.commands.registerCommand as jest.Mock;

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(mockRegisterCommand).toHaveBeenCalledWith(
                'filesystemLinkManager.executeFromSettings',
                expect.any(Function)
            );
            expect(mockRegisterCommand).toHaveBeenCalledWith(
                'filesystemLinkManager.executeFromConfigFile',
                expect.any(Function)
            );
            expect(mockRegisterCommand).toHaveBeenCalledWith(
                'filesystemLinkManager.setLogLevel',
                expect.any(Function)
            );
        });

        test('should add all disposables to context subscriptions', async () => {
            // Arrange
            const mockDisposable = { dispose: jest.fn() };
            (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);
            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockReturnValue(
                mockDisposable
            );

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(mockContext.subscriptions?.length).toBe(4); // 3 commands + 1 config listener
        });

        test('should setup configuration change listener for logging level updates', async () => {
            // Arrange
            const mockConfigChangeHandler = jest.fn();
            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation(
                mockConfigChangeHandler
            );

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalledWith(
                expect.any(Function)
            );
        });

        test('should read logging configuration from workspace settings', async () => {
            // Arrange
            const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;
            mockGetConfiguration.mockReturnValue({
                get: jest.fn().mockReturnValue('debug'),
            });

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(mockGetConfiguration).toHaveBeenCalledWith('filesystemLinkManager.logging');
            expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
        });

        test('should handle activation errors gracefully and show user-friendly message', async () => {
            // Arrange
            const setupError = new Error('Container setup failed');
            (containerSetup.setupContainer as jest.Mock).mockImplementation(() => {
                throw setupError;
            });
            const mockShowError = vscode.window.showErrorMessage as jest.Mock;
            mockShowError.mockResolvedValue('Show Details');

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(mockShowError).toHaveBeenCalledWith(
                'Failed to activate FileSystem Link Manager: Container setup failed',
                'Show Details'
            );
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
                'FileSystem Link Manager'
            );
        });

        test('should handle activation errors when user selects show details', async () => {
            // Arrange
            const setupError = new Error('Container setup failed');
            (containerSetup.setupContainer as jest.Mock).mockImplementation(() => {
                throw setupError;
            });
            (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Show Details');

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                'Extension activation failed: Container setup failed'
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Stack trace:')
            );
            expect(mockOutputChannel.show).toHaveBeenCalled();
        });

        test('should handle logging setup errors gracefully and continue with console logging', async () => {
            // Arrange
            (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => {
                throw new Error('Configuration access failed');
            });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            await activate(mockContext as vscode.ExtensionContext);

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith('Failed to setup logging:', expect.any(Error));
            expect(mockContainer.resolve).toHaveBeenCalledWith(LoggerService);

            // Cleanup - restore mocks
            consoleSpy.mockRestore();
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfiguration);
        });
    });

    describe('Configuration change handling', () => {
        test('should update log level when logging configuration changes', async () => {
            // Arrange
            let configChangeHandler: (event: vscode.ConfigurationChangeEvent) => void = jest.fn();
            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation(handler => {
                configChangeHandler = handler;
                return {
                    dispose: jest.fn(),
                };
            });

            await activate(mockContext as vscode.ExtensionContext);

            const mockConfigEvent = {
                affectsConfiguration: jest.fn().mockReturnValue(true),
            };
            const mockNewConfig = {
                get: jest.fn().mockReturnValue('error'),
            };
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockNewConfig);

            // Act
            configChangeHandler(mockConfigEvent as vscode.ConfigurationChangeEvent);

            // Assert
            expect(mockConfigEvent.affectsConfiguration).toHaveBeenCalledWith(
                'filesystemLinkManager.logging'
            );
            expect(mockLogger.setLevel).toHaveBeenCalledWith('error');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Log level updated from configuration',
                expect.any(Object)
            );
        });

        test('should ignore configuration changes that do not affect logging', async () => {
            // Arrange
            let configChangeHandler: (event: vscode.ConfigurationChangeEvent) => void = jest.fn();
            (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation(handler => {
                configChangeHandler = handler;
                return {
                    dispose: jest.fn(),
                };
            });

            await activate(mockContext as vscode.ExtensionContext);
            jest.clearAllMocks();

            const mockConfigEvent = {
                affectsConfiguration: jest.fn().mockReturnValue(false),
            };

            // Act
            configChangeHandler(mockConfigEvent as vscode.ConfigurationChangeEvent);

            // Assert
            expect(mockConfigEvent.affectsConfiguration).toHaveBeenCalledWith(
                'filesystemLinkManager.logging'
            );
            expect(mockLogger.setLevel).not.toHaveBeenCalled();
        });
    });

    describe('Command: executeFromSettings', () => {
        test('should execute workflow from settings successfully', async () => {
            // Arrange
            (mockWorkflowService.executeFromSettings as jest.Mock).mockResolvedValue(undefined);
            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromSettings') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockWorkflowService.executeFromSettings).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Executing workflow from settings command',
                expect.any(Object)
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Workflow from settings command completed successfully',
                expect.any(Object)
            );
        });

        test('should handle DomainError from workflow execution', async () => {
            // Arrange
            const domainError = new DomainError(
                {
                    key: 'TEST_ERROR',
                    message: 'Test domain error message',
                    description: 'Test error',
                },
                { cause: new Error('Cause') }
            );
            (mockWorkflowService.executeFromSettings as jest.Mock).mockRejectedValue(domainError);
            (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Show Details');

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromSettings') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Workflow from settings command failed',
                expect.objectContaining({
                    operation: 'executeFromSettings',
                    domainErrorKey: 'TEST_ERROR',
                    domainErrorDescription: 'Test error',
                })
            );
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'FS link manager workflow from settings failed: Test domain error message',
                'Show Details'
            );
        });

        test('should handle regular Error from workflow execution', async () => {
            // Arrange
            const regularError = new Error('Regular error message');
            (mockWorkflowService.executeFromSettings as jest.Mock).mockRejectedValue(regularError);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromSettings') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Workflow from settings command failed',
                expect.objectContaining({
                    operation: 'executeFromSettings',
                    errorMessage: 'Regular error message',
                    errorName: 'Error',
                })
            );
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'FS link manager workflow from settings failed: Regular error message',
                'Show Details'
            );
        });

        test('should handle unknown error from workflow execution', async () => {
            // Arrange
            const unknownError = 'String error';
            (mockWorkflowService.executeFromSettings as jest.Mock).mockRejectedValue(unknownError);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromSettings') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Workflow from settings command failed',
                expect.objectContaining({
                    operation: 'executeFromSettings',
                    errorMessage: 'Unknown error',
                    errorName: 'UnknownError',
                })
            );
        });

        test('should show details in output channel when user selects Show Details', async () => {
            // Arrange
            const error = new Error('Test error');
            (mockWorkflowService.executeFromSettings as jest.Mock).mockRejectedValue(error);
            (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Show Details');

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromSettings') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                'Workflow execution failed: Test error'
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Stack trace:')
            );
            expect(mockOutputChannel.show).toHaveBeenCalled();
        });
    });

    describe('Command: executeFromConfigFile', () => {
        test('should execute workflow from config file successfully', async () => {
            // Arrange
            const mockUri = { fsPath: '/path/to/config.json' };
            (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([mockUri]);
            (mockWorkflowService.executeFromConfigFile as jest.Mock).mockResolvedValue(undefined);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromConfigFile') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(vscode.window.showOpenDialog).toHaveBeenCalledWith({
                canSelectMany: false,
                openLabel: 'Select FS Link Manager Config File',
                filters: {
                    'JSON files': ['json'],
                    'All files': ['*'],
                },
                title: 'Select FS Link Manager Configuration File',
            });
            expect(mockWorkflowService.executeFromConfigFile).toHaveBeenCalledWith(
                '/path/to/config.json'
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Workflow from config file command completed successfully',
                expect.objectContaining({
                    filePath: '/path/to/config.json',
                })
            );
        });

        test('should handle user cancelling file dialog', async () => {
            // Arrange
            (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue(undefined);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromConfigFile') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User cancelled config file selection',
                expect.any(Object)
            );
            expect(mockWorkflowService.executeFromConfigFile).not.toHaveBeenCalled();
        });

        test('should handle empty file selection', async () => {
            // Arrange
            (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([]);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromConfigFile') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User cancelled config file selection',
                expect.any(Object)
            );
            expect(mockWorkflowService.executeFromConfigFile).not.toHaveBeenCalled();
        });

        test('should handle undefined config file in array', async () => {
            // Arrange
            (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([undefined]);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromConfigFile') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'No config file selected',
                expect.any(Object)
            );
            expect(mockWorkflowService.executeFromConfigFile).not.toHaveBeenCalled();
        });

        test('should handle DomainError from config file workflow execution', async () => {
            // Arrange
            const mockUri = { fsPath: '/path/to/config.json' };
            (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([mockUri]);
            const domainError = new DomainError({
                key: 'CONFIG_ERROR',
                message: 'Config domain error message',
                description: 'Config error',
            });
            (mockWorkflowService.executeFromConfigFile as jest.Mock).mockRejectedValue(domainError);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.executeFromConfigFile') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Workflow from config file command failed',
                expect.objectContaining({
                    operation: 'executeFromConfigFile',
                    domainErrorKey: 'CONFIG_ERROR',
                    domainErrorDescription: 'Config error',
                })
            );
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'FS link manager workflow from config file failed: Config domain error message',
                'Show Details'
            );
        });
    });

    describe('Command: setLogLevel', () => {
        test('should show quick pick with all log levels', async () => {
            // Arrange
            const mockSelection = {
                label: 'Debug',
                value: LogLevel.DEBUG,
                description: 'Detailed diagnostic information',
            };
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSelection);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.setLogLevel') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                [
                    { label: 'Error', value: LogLevel.ERROR, description: 'Only error messages' },
                    { label: 'Warning', value: LogLevel.WARN, description: 'Errors and warnings' },
                    {
                        label: 'Info',
                        value: LogLevel.INFO,
                        description: 'General information (default)',
                    },
                    {
                        label: 'Debug',
                        value: LogLevel.DEBUG,
                        description: 'Detailed diagnostic information',
                    },
                ],
                {
                    placeHolder: 'Select log level',
                    title: 'Set Filesystem Link Manager Log Level',
                }
            );
        });

        test('should update log level and configuration when selection is made', async () => {
            // Arrange
            const mockSelection = {
                label: 'Debug',
                value: LogLevel.DEBUG,
                description: 'Detailed diagnostic information',
            };
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSelection);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.setLogLevel') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.setLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
            expect(mockConfiguration.update).toHaveBeenCalledWith('level', LogLevel.DEBUG, true);
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Log level set to Debug'
            );
        });

        test('should handle user cancelling log level selection', async () => {
            // Arrange
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.setLogLevel') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);
            jest.clearAllMocks(); // Clear activation calls

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.setLevel).not.toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });

        test('should handle DomainError from log level setting', async () => {
            // Arrange
            const mockSelection = {
                label: 'Debug',
                value: LogLevel.DEBUG,
                description: 'Detailed diagnostic information',
            };
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSelection);
            const domainError = new DomainError({
                key: 'LOG_ERROR',
                message: 'Log level error message',
                description: 'Log error',
            });
            (mockLogger.setLevel as jest.Mock).mockImplementation(() => {
                throw domainError;
            });

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.setLogLevel') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to set log level',
                expect.objectContaining({
                    operation: 'setLogLevel',
                    domainErrorKey: 'LOG_ERROR',
                    domainErrorDescription: 'Log error',
                })
            );
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
                'Failed to set log level: Log level error message'
            );
        });

        test('should handle regular Error from log level setting', async () => {
            // Arrange
            const mockSelection = {
                label: 'Debug',
                value: LogLevel.DEBUG,
                description: 'Detailed diagnostic information',
            };
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSelection);
            const regularError = new Error('Regular error');
            (mockLogger.setLevel as jest.Mock).mockImplementation(() => {
                throw regularError;
            });

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.setLogLevel') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to set log level',
                expect.objectContaining({
                    operation: 'setLogLevel',
                    errorMessage: 'Regular error',
                    errorName: 'Error',
                })
            );
        });

        test('should handle unknown error from log level setting', async () => {
            // Arrange
            const mockSelection = {
                label: 'Debug',
                value: LogLevel.DEBUG,
                description: 'Detailed diagnostic information',
            };
            (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSelection);
            (mockLogger.setLevel as jest.Mock).mockImplementation(() => {
                throw 'String error';
            });

            let commandHandler: () => Promise<void> = jest.fn();
            (vscode.commands.registerCommand as jest.Mock).mockImplementation((name, handler) => {
                if (name === 'filesystemLinkManager.setLogLevel') {
                    commandHandler = handler;
                }
                return { dispose: jest.fn() };
            });

            await activate(mockContext as vscode.ExtensionContext);

            // Act
            await commandHandler();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to set log level',
                expect.objectContaining({
                    operation: 'setLogLevel',
                    errorMessage: 'Unknown error',
                    errorName: 'UnknownError',
                })
            );
        });
    });

    describe('Extension deactivation', () => {
        test('should deactivate successfully when container exists', async () => {
            // Arrange
            // First activate to setup container
            await activate(mockContext as vscode.ExtensionContext);

            // Act
            deactivate();

            // Assert
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Extension deactivated, cleaning up DI container',
                expect.objectContaining({
                    operation: 'extensionDeactivation',
                })
            );
        });

        test('should handle deactivation when container is undefined', () => {
            // Arrange
            // Don't activate first, so container remains undefined

            // Act
            deactivate();

            // Assert - Should not throw and should complete successfully
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        test('should handle logging error during deactivation gracefully', async () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            await activate(mockContext as vscode.ExtensionContext);
            (mockLogger.info as jest.Mock).mockImplementation(() => {
                throw new Error('Logging failed');
            });

            // Act
            deactivate();

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith(
                'Could not log deactivation:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });
});
