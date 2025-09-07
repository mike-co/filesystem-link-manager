import { LoggerService } from './logger.service';
import { LogContext } from './log-context.interface';
import { LogLevel } from './log-level.enum';
import { OutputChannelTransport } from './output-channel.transport';
import { FileTransport } from './file.transport';
import winston from 'winston';

jest.mock('winston');

describe('logger.service', () => {
    let serviceUnderTest: LoggerService;
    let mockOutputChannelTransport: jest.Mocked<OutputChannelTransport>;
    let mockFileTransport: jest.Mocked<FileTransport>;
    let mockWinstonLogger: jest.Mocked<winston.Logger>;
    let mockWinston: jest.Mocked<typeof winston>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup winston mock
        mockWinston = winston as jest.Mocked<typeof winston>;
        mockWinstonLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            level: 'info',
        } as unknown as jest.Mocked<winston.Logger>;

        mockWinston.createLogger = jest.fn().mockReturnValue(mockWinstonLogger);
        (mockWinston as any).format = {
            combine: jest.fn().mockReturnValue({}),
            timestamp: jest.fn().mockReturnValue({}),
            errors: jest.fn().mockReturnValue({}),
            json: jest.fn().mockReturnValue({}),
        };
        (mockWinston as any).transports = {
            Console: jest.fn().mockImplementation(() => ({})),
        };

        // Setup transport mocks
        mockOutputChannelTransport = {
            log: jest.fn(),
            close: jest.fn(),
        } as unknown as jest.Mocked<OutputChannelTransport>;

        mockFileTransport = {
            log: jest.fn(),
            close: jest.fn(),
        } as unknown as jest.Mocked<FileTransport>;

        // Create service instance
        serviceUnderTest = new LoggerService(mockOutputChannelTransport, mockFileTransport);
    });

    describe('Construction', () => {
        test('should construct successfully', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(LoggerService);
        });

        test('should create winston logger with proper configuration', () => {
            // Arrange & Act (constructor already called in beforeEach)

            // Assert
            expect(mockWinston.createLogger).toHaveBeenCalledWith({
                format: expect.any(Object),
                transports: expect.arrayContaining([
                    expect.any(Object), // Console transport
                    mockOutputChannelTransport,
                    mockFileTransport,
                ]),
            });
        });

        test('should configure winston format with timestamp, errors, and json', () => {
            // Arrange & Act (constructor already called in beforeEach)

            // Assert
            expect((mockWinston as any).format.combine).toHaveBeenCalled();
            expect((mockWinston as any).format.timestamp).toHaveBeenCalled();
            expect((mockWinston as any).format.errors).toHaveBeenCalledWith({ stack: true });
            expect((mockWinston as any).format.json).toHaveBeenCalled();
        });
    });

    describe('Error logging', () => {
        test('should log error message with context and timestamp', () => {
            // Arrange
            const message = 'Test error message';
            const context: LogContext = {
                operation: 'testOperation',
                filePath: '/test/file.txt',
            };
            const mockTimestamp = '2025-01-01T12:00:00.000Z';
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

            // Act
            serviceUnderTest.error(message, context);

            // Assert
            expect(mockWinstonLogger.error).toHaveBeenCalledWith({
                message,
                context,
                timestamp: mockTimestamp,
            });
        });

        test('should handle error logging with empty context', () => {
            // Arrange
            const message = 'Error with empty context';
            const context: LogContext = { operation: 'emptyTest' };

            // Act
            serviceUnderTest.error(message, context);

            // Assert
            expect(mockWinstonLogger.error).toHaveBeenCalledWith({
                message,
                context,
                timestamp: expect.any(String),
            });
        });
    });

    describe('Warning logging', () => {
        test('should log warning message with context and timestamp', () => {
            // Arrange
            const message = 'Test warning message';
            const context: LogContext = {
                operation: 'testWarning',
                targetPath: '/test/target.txt',
            };
            const mockTimestamp = '2025-01-01T12:00:00.000Z';
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

            // Act
            serviceUnderTest.warn(message, context);

            // Assert
            expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
                message,
                context,
                timestamp: mockTimestamp,
            });
        });
    });

    describe('Info logging', () => {
        test('should log info message with context and timestamp', () => {
            // Arrange
            const message = 'Test info message';
            const context: LogContext = {
                operation: 'testInfo',
                processedCount: 5,
            };
            const mockTimestamp = '2025-01-01T12:00:00.000Z';
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

            // Act
            serviceUnderTest.info(message, context);

            // Assert
            expect(mockWinstonLogger.info).toHaveBeenCalledWith({
                message,
                context,
                timestamp: mockTimestamp,
            });
        });
    });

    describe('Debug logging', () => {
        test('should log debug message with context and timestamp', () => {
            // Arrange
            const message = 'Test debug message';
            const context: LogContext = {
                operation: 'testDebug',
                command: 'test-command',
                workingDirectory: '/test/dir',
            };
            const mockTimestamp = '2025-01-01T12:00:00.000Z';
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

            // Act
            serviceUnderTest.debug(message, context);

            // Assert
            expect(mockWinstonLogger.debug).toHaveBeenCalledWith({
                message,
                context,
                timestamp: mockTimestamp,
            });
        });
    });

    describe('Log level management', () => {
        test('should set log level on winston logger', () => {
            // Arrange
            const level = LogLevel.DEBUG;

            // Act
            serviceUnderTest.setLevel(level);

            // Assert
            expect(mockWinstonLogger.level).toBe(level);
        });

        test('should set error log level', () => {
            // Arrange
            const level = LogLevel.ERROR;

            // Act
            serviceUnderTest.setLevel(level);

            // Assert
            expect(mockWinstonLogger.level).toBe(level);
        });

        test('should get current log level from winston logger', () => {
            // Arrange
            mockWinstonLogger.level = LogLevel.WARN;

            // Act
            const result = serviceUnderTest.getLevel();

            // Assert
            expect(result).toBe(LogLevel.WARN);
        });

        test('should get log level when logger has default level', () => {
            // Arrange
            mockWinstonLogger.level = 'info';

            // Act
            const result = serviceUnderTest.getLevel();

            // Assert
            expect(result).toBe('info');
        });
    });

    describe('Timestamp generation', () => {
        test('should generate ISO timestamp for error logs', () => {
            // Arrange
            const mockTimestamp = '2025-01-01T12:00:00.000Z';
            const mockToISOString = jest
                .spyOn(Date.prototype, 'toISOString')
                .mockReturnValue(mockTimestamp);
            const message = 'Test message';
            const context: LogContext = { operation: 'test' };

            // Act
            serviceUnderTest.error(message, context);

            // Assert
            expect(mockToISOString).toHaveBeenCalled();
            expect(mockWinstonLogger.error).toHaveBeenCalledWith({
                message,
                context,
                timestamp: mockTimestamp,
            });
        });

        test('should generate unique timestamp for each log call', () => {
            // Arrange
            const timestamp1 = '2025-01-01T12:00:00.000Z';
            const timestamp2 = '2025-01-01T12:00:01.000Z';
            const mockToISOString = jest
                .spyOn(Date.prototype, 'toISOString')
                .mockReturnValueOnce(timestamp1)
                .mockReturnValueOnce(timestamp2);
            const context: LogContext = { operation: 'test' };

            // Act
            serviceUnderTest.info('First message', context);
            serviceUnderTest.info('Second message', context);

            // Assert
            expect(mockToISOString).toHaveBeenCalledTimes(2);
            expect(mockWinstonLogger.info).toHaveBeenNthCalledWith(1, {
                message: 'First message',
                context,
                timestamp: timestamp1,
            });
            expect(mockWinstonLogger.info).toHaveBeenNthCalledWith(2, {
                message: 'Second message',
                context,
                timestamp: timestamp2,
            });
        });
    });

    describe('Context handling', () => {
        test('should handle context with all properties', () => {
            // Arrange
            const message = 'Complete context test';
            const context: LogContext = {
                operation: 'fullTest',
                filePath: '/source/file.txt',
                targetPath: '/target/file.txt',
                command: 'ln -s',
                workingDirectory: '/workspace',
                error: new Error('Test error'),
                processedCount: 10,
                customProperty: 'custom value',
            };

            // Act
            serviceUnderTest.info(message, context);

            // Assert
            expect(mockWinstonLogger.info).toHaveBeenCalledWith({
                message,
                context,
                timestamp: expect.any(String),
            });
        });

        test('should handle context with only required operation property', () => {
            // Arrange
            const message = 'Minimal context test';
            const context: LogContext = { operation: 'minimalTest' };

            // Act
            serviceUnderTest.warn(message, context);

            // Assert
            expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
                message,
                context,
                timestamp: expect.any(String),
            });
        });
    });

    describe('Transport integration', () => {
        test('should include both custom transports in logger configuration', () => {
            // Arrange & Act (constructor already called in beforeEach)

            // Assert
            const createLoggerCall = mockWinston.createLogger.mock.calls[0]?.[0];
            expect(createLoggerCall?.transports).toContain(mockOutputChannelTransport);
            expect(createLoggerCall?.transports).toContain(mockFileTransport);
        });

        test('should include console transport in logger configuration', () => {
            // Arrange & Act (constructor already called in beforeEach)

            // Assert
            expect((mockWinston as any).transports.Console).toHaveBeenCalled();
        });
    });
});
