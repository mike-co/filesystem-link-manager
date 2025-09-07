import { normalizeDirectoryPaths } from './normalize-directory-paths.function';
import * as path from 'path';

describe('normalize-directory-paths.function', () => {
    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof normalizeDirectoryPaths).toBe('function');
        });
    });

    describe('Empty input handling', () => {
        test('should return empty array when input is empty', () => {
            // Arrange
            const directories: string[] = [];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toEqual([]);
        });

        test('should return empty array when input is null', () => {
            // Arrange
            const directories: string[] = null as any;

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toEqual([]);
        });

        test('should return empty array when input is undefined', () => {
            // Arrange
            const directories: string[] = undefined as any;

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('Single directory handling', () => {
        test('should return single directory unchanged', () => {
            // Arrange
            const directories = ['/project/src'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(path.resolve('/project/src'));
        });

        test('should normalize relative paths to absolute', () => {
            // Arrange
            const directories = ['./src'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toContain('src');
        });
    });

    describe('Duplicate removal', () => {
        test('should remove exact duplicates', () => {
            // Arrange
            const directories = ['/project/src', '/project/src', '/project/test'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toContain(path.resolve('/project/src'));
            expect(result).toContain(path.resolve('/project/test'));
        });

        test('should handle case-sensitive duplicates correctly', () => {
            // Arrange
            const directories = ['/project/SRC', '/project/src'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toContain(path.resolve('/project/SRC'));
            expect(result).toContain(path.resolve('/project/src'));
        });
    });

    describe('Parent-child relationship handling', () => {
        test('should remove child directory when parent is present', () => {
            // Arrange
            const directories = ['/project', '/project/src'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(path.resolve('/project'));
        });

        test('should remove multiple child directories of same parent', () => {
            // Arrange
            const directories = ['/project', '/project/src', '/project/test', '/project/docs'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(path.resolve('/project'));
        });

        test('should handle nested parent-child relationships', () => {
            // Arrange
            const directories = ['/project', '/project/src', '/project/src/components'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(path.resolve('/project'));
        });

        test('should keep separate directory trees', () => {
            // Arrange
            const directories = ['/project1', '/project1/src', '/project2', '/project2/test'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toContain(path.resolve('/project1'));
            expect(result).toContain(path.resolve('/project2'));
        });

        test('should handle complex parent-child scenarios', () => {
            // Arrange
            const directories = [
                '/root/project1',
                '/root/project1/src',
                '/root/project2',
                '/other/folder',
                '/other/folder/subfolder',
                '/standalone',
            ];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(4);
            expect(result).toContain(path.resolve('/root/project1'));
            expect(result).toContain(path.resolve('/root/project2'));
            expect(result).toContain(path.resolve('/other/folder'));
            expect(result).toContain(path.resolve('/standalone'));
        });
    });

    describe('Path normalization edge cases', () => {
        test('should handle paths with trailing slashes', () => {
            // Arrange
            const directories = ['/project/', '/project/src/'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(path.resolve('/project'));
        });

        test('should handle mixed path separators', () => {
            // Arrange
            const directories = ['/project\\src', '/project/src'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(1);
        });

        test('should handle paths with dots and parent references', () => {
            // Arrange
            const directories = ['/project/./src', '/project/../project/test'];

            // Act
            const result = normalizeDirectoryPaths(directories);

            // Assert
            expect(result).toHaveLength(2);
        });
    });
});
