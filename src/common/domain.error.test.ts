import type { DomainErrorInfo } from './domain-error-info.interface';
import { DomainError } from './domain.error';

describe('domain.error', () => {
    const baseType: DomainErrorInfo = {
        key: 'TEST_ERROR',
        message: 'Test error occurred',
        description: 'A test error for unit testing',
    };

    test('should construct with DomainErrorType and assign properties', () => {
        // Arrange & Act
        const error = new DomainError(baseType);

        // Assert
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(Error);
        expect(error.domainErrorInfo.key).toBe(baseType.key);
        expect(error.message).toBe(baseType.message);
        expect(error.domainErrorInfo.description).toBe(baseType.description);
        expect(error.name).toBe('DomainError');
        expect(error.cause).toBeUndefined();
    });

    test('should assign cause when provided in options', () => {
        // Arrange
        const cause = new Error('Root cause');
        const error = new DomainError(baseType, { cause });

        // Assert
        expect(error.cause).toBe(cause);
    });

    test('should handle missing description in DomainErrorType', () => {
        // Arrange
        const typeNoDesc: DomainErrorInfo = {
            key: 'NO_DESC',
            message: 'No description error',
        };
        const error = new DomainError(typeNoDesc);

        // Assert
        expect(error.domainErrorInfo.description).toBeUndefined();
        expect(error.domainErrorInfo.key).toBe('NO_DESC');
        expect(error.message).toBe('No description error');
    });

    test('should throw and catch DomainError', () => {
        // Arrange
        const type: DomainErrorInfo = {
            key: 'THROW_TEST',
            message: 'Throw test',
        };

        // Act & Assert
        try {
            throw new DomainError(type);
        } catch (err) {
            expect(err).toBeInstanceOf(DomainError);
            expect((err as DomainError).domainErrorInfo.key).toBe('THROW_TEST');
            expect((err as DomainError).message).toBe('Throw test');
        }
    });

    test('should allow unknown cause type', () => {
        // Arrange
        const error = new DomainError(baseType, { cause: 42 });

        // Assert
        expect(error.cause).toBe(42);
    });

    test('should preserve stack trace', () => {
        // Arrange
        const error = new DomainError(baseType);

        // Assert
        expect(error.stack).toBeDefined();
        expect(typeof error.stack).toBe('string');
    });
});
