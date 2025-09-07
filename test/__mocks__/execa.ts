/**
 * Mock for execa library to handle ES module imports in Jest
 */

const mockExecaResult = {
    stdout: '',
    stderr: '',
    exitCode: 0,
    command: '',
    escapedCommand: '',
    cwd: '',
    failed: false,
    timedOut: false,
    isCanceled: false,
    killed: false,
    signal: undefined,
    signalDescription: undefined,
    all: undefined,
    pipe: jest.fn(),
    kill: jest.fn(),
};

export const $$ = jest.fn(() => Promise.resolve(mockExecaResult));
export const $ = jest.fn(() => Promise.resolve(mockExecaResult));
export const execa = jest.fn(() => Promise.resolve(mockExecaResult));

export default jest.fn(() => Promise.resolve(mockExecaResult));
