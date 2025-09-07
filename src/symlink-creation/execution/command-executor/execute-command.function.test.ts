import { execa } from 'execa';
import { PostExecutionCommand } from '../../../symlink-creation/config';
import { EXECUTION_DOMAIN_ERRORS } from '../execution-domain-errors.const';
import { executeCommand } from './execute-command.function';
import { createExecutionError } from './create-execution-error.function';

jest.mock('execa');
jest.mock('./create-execution-error.function');

describe('execute-command.function', () => {
    let mockExeca: jest.MockedFunction<typeof execa>;
    let mockCreateExecutionError: jest.MockedFunction<typeof createExecutionError>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockExeca = execa as jest.MockedFunction<typeof execa>;
        mockCreateExecutionError = createExecutionError as jest.MockedFunction<
            typeof createExecutionError
        >;
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof executeCommand).toBe('function');
        });
    });

    describe('Successful command execution', () => {
        test('should execute command successfully with default options', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'echo "test"',
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('echo "test"', [], {
                shell: true,
                timeout: 300000,
            });
        });

        test('should execute command with custom shell setting', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'ls -la',
                shell: false,
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('ls -la', [], {
                shell: false,
                timeout: 300000,
            });
        });

        test('should execute command with custom timeout', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'npm install',
                timeoutInMs: 600000,
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('npm install', [], {
                shell: true,
                timeout: 600000,
            });
        });

        test('should execute command with custom working directory', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'git status',
                cwd: '/path/to/project',
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('git status', [], {
                shell: true,
                timeout: 300000,
                cwd: '/path/to/project',
            });
        });

        test('should execute command with custom environment variables', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'npm run build',
                env: { NODE_ENV: 'production', BUILD_MODE: 'release' },
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('npm run build', [], {
                shell: true,
                timeout: 300000,
                env: { ...process.env, NODE_ENV: 'production', BUILD_MODE: 'release' },
            });
        });

        test('should execute command with all custom options', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'docker build .',
                shell: false,
                timeoutInMs: 1800000,
                cwd: '/project/docker',
                env: { DOCKER_BUILDKIT: '1' },
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('docker build .', [], {
                shell: false,
                timeout: 1800000,
                cwd: '/project/docker',
                env: { ...process.env, DOCKER_BUILDKIT: '1' },
            });
        });
    });

    describe('Failed command execution', () => {
        test('should handle execution failure and return error result', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'invalid-command',
            };
            const execaError = new Error('Command not found');
            const domainError = {
                message: 'Execution failed',
                errorInfo: EXECUTION_DOMAIN_ERRORS.EXECUTION,
            };

            mockExeca.mockRejectedValue(execaError);
            mockCreateExecutionError.mockReturnValue(domainError as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({
                success: false,
                error: domainError,
            });
            expect(mockCreateExecutionError).toHaveBeenCalledWith(
                execaError,
                EXECUTION_DOMAIN_ERRORS.EXECUTION
            );
        });

        test('should handle timeout error and map to domain error', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'long-running-command',
                timeoutInMs: 1000,
            };
            const timeoutError = Object.assign(new Error('Timeout'), { code: 'ETIME' });
            const domainError = {
                message: 'Timeout occurred',
                errorInfo: EXECUTION_DOMAIN_ERRORS.EXECUTION_TIMEOUT,
            };

            mockExeca.mockRejectedValue(timeoutError);
            mockCreateExecutionError.mockReturnValue(domainError as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({
                success: false,
                error: domainError,
            });
            expect(mockCreateExecutionError).toHaveBeenCalledWith(
                timeoutError,
                EXECUTION_DOMAIN_ERRORS.EXECUTION
            );
        });

        test('should handle permission error and map to domain error', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'sudo restricted-command',
            };
            const permissionError = Object.assign(new Error('Permission denied'), {
                code: 'EACCES',
            });
            const domainError = {
                message: 'Permission denied',
                errorInfo: EXECUTION_DOMAIN_ERRORS.EXECUTION_PERMISSION,
            };

            mockExeca.mockRejectedValue(permissionError);
            mockCreateExecutionError.mockReturnValue(domainError as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({
                success: false,
                error: domainError,
            });
            expect(mockCreateExecutionError).toHaveBeenCalledWith(
                permissionError,
                EXECUTION_DOMAIN_ERRORS.EXECUTION
            );
        });
    });

    describe('Edge cases', () => {
        test('should handle undefined shell option and use default', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'echo test',
                shell: undefined,
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('echo test', [], {
                shell: true,
                timeout: 300000,
            });
        });

        test('should handle zero timeout and use it', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'quick-command',
                timeoutInMs: 0,
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('quick-command', [], {
                shell: true,
                timeout: 0,
            });
        });

        test('should handle empty environment object', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'env-test',
                env: {},
            };
            mockExeca.mockResolvedValue({} as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockExeca).toHaveBeenCalledWith('env-test', [], {
                shell: true,
                timeout: 300000,
                env: { ...process.env },
            });
        });

        test('should handle unknown error types', async () => {
            // Arrange
            const executionCommand: PostExecutionCommand = {
                command: 'unknown-error-command',
            };
            const unknownError = 'string error';
            const domainError = {
                message: 'Unknown error',
                errorInfo: EXECUTION_DOMAIN_ERRORS.EXECUTION,
            };

            mockExeca.mockRejectedValue(unknownError);
            mockCreateExecutionError.mockReturnValue(domainError as any);

            // Act
            const result = await executeCommand(executionCommand);

            // Assert
            expect(result).toEqual({
                success: false,
                error: domainError,
            });
            expect(mockCreateExecutionError).toHaveBeenCalledWith(
                unknownError,
                EXECUTION_DOMAIN_ERRORS.EXECUTION
            );
        });
    });
});
