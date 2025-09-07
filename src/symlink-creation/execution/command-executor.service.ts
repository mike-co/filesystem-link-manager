import { injectable } from 'tsyringe';
import { LoggerService } from '../../logging';
import { PostExecutionCommand } from '../config';
import {
    executeCommand as executeCommandFunction
} from './command-executor/execute-command.function';
import { skipIfPathExists } from './command-executor/skip-if-path-exists.function';
import { ExecuteCommandResult } from './types/execute-command-result.interface';

/**
 * Service for executing post-execution shell commands after symlink creation and file copy operations.
 * Implements secure command execution with validation, timeout handling, and conditional execution.
 */
@injectable()
export class CommandExecutorService {

    /**
     * Creates a new CommandExecutorService instance.
     * @param loggerService Service for structured logging operations
     */
    public constructor(private readonly loggerService: LoggerService) { }

    /**
     * Executes a shell command with comprehensive options and security validation.
     * Orchestrates validation, execution, and logging using pure functions.
     * 
     * @param targetDirectoryPath Directory path to execute command in
     * @param executionCommand Configuration object containing command and options
     * @returns Promise that resolves to true if command executed successfully, false otherwise
     */
    public async executeCommand(targetDirectoryPath: string, executionCommand: PostExecutionCommand): Promise<boolean> {
        if (executionCommand.skipIfPathExists && await skipIfPathExists(targetDirectoryPath, executionCommand.skipIfPathExists)) {
            this.loggerService.info('Path exists, skipping command execution', {
                operation: 'skipIfPathExists',
                filePath: executionCommand.skipIfPathExists,
            });
            return false;
        }
        // Basic validation: command must be a non-empty string
        if (!executionCommand?.command || executionCommand.command.toString().trim() === '') {
            this.loggerService.warn('Command validation failed', {
                operation: 'validateCommand',
                command: executionCommand?.command,
            });
            return false;
        }

        this.loggerService.debug('Command validation passed', {
            operation: 'validateCommand',
            command: executionCommand.command,
        });

        this.loggerService.debug('Executing shell command', {
            operation: 'executeCommand',
            command: executionCommand.command,
            workingDirectory: executionCommand.cwd
        });

        // Execute command using pure function
        const result: ExecuteCommandResult = await executeCommandFunction(executionCommand);

        if (result.success) {
            this.loggerService.info('Command executed successfully', {
                operation: 'executeCommand',
                command: executionCommand.command,
                workingDirectory: executionCommand.cwd
            });
        } else {
            // Log errors for failed commands but continue executing remaining commands (PEC-004)
            this.loggerService.error('Command execution failed', {
                'operation': '',
                error: result.error
            });
        }

        return result.success;
    }
}