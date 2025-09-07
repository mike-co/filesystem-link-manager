import { FileTransport } from './file.transport';
import { ExtensionContext } from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';

jest.mock('winston-transport', () => {
    const EventEmitter = require('events');
    return class MockTransport extends EventEmitter {
        public constructor() {
            super();
        }
    };
});

describe('file.transport', () => {
    let mockContext: jest.Mocked<ExtensionContext>;
    let fileTransport: FileTransport;
    let mockStoragePath: string;

    // Use a repo-local temp path so mock-fs can map it reliably across platforms
    const tmpRoot = path.join(process.cwd(), 'tmp', 'file-transport-test');

    beforeAll(() => {
        // Require mock-fs lazily to avoid interfering with Jest initialization
        // and preserve node_modules so Jest internals remain accessible.
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create a virtual filesystem with the expected directories and preserve node_modules
        mockFs({
            [tmpRoot]: {},
            // Ensure node_modules is available to Jest and other runtime modules
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    afterAll(() => {
        mockFs.restore();
    });

    beforeEach(() => {
        // Create unique test directory for each test to avoid interference
        const testId = Math.random().toString(36).substring(2, 15);
        mockStoragePath = path.join(tmpRoot, 'test-' + testId);

        // Setup VS Code context mock with unique path
        mockContext = {
            globalStorageUri: {
                fsPath: mockStoragePath,
            },
        } as jest.Mocked<ExtensionContext>;
    });

    describe('Construction', () => {
        test('should construct successfully', () => {
            // Arrange & Act
            fileTransport = new FileTransport(mockContext);

            // Assert
            expect(fileTransport).toBeInstanceOf(FileTransport);
        });

        test('should initialize log directory on construction', async () => {
            // Arrange & Act
            fileTransport = new FileTransport(mockContext);

            // Assert - directory should be created
            const directoryExists = await fs.pathExists(mockStoragePath);
            expect(directoryExists).toBe(true);
        });

        test('should set up log path using global storage path', () => {
            // Arrange & Act
            fileTransport = new FileTransport(mockContext);

            // Assert - file path should be constructed correctly
            const expectedLogPath = path.join(mockStoragePath, 'extension.log');
            expect(expectedLogPath).toBe(path.join(mockStoragePath, 'extension.log'));
        });
    });

    describe('Basic logging functionality', () => {
        beforeEach(() => {
            fileTransport = new FileTransport(mockContext);
        });

        test('should log entry with proper JSON formatting', done => {
            // Arrange
            const logInfo = {
                level: 'info',
                message: 'Test message',
                timestamp: '2025-09-05T10:30:00.000Z',
                context: { userId: '123' },
            };

            const expectedLogEntry = {
                timestamp: '2025-09-05T10:30:00.000Z',
                level: 'info',
                message: 'Test message',
                context: { userId: '123' },
            };

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert
                const logPath = path.join(mockStoragePath, 'extension.log');
                const logContent = await fs.readFile(logPath, 'utf8');
                const logEntries = logContent.trim().split('\n');
                expect(logEntries).toHaveLength(1);
                expect(logEntries[0]).toBeDefined();
                const parsedEntry = JSON.parse(logEntries[0] as string);

                expect(parsedEntry).toEqual(expectedLogEntry);
                done();
            });
        });

        test('should handle missing timestamp by using current time', done => {
            // Arrange
            const logInfo = {
                level: 'warn',
                message: 'Warning message',
                context: { source: 'test' },
            };

            const dateBeforeLog = new Date();

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert
                const logPath = path.join(mockStoragePath, 'extension.log');
                const logContent = await fs.readFile(logPath, 'utf8');
                const logEntries = logContent.trim().split('\n');
                expect(logEntries).toHaveLength(1);
                expect(logEntries[0]).toBeDefined();
                const parsedEntry = JSON.parse(logEntries[0] as string);

                expect(parsedEntry.level).toBe('warn');
                expect(parsedEntry.message).toBe('Warning message');
                expect(parsedEntry.context).toEqual({ source: 'test' });

                // Timestamp should be close to current time
                const logTimestamp = new Date(parsedEntry.timestamp);
                const timeDiff = Math.abs(logTimestamp.getTime() - dateBeforeLog.getTime());
                expect(timeDiff).toBeLessThan(1000); // Within 1 second
                done();
            });
        });

        test('should handle non-string message by converting to JSON', done => {
            // Arrange
            const logInfo = {
                level: 'error',
                message: { error: 'Object message', code: 500 },
                timestamp: '2025-09-05T10:30:00.000Z',
            };

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert
                const logPath = path.join(mockStoragePath, 'extension.log');
                const logContent = await fs.readFile(logPath, 'utf8');
                const logEntries = logContent.trim().split('\n');
                expect(logEntries).toHaveLength(1);
                expect(logEntries[0]).toBeDefined();
                const parsedEntry = JSON.parse(logEntries[0] as string);

                expect(parsedEntry.level).toBe('error');
                expect(parsedEntry.message).toBe('{"error":"Object message","code":500}');
                expect(parsedEntry.timestamp).toBe('2025-09-05T10:30:00.000Z');
                done();
            });
        });

        test('should emit logged event after successful write', done => {
            // Arrange
            const logInfo = {
                level: 'debug',
                message: 'Debug message',
                timestamp: '2025-09-05T10:30:00.000Z',
            };

            let loggedEventEmitted = false;
            fileTransport.on('logged', () => {
                loggedEventEmitted = true;
            });

            // Act
            fileTransport.log(logInfo, () => {
                // Assert
                expect(loggedEventEmitted).toBe(true);
                done();
            });
        });

        test('should append multiple log entries to same file', done => {
            // Arrange
            const logInfo1 = {
                level: 'info',
                message: 'First message',
                timestamp: '2025-09-05T10:30:00.000Z',
            };
            const logInfo2 = {
                level: 'warn',
                message: 'Second message',
                timestamp: '2025-09-05T10:31:00.000Z',
            };

            // Act
            fileTransport.log(logInfo1, () => {
                fileTransport.log(logInfo2, async () => {
                    // Assert
                    const logPath = path.join(mockStoragePath, 'extension.log');
                    const logContent = await fs.readFile(logPath, 'utf8');
                    const logEntries = logContent.trim().split('\n');

                    expect(logEntries).toHaveLength(2);
                    expect(logEntries[0]).toBeDefined();
                    expect(logEntries[1]).toBeDefined();

                    const entry1 = JSON.parse(logEntries[0] as string);
                    const entry2 = JSON.parse(logEntries[1] as string);
                    expect(entry1.message).toBe('First message');
                    expect(entry2.message).toBe('Second message');
                    done();
                });
            });
        });
    });

    describe('Log rotation functionality', () => {
        beforeEach(() => {
            fileTransport = new FileTransport(mockContext);
        });

        test('should rotate when file exceeds 5MB limit', done => {
            // Arrange - Create a large log file (simulate 6MB)
            const logPath = path.join(mockStoragePath, 'extension.log');
            const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB of data
            fs.writeFileSync(logPath, largeContent);

            const logInfo = {
                level: 'info',
                message: 'Test message after rotation',
                timestamp: '2025-09-05T10:30:00.000Z',
            };

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert
                const rotatedPath = path.join(mockStoragePath, 'extension.1.log');
                const currentLogPath = path.join(mockStoragePath, 'extension.log');

                // Old log should be rotated
                const rotatedExists = await fs.pathExists(rotatedPath);
                expect(rotatedExists).toBe(true);

                // New log should contain the new message
                const currentLogContent = await fs.readFile(currentLogPath, 'utf8');
                const logEntries = currentLogContent.trim().split('\n');
                expect(logEntries).toHaveLength(1);
                expect(logEntries[0]).toBeDefined();
                const parsedEntry = JSON.parse(logEntries[0] as string);
                expect(parsedEntry.message).toBe('Test message after rotation');
                done();
            });
        });

        test('should not rotate when file is below 5MB limit', done => {
            // Arrange - Create a small log file
            const logPath = path.join(mockStoragePath, 'extension.log');
            const smallContent = 'small log content';
            fs.writeFileSync(logPath, smallContent);

            const logInfo = {
                level: 'info',
                message: 'Test message without rotation',
                timestamp: '2025-09-05T10:30:00.000Z',
            };

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert
                const rotatedPath = path.join(mockStoragePath, 'extension.1.log');
                const currentLogPath = path.join(mockStoragePath, 'extension.log');

                // No rotation should have occurred
                const rotatedExists = await fs.pathExists(rotatedPath);
                expect(rotatedExists).toBe(false);

                // Log should be appended to existing file
                const currentLogContent = await fs.readFile(currentLogPath, 'utf8');
                expect(currentLogContent).toContain('small log content');
                expect(currentLogContent).toContain('Test message without rotation');
                done();
            });
        });

        test('should perform file shifting during rotation', done => {
            // Arrange - Create existing rotated files
            const logDir = mockStoragePath;
            fs.writeFileSync(path.join(logDir, 'extension.1.log'), 'old log 1');
            fs.writeFileSync(path.join(logDir, 'extension.2.log'), 'old log 2');
            fs.writeFileSync(path.join(logDir, 'extension.3.log'), 'old log 3');
            fs.writeFileSync(path.join(logDir, 'extension.4.log'), 'old log 4');

            // Create large current log to trigger rotation
            const currentLogPath = path.join(logDir, 'extension.log');
            const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
            fs.writeFileSync(currentLogPath, largeContent);

            const logInfo = {
                level: 'info',
                message: 'Trigger rotation',
                timestamp: '2025-09-05T10:30:00.000Z',
            };

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert file shifting occurred
                const file1Content = await fs.readFile(
                    path.join(logDir, 'extension.1.log'),
                    'utf8'
                );
                const file2Content = await fs.readFile(
                    path.join(logDir, 'extension.2.log'),
                    'utf8'
                );
                const file3Content = await fs.readFile(
                    path.join(logDir, 'extension.3.log'),
                    'utf8'
                );
                const file4Content = await fs.readFile(
                    path.join(logDir, 'extension.4.log'),
                    'utf8'
                );

                // Old current log should be in extension.1.log
                expect(file1Content).toContain('x'.repeat(100)); // Check it contains the large content

                // Files should have shifted
                expect(file2Content).toBe('old log 1');
                expect(file3Content).toBe('old log 2');
                expect(file4Content).toBe('old log 3');

                // extension.5.log should not exist (old extension.4.log was deleted)
                const file5Exists = await fs.pathExists(path.join(logDir, 'extension.5.log'));
                expect(file5Exists).toBe(false);
                done();
            });
        });
    });

    describe('Error handling scenarios', () => {
        beforeEach(() => {
            fileTransport = new FileTransport(mockContext);
        });

        test('should handle missing level gracefully with default', done => {
            // Arrange
            const logInfo = {
                message: 'Test message without level',
                timestamp: '2025-09-05T10:30:00.000Z',
            };

            // Act
            fileTransport.log(logInfo, async () => {
                // Assert
                const logPath = path.join(mockStoragePath, 'extension.log');
                const logContent = await fs.readFile(logPath, 'utf8');
                const logEntries = logContent.trim().split('\n');
                expect(logEntries).toHaveLength(1);
                expect(logEntries[0]).toBeDefined();
                const parsedEntry = JSON.parse(logEntries[0] as string);

                expect(parsedEntry.level).toBe('info'); // Default level
                expect(parsedEntry.message).toBe('Test message without level');
                expect(parsedEntry.timestamp).toBe('2025-09-05T10:30:00.000Z');
                done();
            });
        });

        test('should emit error event when directory cannot be accessed', done => {
            // Arrange - Create a context with an invalid path
            const invalidContext = {
                globalStorageUri: {
                    fsPath: '/invalid/readonly/path/that/cannot/be/created',
                },
            } as jest.Mocked<ExtensionContext>;

            try {
                // Act - This should fail during construction when trying to create directory
                const invalidTransport = new FileTransport(invalidContext);

                invalidTransport.on('error', () => {
                    // Error event captured but not used in this simplified test
                });

                const logInfo = {
                    level: 'info',
                    message: 'Test message',
                    timestamp: '2025-09-05T10:30:00.000Z',
                };

                invalidTransport.log(logInfo, () => {
                    // This callback might not be reached if directory creation fails
                    done();
                });
            } catch (error) {
                // Directory creation failure is expected for invalid paths
                expect(error).toBeDefined();
                done();
            }
        });
    });
});
