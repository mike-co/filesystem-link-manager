/**
 * VS Code API Mock for testing
 * Provides Jest mock implementations of VS Code APIs with proper typing
 */

// Mock VS Code API for testing
export const commands = {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }) as jest.MockedFunction<any>,
    executeCommand: jest.fn() as jest.MockedFunction<any>,
};

export const window = {
    showInformationMessage: jest
        .fn()
        .mockReturnValue(Promise.resolve(undefined)) as jest.MockedFunction<any>,
    showWarningMessage: jest
        .fn()
        .mockReturnValue(Promise.resolve(undefined)) as jest.MockedFunction<any>,
    showErrorMessage: jest
        .fn()
        .mockReturnValue(Promise.resolve(undefined)) as jest.MockedFunction<any>,
    showOpenDialog: jest.fn().mockResolvedValue(undefined) as jest.MockedFunction<any>,
    createOutputChannel: jest.fn(() => ({
        appendLine: jest.fn(),
        show: jest.fn(),
    })) as jest.MockedFunction<any>,
    withProgress: jest.fn((_options, task) =>
        task({ report: jest.fn() }, { isCancellationRequested: false })
    ) as jest.MockedFunction<any>,
};

export const Uri = {
    file: jest.fn((path: string) => ({ fsPath: path })),
    parse: jest.fn(),
};

export const workspace = {
    findFiles: jest.fn(),
    getConfiguration: jest.fn(() => ({
        get: jest.fn(),
    })),
    workspaceFolders: [
        {
            uri: Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0,
        },
    ],
};

export const Disposable = jest.fn(() => ({
    dispose: jest.fn(),
}));

export const ExtensionContext = jest.fn();

export const ProgressLocation = {
    SourceControl: 1,
    Window: 10,
    Notification: 15,
};

export const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
};

/**
 * Mock CancellationError for VS Code testing
 */
export class CancellationError extends Error {
    /**
     * Creates a new CancellationError instance
     *
     * @param message - Optional error message
     */
    public constructor(message?: string) {
        super(message);
        this.name = 'CancellationError';
    }
}
