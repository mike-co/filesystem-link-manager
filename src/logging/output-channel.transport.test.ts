import { OutputChannelTransport } from './output-channel.transport';

const mockOutputChannel = {
    appendLine: jest.fn(),
    append: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    name: 'Test Channel',
    replace: jest.fn(),
};

describe('OutputChannelTransport', () => {
    let transport: OutputChannelTransport;

    beforeEach(() => {
        jest.clearAllMocks();
        transport = new OutputChannelTransport(mockOutputChannel as any);
    });

    test('should create transport with OutputChannel', () => {
        expect(transport).toBeInstanceOf(OutputChannelTransport);
    });

    test('should format and log simple message', done => {
        const logInfo = {
            level: 'info',
            message: 'Test message',
            timestamp: '2023-01-01T00:00:00.000Z',
        };

        transport.log(logInfo, () => {
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '[2023-01-01T00:00:00.000Z] [INFO] Test message'
            );
            done();
        });
    });

    test('should format message with context', done => {
        const logInfo = {
            level: 'error',
            message: 'Error occurred',
            timestamp: '2023-01-01T00:00:00.000Z',
            context: {
                operation: 'testOperation',
                filePath: '/test/path',
            },
        };

        transport.log(logInfo, () => {
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '[2023-01-01T00:00:00.000Z] [ERROR] Error occurred [operation="testOperation", filePath="/test/path"]'
            );
            done();
        });
    });

    test('should handle missing timestamp by generating one', done => {
        const logInfo = {
            level: 'debug',
            message: 'Debug message',
        };

        transport.log(logInfo, () => {
            const call = mockOutputChannel.appendLine.mock.calls[0][0];
            expect(call).toMatch(
                /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] Debug message$/
            );
            done();
        });
    });

    test('should handle non-string messages by JSON stringifying', done => {
        const logInfo = {
            level: 'warn',
            message: { type: 'complex', data: [1, 2, 3] },
            timestamp: '2023-01-01T00:00:00.000Z',
        };

        transport.log(logInfo, () => {
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '[2023-01-01T00:00:00.000Z] [WARN] {"type":"complex","data":[1,2,3]}'
            );
            done();
        });
    });

    test('should filter out undefined context values', done => {
        const logInfo = {
            level: 'info',
            message: 'Test message',
            timestamp: '2023-01-01T00:00:00.000Z',
            context: {
                operation: 'testOperation',
                filePath: undefined,
                targetPath: '/target',
            },
        };

        transport.log(logInfo, () => {
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                '[2023-01-01T00:00:00.000Z] [INFO] Test message [operation="testOperation", targetPath="/target"]'
            );
            done();
        });
    });

    test('should emit logged event after successful write', done => {
        const logInfo = {
            level: 'info',
            message: 'Test message',
        };

        let loggedEventEmitted = false;
        transport.on('logged', info => {
            expect(info).toBe(logInfo);
            loggedEventEmitted = true;
        });

        transport.log(logInfo, () => {
            expect(loggedEventEmitted).toBe(true);
            done();
        });
    });

    test('should emit error event when appendLine throws', done => {
        const logInfo = {
            level: 'info',
            message: 'Test message',
        };

        const error = new Error('OutputChannel error');
        mockOutputChannel.appendLine.mockImplementationOnce(() => {
            throw error;
        });

        let errorEventEmitted = false;
        transport.on('error', err => {
            expect(err).toBe(error);
            errorEventEmitted = true;
        });

        transport.log(logInfo, () => {
            expect(errorEventEmitted).toBe(true);
            done();
        });
    });
});
