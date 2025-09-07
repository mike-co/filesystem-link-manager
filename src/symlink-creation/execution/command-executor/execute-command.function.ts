import { execa } from 'execa';
import { PostExecutionCommand } from '../../../symlink-creation/config';
import { EXECUTION_DOMAIN_ERRORS } from '../execution-domain-errors.const';
import { ExecuteCommandResult } from '../types/execute-command-result.interface';
import { createExecutionError } from './create-execution-error.function';

/**
 * Executes a shell command with comprehensive options and error handling.
 * 
 * @param executionCommand Shell command configuration including command, cwd, timeout, and environment
 * @returns Promise that resolves to command execution result with success status and optional error
 * @throws DomainError when command execution fails with specific error types
 */
export async function executeCommand(executionCommand: PostExecutionCommand): Promise<ExecuteCommandResult> {
    try {
        // Build execa options with comprehensive settings and security considerations
        const execaOptions = {
            shell: executionCommand?.shell !== undefined ? executionCommand.shell : true,
            // allow 0 to be passed explicitly so tests can validate zero-timeout behaviour
            timeout: executionCommand?.timeoutInMs ?? 300000, // 5 minutes default (CON-004)
            ...(executionCommand?.cwd && { cwd: executionCommand.cwd }),
            ...(executionCommand?.env && { env: { ...process.env, ...executionCommand.env } })
        };

        // Execute command with comprehensive options for cross-platform compatibility
        await execa(executionCommand.command, [], execaOptions);
        
        return {
            success: true
        };
    } catch (error: unknown) {
        // Use shared error handling utility for consistent error mapping
        const executionError = createExecutionError(error, EXECUTION_DOMAIN_ERRORS.EXECUTION);
        
        return {
            success: false,
            error: executionError
        };
    }
}