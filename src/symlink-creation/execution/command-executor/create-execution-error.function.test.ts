import { createExecutionError } from './create-execution-error.function';
import { EXECUTION_DOMAIN_ERRORS } from '../execution-domain-errors.const';
import { DomainError } from '../../../common/domain.error';

describe('create-execution-error.function', () => {
    describe('Error mapping from system errors to domain errors', () => {
        test('should map ENOENT error code to EXECUTION_ACCESS domain error', () => {
            // Arrange
            const systemError = Object.assign(new Error('File not found'), { code: 'ENOENT' });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_ACCESS);
            expect(result.cause).toBe(systemError);
        });

        test('should map EACCES error code to EXECUTION_PERMISSION domain error', () => {
            // Arrange
            const systemError = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_PERMISSION);
            expect(result.cause).toBe(systemError);
        });

        test('should map ETIME error code to EXECUTION_TIMEOUT domain error', () => {
            // Arrange
            const systemError = Object.assign(new Error('Operation timed out'), { code: 'ETIME' });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_TIMEOUT);
            expect(result.cause).toBe(systemError);
        });

        test('should map ETIMEDOUT error code to EXECUTION_TIMEOUT domain error', () => {
            // Arrange
            const systemError = Object.assign(new Error('Connection timeout'), {
                code: 'ETIMEDOUT',
            });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_TIMEOUT);
            expect(result.cause).toBe(systemError);
        });

        test('should map ENOTDIR error code to EXECUTION_TIMEOUT domain error', () => {
            // Arrange
            const systemError = Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_TIMEOUT);
            expect(result.cause).toBe(systemError);
        });
    });

    describe('Default error handling', () => {
        test('should use default error type for unmapped error codes', () => {
            // Arrange
            const systemError = Object.assign(new Error('Unknown error'), { code: 'EUNKNOWN' });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(defaultErrorType);
            expect(result.cause).toBe(systemError);
        });

        test('should use default error type for errors without code property', () => {
            // Arrange
            const systemError = new Error('Error without code');
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(defaultErrorType);
            expect(result.cause).toBe(systemError);
        });

        test('should handle non-Error objects with string fallback', () => {
            // Arrange
            const nonErrorObject = 'String error message';
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(nonErrorObject, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(defaultErrorType);
            expect(result.cause).toBeInstanceOf(Error);
            expect((result.cause as Error).message).toBe('Unknown error');
        });

        test('should handle null/undefined inputs with Error fallback', () => {
            // Arrange
            const nullError = null;
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(nullError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(defaultErrorType);
            expect(result.cause).toBeInstanceOf(Error);
            expect((result.cause as Error).message).toBe('Unknown error');
        });
    });

    describe('Edge case validation', () => {
        test('should handle EPERM error code mapping to EXECUTION_PERMISSION', () => {
            // Arrange
            const systemError = Object.assign(new Error('Operation not permitted'), {
                code: 'EPERM',
            });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_PERMISSION);
            expect(result.cause).toBe(systemError);
        });

        test('should handle EISDIR error code mapping to EXECUTION_ACCESS', () => {
            // Arrange
            const systemError = Object.assign(new Error('Is a directory'), { code: 'EISDIR' });
            const defaultErrorType = EXECUTION_DOMAIN_ERRORS.EXECUTION;

            // Act
            const result = createExecutionError(systemError, defaultErrorType);

            // Assert
            expect(result).toBeInstanceOf(DomainError);
            expect(result.domainErrorInfo).toEqual(EXECUTION_DOMAIN_ERRORS.EXECUTION_ACCESS);
            expect(result.cause).toBe(systemError);
        });
    });
});
