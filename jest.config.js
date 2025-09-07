module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/test'],
    testMatch: ['**/src/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
        '!src/**/*.interface.ts',
        '!src/**/*.type.ts',
        '!src/**/*.const.ts',
        '!src/**/*.test.ts',
        '!src/**/*.enum.ts',
        '!src/common/*.ts',
        '!src/logging/*.ts',
        '!src/common/**/*.ts',
        '!src/logging/**/*.ts'
    ],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 88,
            functions: 88,
            lines: 88,
            statements: 88,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^vscode$': '<rootDir>/test/__mocks__/vscode.ts',
        '^execa$': '<rootDir>/test/__mocks__/execa.ts',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(fast-glob|execa)/)',
    ],
    clearMocks: true,
    restoreMocks: true,
};
