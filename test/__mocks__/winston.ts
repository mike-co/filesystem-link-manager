const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
};

const winston = {
    createLogger: jest.fn(() => mockLogger),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        errors: jest.fn(),
        json: jest.fn(),
        printf: jest.fn(),
    },
    transports: {
        Console: jest.fn(),
    },
};

module.exports = winston;
