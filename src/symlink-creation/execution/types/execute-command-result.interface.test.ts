import { DomainError } from '../../../common';
import { ExecuteCommandResult } from './execute-command-result.interface';

describe('execute-command-result.interface', () => {
    describe('Construction', () => {
        test('should allow creation of successful result', () => {
            // Arrange & Act
            const result: ExecuteCommandResult = {
                success: true,
            };

            // Assert
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should allow creation of failed result with error', () => {
            // Arrange
            const mockError = new DomainError(
                { key: 'TEST_ERROR', message: 'Test error', description: 'Test description' },
                { cause: new Error('Original error') }
            );

            // Act
            const result: ExecuteCommandResult = {
                success: false,
                error: mockError,
            };

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe(mockError);
        });

        test('should allow creation of failed result without error', () => {
            // Arrange & Act
            const result: ExecuteCommandResult = {
                success: false,
            };

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBeUndefined();
        });
    });

    describe('Type checking', () => {
        test('should enforce boolean type for success property', () => {
            // Arrange & Act
            const result: ExecuteCommandResult = {
                success: true,
            };

            // Assert
            expect(typeof result.success).toBe('boolean');
        });

        test('should allow DomainError type for error property', () => {
            // Arrange
            const domainError = new DomainError(
                {
                    key: 'DOMAIN_ERROR',
                    message: 'Domain error message',
                    description: 'Error description',
                },
                { cause: new Error('Cause error') }
            );

            // Act
            const result: ExecuteCommandResult = {
                success: false,
                error: domainError,
            };

            // Assert
            expect(result.error).toBeInstanceOf(DomainError);
            expect(result.error?.domainErrorInfo.key).toBe('DOMAIN_ERROR');
        });

        test('should allow undefined for error property', () => {
            // Arrange & Act
            const result: ExecuteCommandResult = {
                success: true,
                error: undefined,
            };

            // Assert
            expect(result.error).toBeUndefined();
        });
    });

    describe('Interface completeness', () => {
        test('should contain only expected properties', () => {
            // Arrange
            const result: ExecuteCommandResult = {
                success: true,
            };

            // Act
            const keys = Object.keys(result);

            // Assert
            expect(keys).toEqual(['success']);
        });

        test('should contain expected properties when error is present', () => {
            // Arrange
            const mockError = new DomainError(
                { key: 'TEST', message: 'Test', description: 'Test desc' },
                {}
            );
            const result: ExecuteCommandResult = {
                success: false,
                error: mockError,
            };

            // Act
            const keys = Object.keys(result);

            // Assert
            expect(keys).toContain('success');
            expect(keys).toContain('error');
            expect(keys).toHaveLength(2);
        });
    });

    describe('Common usage patterns', () => {
        test('should support successful execution result pattern', () => {
            // Arrange & Act
            const successResult: ExecuteCommandResult = {
                success: true,
            };

            // Assert
            if (successResult.success) {
                expect(successResult.error).toBeUndefined();
            }
        });

        test('should support failed execution result pattern', () => {
            // Arrange
            const error = new DomainError(
                {
                    key: 'EXECUTION_FAILED',
                    message: 'Execution failed',
                    description: 'Command execution failed',
                },
                { cause: new Error('Command not found') }
            );

            // Act
            const failureResult: ExecuteCommandResult = {
                success: false,
                error,
            };

            // Assert
            if (!failureResult.success) {
                expect(failureResult.error).toBeDefined();
                expect(failureResult.error?.domainErrorInfo.key).toBe('EXECUTION_FAILED');
            }
        });

        test('should support type narrowing based on success flag', () => {
            // Arrange
            const results: ExecuteCommandResult[] = [
                { success: true },
                {
                    success: false,
                    error: new DomainError(
                        {
                            key: 'ERROR',
                            message: 'Error occurred',
                            description: 'An error occurred',
                        },
                        {}
                    ),
                },
            ];

            // Act & Assert
            results.forEach(result => {
                if (result.success) {
                    // In successful case, error should be undefined or not present
                    expect(result.error).toBeUndefined();
                } else {
                    // In failure case, error may or may not be present
                    if (result.error) {
                        expect(result.error).toBeInstanceOf(DomainError);
                    }
                }
            });
        });
    });
});
