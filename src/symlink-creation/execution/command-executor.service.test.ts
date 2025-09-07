import { LoggerService } from '../../logging';
import { PostExecutionCommand } from '../config';
import { CommandExecutorService } from './command-executor.service';
import * as executeCommandFunction from './command-executor/execute-command.function';
import * as skipIfPathExistsFunction from './command-executor/skip-if-path-exists.function';

jest.mock('./command-executor/execute-command.function');
jest.mock('./command-executor/skip-if-path-exists.function');

describe('command-executor.service', () => {
    let serviceUnderTest: CommandExecutorService;
    let mockLoggerService: jest.Mocked<LoggerService>;
    let mockExecuteCommand: jest.MockedFunction<typeof executeCommandFunction.executeCommand>;
    let mockSkipIfPathExists: jest.MockedFunction<typeof skipIfPathExistsFunction.skipIfPathExists>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock logger service
        mockLoggerService = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as any;

        // Mock function modules
        mockExecuteCommand = executeCommandFunction.executeCommand as jest.MockedFunction<
            typeof executeCommandFunction.executeCommand
        >;
        mockSkipIfPathExists = skipIfPathExistsFunction.skipIfPathExists as jest.MockedFunction<
            typeof skipIfPathExistsFunction.skipIfPathExists
        >;

        serviceUnderTest = new CommandExecutorService(mockLoggerService);
    });

    describe('Construction', () => {
        test('should construct successfully', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(CommandExecutorService);
        });
    });

    describe('Command execution orchestration', () => {
        test('should execute command successfully when no skip condition and command succeeds', async () => {
            // Arrange
            const targetDirectoryPath = '/target/directory';
            const executionCommand: PostExecutionCommand = {
                command: 'npm test',
                cwd: '/working/directory',
            };

            mockExecuteCommand.mockResolvedValue({ success: true });

            // Act
            const result = await serviceUnderTest.executeCommand(
                targetDirectoryPath,
                executionCommand
            );

            // Assert
            expect(result).toBe(true);
            expect(mockExecuteCommand).toHaveBeenCalledWith(executionCommand);
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                'Command executed successfully',
                expect.objectContaining({
                    operation: 'executeCommand',
                    command: 'npm test',
                })
            );
        });

        test('should skip command execution when skipIfPathExists condition is met', async () => {
            // Arrange
            const targetDirectoryPath = '/target/directory';
            const executionCommand: PostExecutionCommand = {
                command: 'npm test',
                skipIfPathExists: 'build/output.js',
            };

            mockSkipIfPathExists.mockResolvedValue(true);

            // Act
            const result = await serviceUnderTest.executeCommand(
                targetDirectoryPath,
                executionCommand
            );

            // Assert
            expect(result).toBe(false);
            expect(mockSkipIfPathExists).toHaveBeenCalledWith(
                targetDirectoryPath,
                'build/output.js'
            );
            expect(mockExecuteCommand).not.toHaveBeenCalled();
            expect(mockLoggerService.info).toHaveBeenCalledWith(
                'Path exists, skipping command execution',
                expect.objectContaining({
                    operation: 'skipIfPathExists',
                    filePath: 'build/output.js',
                })
            );
        });

        test('should execute command when skipIfPathExists condition is not met', async () => {
            // Arrange
            const targetDirectoryPath = '/target/directory';
            const executionCommand: PostExecutionCommand = {
                command: 'npm build',
                skipIfPathExists: 'build/output.js',
            };

            mockSkipIfPathExists.mockResolvedValue(false);
            mockExecuteCommand.mockResolvedValue({ success: true });

            // Act
            const result = await serviceUnderTest.executeCommand(
                targetDirectoryPath,
                executionCommand
            );

            // Assert
            expect(result).toBe(true);
            expect(mockSkipIfPathExists).toHaveBeenCalledWith(
                targetDirectoryPath,
                'build/output.js'
            );
            expect(mockExecuteCommand).toHaveBeenCalledWith(executionCommand);
        });

        test('should return false and log error when command execution fails', async () => {
            // Arrange
            const targetDirectoryPath = '/target/directory';
            const executionCommand: PostExecutionCommand = {
                command: 'npm test',
            };

            const mockError = new Error('Command failed');
            mockExecuteCommand.mockResolvedValue({
                success: false,
                error: mockError as any,
            });

            // Act
            const result = await serviceUnderTest.executeCommand(
                targetDirectoryPath,
                executionCommand
            );

            // Assert
            expect(result).toBe(false);
            expect(mockLoggerService.error).toHaveBeenCalledWith(
                'Command execution failed',
                expect.objectContaining({
                    error: mockError,
                })
            );
        });

        test('should handle command validation failure', async () => {
            // Arrange
            const targetDirectoryPath = '/target/directory';
            const executionCommand: PostExecutionCommand = {
                command: '', // Invalid empty command
            };

            // Act
            const result = await serviceUnderTest.executeCommand(
                targetDirectoryPath,
                executionCommand
            );

            // Assert
            expect(result).toBe(false);
            expect(mockLoggerService.warn).toHaveBeenCalledWith(
                'Command validation failed',
                expect.objectContaining({
                    operation: 'validateCommand',
                    command: '',
                })
            );
        });
    });

    describe('Logging and debugging', () => {
        test('should log debug information during command execution', async () => {
            // Arrange
            const targetDirectoryPath = '/target/directory';
            const executionCommand: PostExecutionCommand = {
                command: 'npm test',
                cwd: '/working/directory',
            };

            mockExecuteCommand.mockResolvedValue({ success: true });

            // Act
            await serviceUnderTest.executeCommand(targetDirectoryPath, executionCommand);

            // Assert
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Command validation passed',
                expect.objectContaining({
                    operation: 'validateCommand',
                    command: 'npm test',
                })
            );
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Executing shell command',
                expect.objectContaining({
                    operation: 'executeCommand',
                    command: 'npm test',
                    workingDirectory: '/working/directory',
                })
            );
        });
    });
});
