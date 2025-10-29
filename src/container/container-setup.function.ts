import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { ExtensionContext, window } from 'vscode';
import { FileTransport, LoggerService, OutputChannelTransport } from '../logging';
import { ConfigParserService } from '../symlink-creation/config';
import { CopyManagerService } from '../symlink-creation/copying';
import { FileDiscoveryService } from '../symlink-creation/discovery';
import { CommandExecutorService } from '../symlink-creation/execution';
import { AttributeAdjustmentService } from '../symlink-creation/file-attribute';
import { LinkManagerService } from '../symlink-creation/linking';
import { WorkflowOrchestratorService } from '../symlink-creation/workflow';
import { LinkAuditService } from '../link-audit';

/**
 * Sets up and configures the dependency injection container with all required services.
 * Registers VS Code dependencies, logging transports, and all application services as singletons.
 * Ensures proper type resolution and instance sharing across the extension.
 * @param context The VS Code extension context for configuring logging transports and storage
 * @returns The configured DI container instance ready for service resolution
 * @throws Error if container setup fails due to missing dependencies or registration conflicts
 */
export function setupContainer(context: ExtensionContext): DependencyContainer {
    // Register VS Code dependencies
    container.registerInstance('ExtensionContext', context);
    
    // Create and register OutputChannel for logging
    const outputChannel = window.createOutputChannel('Filesystem Link Manager');
    container.registerInstance('OutputChannel', outputChannel);
    
    // Register transports
    container.registerSingleton(OutputChannelTransport);
    container.registerSingleton(FileTransport);
    
    // Register all services as singletons for proper type resolution and sharing
    container.registerSingleton(LoggerService);
    container.registerSingleton(ConfigParserService);
    container.registerSingleton(CopyManagerService);
    container.registerSingleton(FileDiscoveryService);
    container.registerSingleton(CommandExecutorService);
    container.registerSingleton(LinkManagerService);
    container.registerSingleton(AttributeAdjustmentService);
    container.registerSingleton(WorkflowOrchestratorService);
    container.registerSingleton(LinkAuditService);
    
    return container;
}