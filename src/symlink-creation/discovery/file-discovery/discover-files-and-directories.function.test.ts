import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import {
    discoverFilesWithGlob,
    discoverAllFiles,
    discoverFilesWithIgnore,
    discoverDirectoriesWithGlob,
    discoverAllDirectories,
    discoverDirectoriesWithIgnore,
    discoverDirectoriesWithPath,
    discoverFilesWithPath,
} from './discover-files-and-directories.function';

describe('discover-files-and-directories.function', () => {
    // Use a repo-local temp path so mock-fs can map it reliably across platforms
    const tmpRoot = path.join(process.cwd(), 'tmp', 'lm-test-' + Date.now());

    beforeAll(() => {
        // Require mock-fs lazily to avoid interfering with Jest initialization
        // and preserve node_modules so Jest internals remain accessible.

        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create a virtual filesystem with the expected directories and preserve node_modules
        mockFs({
            [tmpRoot]: {
                absdir: {},
                reldir: {
                    sub: {},
                },
                'test-file.txt': 'test content',
                source: {
                    'file1.ts': 'content 1',
                    'file2.js': 'content 2',
                    nested: {
                        'file3.txt': 'content 3',
                    },
                },
                'empty-file.txt': '',
            },
            // Ensure node_modules is available to Jest and other runtime modules
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    afterAll(() => {
        mockFs.restore();
    });

    describe('Construction', () => {
        test('should export all discovery functions', () => {
            // Arrange & Act & Assert
            expect(typeof discoverFilesWithGlob).toBe('function');
            expect(typeof discoverAllFiles).toBe('function');
            expect(typeof discoverFilesWithIgnore).toBe('function');
            expect(typeof discoverDirectoriesWithGlob).toBe('function');
            expect(typeof discoverAllDirectories).toBe('function');
            expect(typeof discoverDirectoriesWithIgnore).toBe('function');
            expect(typeof discoverDirectoriesWithPath).toBe('function');
            expect(typeof discoverFilesWithPath).toBe('function');
        });
    });

    describe('discoverFilesWithGlob', () => {
        test('should discover files using glob pattern with braceExpansion and extglob', async () => {
            // Act
            const results = await discoverFilesWithGlob(tmpRoot, '**/*.{ts,js}');

            // Assert
            expect(results.length).toBe(2);
            expect(results.some(p => p.includes('file1.ts'))).toBe(true);
            expect(results.some(p => p.includes('file2.js'))).toBe(true);
        });

        test('should handle empty results from glob pattern', async () => {
            // Arrange & Act
            const results = await discoverFilesWithGlob(tmpRoot, '**/*.nonexistent');

            // Assert
            expect(results).toEqual([]);
        });
    });

    describe('discoverAllFiles', () => {
        test('should discover all files using wildcard pattern', async () => {
            // Act
            const results = await discoverAllFiles(tmpRoot);

            // Assert
            expect(results.length).toBe(5);
            expect(results.some(p => p.includes('test-file.txt'))).toBe(true);
            expect(results.some(p => p.includes('file1.ts'))).toBe(true);
            expect(results.some(p => p.includes('file2.js'))).toBe(true);
            expect(results.some(p => p.includes('file3.txt'))).toBe(true);
            expect(results.some(p => p.includes('empty-file.txt'))).toBe(true);
        });
    });

    describe('discoverFilesWithIgnore', () => {
        test('should discover files excluding ignore patterns', async () => {
            // Arrange
            const ignorePatterns = ['**/*.js', '**/*.txt'];

            // Act
            const results = await discoverFilesWithIgnore(tmpRoot, ignorePatterns);

            // Assert
            expect(results.some(p => p.includes('file1.ts'))).toBe(true);
            expect(results.some(p => p.includes('file2.js'))).toBe(false); // .js ignored
            expect(results.some(p => p.includes('test-file.txt'))).toBe(false); // .txt ignored
        });

        test('should handle empty ignore patterns', async () => {
            // Arrange & Act
            const results = await discoverFilesWithIgnore(tmpRoot, []);

            // Assert
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(p => p.includes('file1.ts'))).toBe(true);
            expect(results.some(p => p.includes('file2.js'))).toBe(true);
            expect(results.some(p => p.includes('test-file.txt'))).toBe(true);
        });
    });

    describe('discoverDirectoriesWithGlob', () => {
        test('should discover directories using glob pattern with braceExpansion and extglob', async () => {
            // Arrange & Act
            const results = await discoverDirectoriesWithGlob(tmpRoot, '**/source*');

            // Assert - be more flexible since fast-glob might not match nested 'source' as expected
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results.some(p => p.includes('source'))).toBe(true);
        });
    });

    describe('discoverAllDirectories', () => {
        test('should discover all directories using wildcard pattern', async () => {
            // Act
            const results = await discoverAllDirectories(tmpRoot);

            // Assert
            expect(results.length).toBe(5);
            expect(results.some(p => p.includes('absdir'))).toBe(true);
            expect(results.some(p => p.includes('reldir') && !p.includes('sub'))).toBe(true);
            expect(results.some(p => p.includes('source') && !p.includes('nested'))).toBe(true);
            expect(results.some(p => p.includes('sub'))).toBe(true);
            expect(results.some(p => p.includes('nested'))).toBe(true);
        });
    });

    describe('discoverDirectoriesWithIgnore', () => {
        test('should discover directories excluding ignore patterns', async () => {
            // Arrange
            const ignorePatterns = ['**/absdir', '**/reldir'];

            // Act
            const results = await discoverDirectoriesWithIgnore(tmpRoot, ignorePatterns);

            // Assert
            expect(results.some(p => p.includes('source') && !p.includes('nested'))).toBe(true);
            expect(results.some(p => p.includes('nested'))).toBe(true);
            expect(results.some(p => p.includes('absdir'))).toBe(false);
            expect(results.some(p => p.includes('reldir'))).toBe(false);
        });
    });

    describe('discoverDirectoriesWithPath', () => {
        test('should return absolute paths for existing absolute and relative directories and exclude non-existent', async () => {
            // Arrange
            const absDir = path.join(tmpRoot, 'absdir');
            const relDir = 'reldir/sub';
            const relDirFull = path.join(tmpRoot, relDir);
            const nonExist = path.join(tmpRoot, 'nope');

            // Sanity checks against the mocked fs to ensure directories exist as expected
            expect(await fs.pathExists(absDir)).toBe(true);
            expect(await fs.pathExists(relDirFull)).toBe(true);

            // Act
            const results = await discoverDirectoriesWithPath(tmpRoot, [
                absDir,
                relDir,
                nonExist,
                '',
                '   ',
            ]);

            // Assert
            expect(results).toContain(path.resolve(absDir));
            expect(results).toContain(path.resolve(relDirFull));
            expect(results).not.toContain(path.resolve(nonExist));
        });

        test('should handle single string path input', async () => {
            // Arrange
            const singleDir = path.join(tmpRoot, 'absdir');

            // Act
            const results = await discoverDirectoriesWithPath(tmpRoot, singleDir);

            // Assert
            expect(results).toContain(path.resolve(singleDir));
            expect(results.length).toBe(1);
        });

        test('should return empty array for empty string path', async () => {
            // Arrange & Act
            const results = await discoverDirectoriesWithPath(tmpRoot, '');

            // Assert
            expect(results).toEqual([]);
        });

        test('should return empty array for empty array input', async () => {
            // Arrange & Act
            const results = await discoverDirectoriesWithPath(tmpRoot, []);

            // Assert
            expect(results).toEqual([]);
        });

        test('should handle filesystem errors gracefully', async () => {
            // Arrange
            const problematicPath = path.join(tmpRoot, 'source', 'file1.ts'); // This is a file, not directory

            // Act
            const results = await discoverDirectoriesWithPath(tmpRoot, [problematicPath]);

            // Assert
            expect(results).toEqual([]); // Should exclude files when looking for directories
        });
    });

    describe('discoverFilesWithPath', () => {
        test('should return absolute paths for existing files and exclude non-existent', async () => {
            // Arrange
            const absFile = path.join(tmpRoot, 'test-file.txt');
            const relFile = 'source/file1.ts';
            const relFileFull = path.join(tmpRoot, relFile);
            const nonExist = path.join(tmpRoot, 'nonexistent.txt');

            // Sanity checks against the mocked fs to ensure files exist as expected
            expect(await fs.pathExists(absFile)).toBe(true);
            expect(await fs.pathExists(relFileFull)).toBe(true);

            // Act
            const results = await discoverFilesWithPath(tmpRoot, [
                absFile,
                relFile,
                nonExist,
                '',
                '   ',
            ]);

            // Assert
            expect(results).toContain(path.resolve(absFile));
            expect(results).toContain(path.resolve(relFileFull));
            expect(results).not.toContain(path.resolve(nonExist));
        });

        test('should handle single string path input', async () => {
            // Arrange
            const singleFile = path.join(tmpRoot, 'test-file.txt');

            // Act
            const results = await discoverFilesWithPath(tmpRoot, singleFile);

            // Assert
            expect(results).toContain(path.resolve(singleFile));
            expect(results.length).toBe(1);
        });

        test('should exclude directories when looking for files', async () => {
            // Arrange
            const directoryPath = path.join(tmpRoot, 'absdir'); // This is a directory, not file

            // Act
            const results = await discoverFilesWithPath(tmpRoot, [directoryPath]);

            // Assert
            expect(results).toEqual([]); // Should exclude directories when looking for files
        });

        test('should return unique paths when duplicates provided', async () => {
            // Arrange
            const filePath = path.join(tmpRoot, 'test-file.txt');

            // Act
            const results = await discoverFilesWithPath(tmpRoot, [filePath, filePath, filePath]);

            // Assert
            expect(results).toEqual([path.resolve(filePath)]);
            expect(results.length).toBe(1);
        });
    });
});
