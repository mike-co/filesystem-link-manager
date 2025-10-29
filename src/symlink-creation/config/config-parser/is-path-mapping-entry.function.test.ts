import { isPathMappingEntry } from './is-path-mapping-entry.function';

describe('is-path-mapping-entry.function', () => {
    test('should return true when value contains string sourcePath and destinationPath', () => {
        // Arrange
        const value = {
            sourcePath: 'src/components/Button.tsx',
            destinationPath: 'lib/components/Button.tsx',
        };

        // Act
        const result = isPathMappingEntry(value);

        // Assert
        expect(result).toBe(true);
    });

    test('should return false when value is null', () => {
        // Arrange
        const value = null;

        // Act
        const result = isPathMappingEntry(value);

        // Assert
        expect(result).toBe(false);
    });

    test('should return false when destinationPath is missing', () => {
        // Arrange
        const value = {
            sourcePath: 'src/components/Button.tsx',
        };

        // Act
        const result = isPathMappingEntry(value);

        // Assert
        expect(result).toBe(false);
    });

    test('should return false when sourcePath is missing', () => {
        // Arrange
        const value = {
            destinationPath: 'lib/components/Button.tsx',
        };

        // Act
        const result = isPathMappingEntry(value);

        // Assert
        expect(result).toBe(false);
    });
});
