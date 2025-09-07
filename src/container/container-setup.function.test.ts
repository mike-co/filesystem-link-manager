import 'reflect-metadata';
import * as vscode from 'vscode';
import { setupContainer } from '../container/container-setup.function';
import { FileTransport, LoggerService, OutputChannelTransport } from '../logging';
import { ConfigParserService } from '../symlink-creation/config';
import { CopyManagerService } from '../symlink-creation/copying';
import { FileDiscoveryService } from '../symlink-creation/discovery';
import { CommandExecutorService } from '../symlink-creation/execution';
import { AttributeAdjustmentService } from '../symlink-creation/file-attribute';
import { LinkManagerService } from '../symlink-creation/linking';
import { WorkflowOrchestratorService } from '../symlink-creation/workflow';

// Mock VS Code APIs
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn().mockReturnValue({
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            name: 'Mock Channel',
            replace: jest.fn(),
        }),
    },
}));

describe('container-setup.function', () => {
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext = {
            globalStorageUri: {
                fsPath: '/mock/storage/path',
            },
            subscriptions: [],
        } as any;
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof setupContainer).toBe('function');
        });
    });

    describe('Container setup', () => {
        test('should setup container with VS Code dependencies', () => {
            // Arrange & Act
            const container = setupContainer(mockContext);

            // Assert
            expect(container).toBeDefined();
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
                'Filesystem Link Manager'
            );
        });

        test('should return DependencyContainer instance', () => {
            // Arrange & Act
            const container = setupContainer(mockContext);

            // Assert
            expect(container).toBeInstanceOf(Object);
            expect(typeof container.resolve).toBe('function');
            expect(typeof container.registerSingleton).toBe('function');
            expect(typeof container.registerInstance).toBe('function');
        });

        test('should register extension context and output channel as instances', () => {
            // Arrange & Act
            const container = setupContainer(mockContext);

            // Assert
            const resolvedContext = container.resolve('ExtensionContext');
            const resolvedOutputChannel = container.resolve('OutputChannel');

            expect(resolvedContext).toBe(mockContext);
            expect(resolvedOutputChannel).toBeDefined();
        });

        test('should create output channel with correct name', () => {
            // Arrange & Act
            setupContainer(mockContext);

            // Assert
            expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
            expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
                'Filesystem Link Manager'
            );
        });
    });

    describe('Transport registrations', () => {
        test('should register and resolve OutputChannelTransport as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const transport1 = container.resolve(OutputChannelTransport);
            const transport2 = container.resolve(OutputChannelTransport);

            // Assert
            expect(transport1).toBeInstanceOf(OutputChannelTransport);
            expect(transport1).toBe(transport2); // Singleton behavior
        });

        test('should register and resolve FileTransport as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const transport1 = container.resolve(FileTransport);
            const transport2 = container.resolve(FileTransport);

            // Assert
            expect(transport1).toBeInstanceOf(FileTransport);
            expect(transport1).toBe(transport2); // Singleton behavior
        });
    });

    describe('Service registrations', () => {
        test('should register and resolve LoggerService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(LoggerService);
            const service2 = container.resolve(LoggerService);

            // Assert
            expect(service1).toBeInstanceOf(LoggerService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve ConfigParserService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(ConfigParserService);
            const service2 = container.resolve(ConfigParserService);

            // Assert
            expect(service1).toBeInstanceOf(ConfigParserService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve CopyManagerService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(CopyManagerService);
            const service2 = container.resolve(CopyManagerService);

            // Assert
            expect(service1).toBeInstanceOf(CopyManagerService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve FileDiscoveryService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(FileDiscoveryService);
            const service2 = container.resolve(FileDiscoveryService);

            // Assert
            expect(service1).toBeInstanceOf(FileDiscoveryService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve CommandExecutorService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(CommandExecutorService);
            const service2 = container.resolve(CommandExecutorService);

            // Assert
            expect(service1).toBeInstanceOf(CommandExecutorService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve LinkManagerService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(LinkManagerService);
            const service2 = container.resolve(LinkManagerService);

            // Assert
            expect(service1).toBeInstanceOf(LinkManagerService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve AttributeAdjustmentService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(AttributeAdjustmentService);
            const service2 = container.resolve(AttributeAdjustmentService);

            // Assert
            expect(service1).toBeInstanceOf(AttributeAdjustmentService);
            expect(service1).toBe(service2); // Singleton behavior
        });

        test('should register and resolve WorkflowOrchestratorService as singleton', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const service1 = container.resolve(WorkflowOrchestratorService);
            const service2 = container.resolve(WorkflowOrchestratorService);

            // Assert
            expect(service1).toBeInstanceOf(WorkflowOrchestratorService);
            expect(service1).toBe(service2); // Singleton behavior
        });
    });

    describe('Dependency injection integration', () => {
        test('should resolve services with injected dependencies', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const logger = container.resolve(LoggerService);
            const orchestrator = container.resolve(WorkflowOrchestratorService);

            // Assert
            expect(logger).toBeDefined();
            expect(orchestrator).toBeDefined();
            // Services should be properly injected with their dependencies
        });

        test('should allow multiple service resolutions without conflicts', () => {
            // Arrange
            const container = setupContainer(mockContext);

            // Act
            const logger = container.resolve(LoggerService);
            const configParser = container.resolve(ConfigParserService);
            const copyManager = container.resolve(CopyManagerService);
            const fileDiscovery = container.resolve(FileDiscoveryService);
            const commandExecutor = container.resolve(CommandExecutorService);
            const linkManager = container.resolve(LinkManagerService);
            const attributeAdjustment = container.resolve(AttributeAdjustmentService);
            const orchestrator = container.resolve(WorkflowOrchestratorService);

            // Assert
            expect(logger).toBeDefined();
            expect(configParser).toBeDefined();
            expect(copyManager).toBeDefined();
            expect(fileDiscovery).toBeDefined();
            expect(commandExecutor).toBeDefined();
            expect(linkManager).toBeDefined();
            expect(attributeAdjustment).toBeDefined();
            expect(orchestrator).toBeDefined();
        });
    });

    describe('Error handling scenarios', () => {
        test('should handle null extension context gracefully', () => {
            // Arrange
            const nullContext = null as any;

            // Act & Assert
            expect(() => setupContainer(nullContext)).not.toThrow();
        });

        test('should handle undefined extension context gracefully', () => {
            // Arrange
            const undefinedContext = undefined as any;

            // Act & Assert
            expect(() => setupContainer(undefinedContext)).not.toThrow();
        });

        test('should handle extension context without globalStorageUri', () => {
            // Arrange
            const incompleteContext = {
                subscriptions: [],
            } as any;

            // Act & Assert
            expect(() => setupContainer(incompleteContext)).not.toThrow();
        });
    });
});
