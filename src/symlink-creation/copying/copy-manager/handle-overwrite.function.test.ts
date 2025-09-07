import { handleOverwrite } from './handle-overwrite.function';
import { DomainError } from '../../../common/domain.error';
import { COPYING_DOMAIN_ERRORS } from '../copying-domain-errors.const';
import * as vscode from 'vscode';

// Mock VS Code module
jest.mock('vscode', () => ({
    window: {
        showWarningMessage: jest.fn(),
    },
}));

describe('handle-overwrite.function', () => {
    const expectDomainError = (error: unknown, expectedKey: string) => {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).domainErrorInfo.key).toBe(expectedKey);
    };

    test('should return true when overwrite is allowed', async () => {
        const result = await handleOverwrite('src/file.txt', 'dest/file.txt', {
            silentMode: true,
            defaultOverwriteBehavior: 'overwrite',
        });
        expect(result).toBe(true);
    });

    test('should return false when overwrite is not allowed', async () => {
        const result = await handleOverwrite('src/file.txt', 'dest/file.txt', {
            silentMode: true,
            defaultOverwriteBehavior: 'skip',
        });
        expect(result).toBe(false);
    });

    test('should treat unknown overwrite behavior as overwrite (true)', async () => {
        const result = await handleOverwrite('src/file.txt', 'dest/file.txt', {
            silentMode: true,
            defaultOverwriteBehavior: 'invalid' as any,
        });
        expect(result).toBe(true);
    });

    test('should throw DomainError when error behavior is specified', async () => {
        await expect(
            handleOverwrite('src/file.txt', 'dest/file.txt', {
                silentMode: true,
                defaultOverwriteBehavior: 'error',
            })
        ).rejects.toThrow(DomainError);

        try {
            await handleOverwrite('src/file.txt', 'dest/file.txt', {
                silentMode: true,
                defaultOverwriteBehavior: 'error',
            });
            fail('Expected error to be thrown');
        } catch (error) {
            expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_OVERWRITE.key);
            expect((error as DomainError).message).toContain('Target already exists');
        }
    });

    test('should throw DomainError when sourcePath is empty', async () => {
        await expect(
            handleOverwrite('', 'dest/file.txt', {
                silentMode: true,
                defaultOverwriteBehavior: 'overwrite',
            })
        ).rejects.toThrow(DomainError);

        try {
            await handleOverwrite('', 'dest/file.txt', {
                silentMode: true,
                defaultOverwriteBehavior: 'overwrite',
            });
            fail('Expected error to be thrown');
        } catch (error) {
            expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_TYPE.key);
            expect((error as DomainError).message).toContain(
                'Source path for copy operation is empty'
            );
        }
    });

    test('should throw DomainError when targetPath is empty', async () => {
        await expect(
            handleOverwrite('src/file.txt', '', {
                silentMode: true,
                defaultOverwriteBehavior: 'overwrite',
            })
        ).rejects.toThrow(DomainError);

        try {
            await handleOverwrite('src/file.txt', '', {
                silentMode: true,
                defaultOverwriteBehavior: 'overwrite',
            });
            fail('Expected error to be thrown');
        } catch (error) {
            expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_TYPE.key);
            expect((error as DomainError).message).toContain(
                'Target path for copy operation is empty'
            );
        }
    });

    describe('Interactive mode tests', () => {
        let mockShowWarningMessage: jest.MockedFunction<typeof vscode.window.showWarningMessage>;

        beforeEach(() => {
            jest.clearAllMocks();
            mockShowWarningMessage = vscode.window.showWarningMessage as jest.MockedFunction<
                typeof vscode.window.showWarningMessage
            >;
        });

        test('should return true when user chooses Overwrite in interactive mode', async () => {
            // Arrange
            mockShowWarningMessage.mockResolvedValue('Overwrite' as any);

            // Act
            const result = await handleOverwrite('src/file.txt', 'dest/file.txt', {
                silentMode: false,
            });

            // Assert
            expect(result).toBe(true);
            expect(mockShowWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('already exists'),
                { modal: true },
                'Overwrite',
                'Skip'
            );
        });

        test('should return false when user chooses Skip in interactive mode', async () => {
            // Arrange
            mockShowWarningMessage.mockResolvedValue('Skip' as any);

            // Act
            const result = await handleOverwrite('src/file.txt', 'dest/file.txt', {
                silentMode: false,
            });

            // Assert
            expect(result).toBe(false);
            expect(mockShowWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('already exists'),
                { modal: true },
                'Overwrite',
                'Skip'
            );
        });

        test('should throw DomainError when user chooses Cancel in interactive mode', async () => {
            // Arrange
            mockShowWarningMessage.mockResolvedValue('Cancel' as any);

            // Act & Assert
            await expect(
                handleOverwrite('src/file.txt', 'dest/file.txt', {
                    silentMode: false,
                })
            ).rejects.toThrow(DomainError);

            try {
                await handleOverwrite('src/file.txt', 'dest/file.txt', {
                    silentMode: false,
                });
                fail('Expected error to be thrown');
            } catch (error) {
                expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_OVERWRITE.key);
                expect((error as DomainError).message).toContain(
                    'Copy operation cancelled by user'
                );
            }
        });

        test('should throw DomainError when user dismisses dialog (undefined response) in interactive mode', async () => {
            // Arrange - User dismisses dialog without choosing any option
            mockShowWarningMessage.mockResolvedValue(undefined);

            // Act & Assert
            await expect(
                handleOverwrite('src/file.txt', 'dest/file.txt', {
                    silentMode: false,
                })
            ).rejects.toThrow(DomainError);

            try {
                await handleOverwrite('src/file.txt', 'dest/file.txt', {
                    silentMode: false,
                });
                fail('Expected error to be thrown');
            } catch (error) {
                expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_OVERWRITE.key);
                expect((error as DomainError).message).toContain(
                    'Copy operation cancelled by user'
                );
            }
        });

        test('should include correct file paths in interactive prompt message', async () => {
            // Arrange
            mockShowWarningMessage.mockResolvedValue('Skip' as any);
            const sourcePath = '/source/directory/important-file.txt';
            const targetPath = '/target/directory/existing-file.txt';

            // Act
            await handleOverwrite(sourcePath, targetPath, {
                silentMode: false,
            });

            // Assert
            expect(mockShowWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('existing-file.txt'),
                { modal: true },
                'Overwrite',
                'Skip'
            );

            // Verify the message contains both file names
            const callArgs = mockShowWarningMessage.mock.calls[0];
            if (callArgs) {
                const message = callArgs[0] as string;
                expect(message).toContain('existing-file.txt'); // target file name
                expect(message).toContain('important-file.txt'); // source file name
            }
        });
    });

    describe('Parameter validation tests', () => {
        test('should throw DomainError when sourcePath is whitespace only', async () => {
            // Arrange & Act & Assert
            await expect(
                handleOverwrite('   ', 'dest/file.txt', {
                    silentMode: true,
                    defaultOverwriteBehavior: 'overwrite',
                })
            ).rejects.toThrow(DomainError);

            try {
                await handleOverwrite('   ', 'dest/file.txt', {
                    silentMode: true,
                    defaultOverwriteBehavior: 'overwrite',
                });
                fail('Expected error to be thrown');
            } catch (error) {
                expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_TYPE.key);
                expect((error as DomainError).message).toContain(
                    'Source path for copy operation is empty'
                );
            }
        });

        test('should throw DomainError when targetPath is whitespace only', async () => {
            // Arrange & Act & Assert
            await expect(
                handleOverwrite('src/file.txt', '   ', {
                    silentMode: true,
                    defaultOverwriteBehavior: 'overwrite',
                })
            ).rejects.toThrow(DomainError);

            try {
                await handleOverwrite('src/file.txt', '   ', {
                    silentMode: true,
                    defaultOverwriteBehavior: 'overwrite',
                });
                fail('Expected error to be thrown');
            } catch (error) {
                expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_TYPE.key);
                expect((error as DomainError).message).toContain(
                    'Target path for copy operation is empty'
                );
            }
        });

        test('should default to overwrite behavior when no defaultOverwriteBehavior is specified', async () => {
            // Arrange & Act
            const result = await handleOverwrite('src/file.txt', 'dest/file.txt', {
                silentMode: true,
                // No defaultOverwriteBehavior specified
            });

            // Assert
            expect(result).toBe(true); // Should default to overwrite
        });
    });
});
