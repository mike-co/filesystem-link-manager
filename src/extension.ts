/**
 * Main entry point for the FileSystem Link Manager VSCode extension.
 *
 * This module handles extension activation, command registration, and deactivation.
 * It integrates all core services via dependency injection and orchestrates the symlink creation workflow.
 */

import 'reflect-metadata';
import type { DependencyContainer } from 'tsyringe';
import { ExtensionContext, OutputChannel, commands, window, workspace } from 'vscode';
import { setupContainer } from './container';
import { LoggerService } from './logging';
import { LogLevel } from './logging';
import { WorkflowOrchestratorService } from './symlink-creation/workflow';
import { DomainError } from './common';

// Global DI container instance for the extension
let diContainer: DependencyContainer | undefined;

/**
 * Sets up logging configuration for the extension.
 * Configures log level based on user settings.
 * Transports are now injected via DI container automatically.
 * @param logger LoggerService instance
 */
function setupLogging(logger: LoggerService): void {
    try {
        // Read logging configuration from settings
        const config = workspace.getConfiguration('filesystemLinkManager.logging');
        const logLevel = config.get<string>('level', 'info') as LogLevel;

        // Set log level
        logger.setLevel(logLevel);

        logger.info('Logging system initialized', {
            operation: 'loggingSetup',
            level: logLevel,
            transportsInjected: true
        });
    } catch (error) {
        console.error('Failed to setup logging:', error);
        // Continue with basic console logging if setup fails
    }
}

/**
 * Called when your extension is activated. This happens the very first time the command is executed.
 * Enhanced with proper VS Code extension patterns and DI container service resolution.
 *
 * @param context - The VSCode extension context providing subscriptions and global state.
 */
export async function activate(context: ExtensionContext): Promise<void> {
    try {
        // DI-008: Initialize reflect-metadata and setup DI container with context
        diContainer = setupContainer(context);
        
        // Resolve logger service from DI container - transports are auto-injected
        const logger = diContainer.resolve(LoggerService);
        const outputChannel = diContainer.resolve('OutputChannel') as OutputChannel;
        // Setup logging configuration (no manual transport setup needed)
        setupLogging(logger);
        
        // Subscribe to configuration changes
        context.subscriptions.push(
            workspace.onDidChangeConfiguration(configurationEvent => {
                if (configurationEvent.affectsConfiguration('filesystemLinkManager.logging')) {
                    const newConfig = workspace.getConfiguration('filesystemLinkManager.logging');
                    const newLogLevel = newConfig.get<string>('level', 'info') as LogLevel;
                    logger.setLevel(newLogLevel);
                    
                    logger.info('Log level updated from configuration', {
                        operation: 'configurationChange',
                        newLevel: newLogLevel
                    });
                }
            })
        );
        
        // Log extension activation with DI-resolved logger
        logger.info('Extension activated with dependency injection container', {
            operation: 'extensionActivation',
            workingDirectory: context.extensionPath,
        });

        // Resolve WorkflowOrchestratorService from DI container for command execution
        const workflowService = diContainer.resolve(WorkflowOrchestratorService);

        // Register filesystemLinkManager.executeFromSettings command
        const executeFromSettingsCommand = commands.registerCommand(
            'filesystemLinkManager.executeFromSettings',
            async () => {
                try {
                    logger.info('Executing workflow from settings command', {
                        operation: 'executeFromSettings',
                    });
                    
                    await workflowService.executeFromSettings();
                    
                    logger.info('Workflow from settings command completed successfully', {
                        operation: 'executeFromSettings',
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    
                    if (error instanceof DomainError) {
                        logger.error('Workflow from settings command failed', {
                            operation: 'executeFromSettings',
                            errorMessage: errorMessage,
                            errorStack: error.stack,
                            errorName: error.name,
                            domainErrorKey: error.domainErrorInfo.key,
                            domainErrorDescription: error.domainErrorInfo.description,
                            cause: error.cause,
                        });
                    } else if (error instanceof Error) {
                        logger.error('Workflow from settings command failed', {
                            operation: 'executeFromSettings',
                            errorMessage: errorMessage,
                            errorStack: error.stack,
                            errorName: error.name,
                        });
                    } else {
                        logger.error('Workflow from settings command failed', {
                            operation: 'executeFromSettings',
                            errorMessage: errorMessage,
                            errorName: 'UnknownError',
                        });
                    }
                    
                    window.showErrorMessage(
                        `FS link manager workflow from settings failed: ${errorMessage}`,
                        'Show Details'
                    ).then(selection => {
                        if (selection === 'Show Details') {
                            outputChannel.appendLine(`Workflow execution failed: ${errorMessage}`);
                            outputChannel.appendLine(`Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
                            outputChannel.show();
                        }
                    });
                }
            }
        );

        // Register filesystemLinkManager.executeFromConfigFile command
        const executeFromConfigFileCommand = commands.registerCommand(
            'filesystemLinkManager.executeFromConfigFile',
            async () => {
                try {
                    logger.info('Executing workflow from config file command', {
                        operation: 'executeFromConfigFile',
                    });
                    
                    // Prompt user to select config file
                    const configFileResult = await window.showOpenDialog({
                        canSelectMany: false,
                        openLabel: 'Select FS Link Manager Config File',
                        filters: {
                            'JSON files': ['json'],
                            'All files': ['*']
                        },
                        title: 'Select FS Link Manager Configuration File'
                    });

                    if (!configFileResult || configFileResult.length === 0) {
                        logger.info('User cancelled config file selection', {
                            operation: 'executeFromConfigFile',
                        });
                        return;
                    }

                    const configFile = configFileResult[0];
                    if (!configFile) {
                        logger.warn('No config file selected', {
                            operation: 'executeFromConfigFile',
                        });
                        return;
                    }

                    const configPath = configFile.fsPath;
                    
                    await workflowService.executeFromConfigFile(configPath);
                    
                    logger.info('Workflow from config file command completed successfully', {
                        operation: 'executeFromConfigFile',
                        filePath: configPath,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    
                    if (error instanceof DomainError) {
                        logger.error('Workflow from config file command failed', {
                            operation: 'executeFromConfigFile',
                            errorMessage: errorMessage,
                            errorStack: error.stack,
                            errorName: error.name,
                            domainErrorKey: error.domainErrorInfo.key,
                            domainErrorDescription: error.domainErrorInfo.description,
                            cause: error.cause,
                        });
                    } else if (error instanceof Error) {
                        logger.error('Workflow from config file command failed', {
                            operation: 'executeFromConfigFile',
                            errorMessage: errorMessage,
                            errorStack: error.stack,
                            errorName: error.name,
                        });
                    } else {
                        logger.error('Workflow from config file command failed', {
                            operation: 'executeFromConfigFile',
                            errorMessage: errorMessage,
                            errorName: 'UnknownError',
                        });
                    }
                    
                    window.showErrorMessage(
                        `FS link manager workflow from config file failed: ${errorMessage}`,
                        'Show Details'
                    ).then(selection => {
                        if (selection === 'Show Details') {
                            outputChannel.appendLine(`Workflow execution failed: ${errorMessage}`);
                            outputChannel.appendLine(`Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
                            outputChannel.show();
                        }
                    });
                }
            }
        );

        // Register filesystemLinkManager.setLogLevel command
        const setLogLevelCommand = commands.registerCommand(
            'filesystemLinkManager.setLogLevel',
            async () => {
                try {
                    const logLevels = [
                        { label: 'Error', value: LogLevel.ERROR, description: 'Only error messages' },
                        { label: 'Warning', value: LogLevel.WARN, description: 'Errors and warnings' },
                        { label: 'Info', value: LogLevel.INFO, description: 'General information (default)' },
                        { label: 'Debug', value: LogLevel.DEBUG, description: 'Detailed diagnostic information' }
                    ];

                    const selection = await window.showQuickPick(logLevels, {
                        placeHolder: 'Select log level',
                        title: 'Set Filesystem Link Manager Log Level'
                    });

                    if (selection) {
                        logger.setLevel(selection.value);
                        
                        // Update the configuration setting
                        const config = workspace.getConfiguration('filesystemLinkManager.logging');
                        await config.update('level', selection.value, true);
                        
                        logger.info('Log level changed via command', {
                            operation: 'setLogLevel',
                            newLevel: selection.value,
                            previousLevel: logger.getLevel()
                        });

                        window.showInformationMessage(`Log level set to ${selection.label}`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    
                    if (error instanceof DomainError) {
                        logger.error('Failed to set log level', {
                            operation: 'setLogLevel',
                            errorMessage: errorMessage,
                            errorStack: error.stack,
                            errorName: error.name,
                            domainErrorKey: error.domainErrorInfo.key,
                            domainErrorDescription: error.domainErrorInfo.description,
                            cause: error.cause,
                        });
                    } else if (error instanceof Error) {
                        logger.error('Failed to set log level', {
                            operation: 'setLogLevel',
                            errorMessage: errorMessage,
                            errorStack: error.stack,
                            errorName: error.name,
                        });
                    } else {
                        logger.error('Failed to set log level', {
                            operation: 'setLogLevel',
                            errorMessage: errorMessage,
                            errorName: 'UnknownError'
                        });
                    }
                    
                    window.showErrorMessage(`Failed to set log level: ${errorMessage}`);
                }
            }
        );

        // Add command disposables to context.subscriptions for proper cleanup
        context.subscriptions.push(
            executeFromSettingsCommand,
            executeFromConfigFileCommand,
            setLogLevelCommand
        );

        logger.info('Extension commands registered successfully', {
            operation: 'extensionActivation',
            processedCount: 3,
        });
      
    } catch (error) {
        // Handle activation errors gracefully with accessibility support
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to activate extension:', error);
        
        // Show accessible error message to user
        window.showErrorMessage(
            `Failed to activate FileSystem Link Manager: ${errorMessage}`,
            'Show Details'
        ).then(selection => {
            if (selection === 'Show Details') {
                // Open output channel for detailed error information
                const outputChannel = window.createOutputChannel('FileSystem Link Manager');
                outputChannel.appendLine(`Extension activation failed: ${errorMessage}`);
                outputChannel.appendLine(`Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
                outputChannel.show();
            }
        });
    }
}

/**
 * Performs cleanup operations and resource disposal following VS Code best practices.
 */
export function deactivate(): void {
    // DI-008: Proper disposal patterns for DI container
    if (diContainer) {
        try {
            // Log deactivation
            const logger = diContainer.resolve(LoggerService);
            logger.info('Extension deactivated, cleaning up DI container', {
                operation: 'extensionDeactivation',
            });
        } catch (error) {
            console.warn('Could not log deactivation:', error);
        }
        
        // Clear the container reference
        diContainer = undefined;
    }
}
