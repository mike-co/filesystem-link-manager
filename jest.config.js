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
        '!src/**/*.enum.ts'
    ],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
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
