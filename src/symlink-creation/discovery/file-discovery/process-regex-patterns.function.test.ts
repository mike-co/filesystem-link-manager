import { processRegexPattern } from './process-regex-patterns.function';

const createMockLogger = () =>
    ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }) as any;

describe('process-regex-patterns.function', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        mockLogger = createMockLogger();
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof processRegexPattern).toBe('function');
        });
    });

    describe('Regex pattern processing', () => {
        test('should filter files matching regex pattern', () => {
            // Arrange
            const filePaths = [
                '/source/file1.txt',
                '/source/file2.log',
                '/source/file3.txt',
                '/source/readme.md',
            ];
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual(['/source/file1.txt', '/source/file3.txt']);
        });

        test('should handle case-insensitive matching', () => {
            // Arrange
            const filePaths = ['/source/File1.TXT', '/source/file2.txt', '/source/File3.LOG'];
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual(['/source/File1.TXT', '/source/file2.txt']);
        });

        test('should return empty array when no files match', () => {
            // Arrange
            const filePaths = ['/source/file1.log', '/source/file2.md'];
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual([]);
        });

        test('should handle complex regex patterns', () => {
            // Arrange
            const filePaths = [
                '/source/test.component.ts',
                '/source/app.service.ts',
                '/source/main.ts',
                '/source/test.component.spec.ts',
                '/source/helper.util.js',
            ];
            const pattern = '\\.(component|service)\\.ts$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual(['/source/test.component.ts', '/source/app.service.ts']);
        });
    });

    describe('Error handling', () => {
        test('should throw DomainError for invalid regex pattern', () => {
            // Arrange
            const filePaths = ['/source/file1.txt'];
            const invalidPattern = '[invalid regex';
            const baseDirectoryPath = '/source';

            // Act & Assert
            expect(() =>
                processRegexPattern(filePaths, invalidPattern, mockLogger, baseDirectoryPath)
            ).toThrow('Invalid regex pattern');
        });

        test('should handle files that cause regex test errors gracefully', () => {
            // Arrange
            const filePaths = ['/source/file1.txt', '/source/file2.txt'];
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Mock RegExp.test to throw error for specific file
            const originalTest = RegExp.prototype.test;
            RegExp.prototype.test = jest.fn().mockImplementation(function (
                this: RegExp,
                str: string
            ) {
                if (str === '/source/file2.txt') {
                    throw new Error('Regex test error');
                }
                return originalTest.call(this, str);
            });

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual(['/source/file1.txt']); // Only file1, file2 skipped due to error
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Error testing regex against file path'),
                expect.objectContaining({
                    operation: 'fileDiscovery',
                    workingDirectory: baseDirectoryPath,
                })
            );

            // Restore original test method
            RegExp.prototype.test = originalTest;
        });
    });

    describe('Edge cases', () => {
        test('should handle empty file paths array', () => {
            // Arrange
            const filePaths: string[] = [];
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual([]);
        });

        test('should handle special regex characters in pattern', () => {
            // Arrange
            const filePaths = [
                '/source/file.test.js',
                '/source/file+test.js',
                '/source/file*test.js',
                '/source/file?test.js',
            ];
            const pattern = 'file\\.test\\.js$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual(['/source/file.test.js']);
        });

        test('should handle unicode file paths', () => {
            // Arrange
            const filePaths = [
                '/source/файл.txt',
                '/source/测试.txt',
                '/source/ファイル.txt',
                '/source/file.log',
            ];
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result).toEqual([
                '/source/файл.txt',
                '/source/测试.txt',
                '/source/ファイル.txt',
            ]);
        });

        test('should handle large number of files', () => {
            // Arrange
            const filePaths = Array.from({ length: 1000 }, (_, i) => `/source/file${i}.txt`);
            const pattern = '\\.txt$';
            const baseDirectoryPath = '/source';

            // Act
            const result = processRegexPattern(filePaths, pattern, mockLogger, baseDirectoryPath);

            // Assert
            expect(result.length).toBe(1000);
            expect(result[0]).toBe('/source/file0.txt');
            expect(result[999]).toBe('/source/file999.txt');
        });
    });
});
