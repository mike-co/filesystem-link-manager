import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import { createLink } from './create-link.function';
import { FileLinkOptions, DirectoryLinkOptions } from '../types/link-creation-options.interface';
import { DomainError } from '../../../common';

describe('create-link.function', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'create-link-test-' + Date.now());

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with mock-fs
        mockFs({
            [tmpRoot]: {
                source: {
                    'file1.txt': 'content of file1',
                    'file2.txt': 'content of file2',
                    subdirectory: {
                        'nested-file.txt': 'nested content',
                    },
                    'empty-dir': {},
                },
                target: {
                    'existing-file.txt': 'existing target content',
                    'existing-symlink.txt': mockFs.symlink({ path: '../source/file1.txt' }),
                },
                'no-write-access': mockFs.directory({
                    mode: 0o444, // Read-only directory
                    items: {},
                }),
            },
            // Preserve node_modules for Jest functionality
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    beforeEach(async () => {
        // Restore the original 'existing-file.txt' before each test to prevent state pollution
        const existingFilePath = path.join(tmpRoot, 'target', 'existing-file.txt');
        try {
            await fs.remove(existingFilePath);
        } catch {
            // File may not exist, ignore error
        }
        await fs.ensureFile(existingFilePath);
        await fs.writeFile(existingFilePath, 'existing target content');
    });

    afterAll(() => {
        mockFs.restore();
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof createLink).toBe('function');
        });
    });

    describe('File symlink creation', () => {
        test('should create file symlink successfully', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'new-symlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };

            expect(await fs.pathExists(sourcePath)).toBe(true);
            expect(await fs.pathExists(targetPath)).toBe(false);

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.sourcePath).toBe(sourcePath);
            expect(result.targetPath).toBe(targetPath);
            expect(result.operation).toBe('create');
            expect(result.itemType).toBe('file');
            expect(result.action).toBe('symlink');
            expect(result.metadata?.timestamp).toBeDefined();
            expect(await fs.pathExists(targetPath)).toBe(true);

            // Verify it's actually a symlink
            const stats = await fs.lstat(targetPath);
            expect(stats.isSymbolicLink()).toBe(true);
        });

        test('should create file hardlink successfully', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file2.txt');
            const targetPath = path.join(tmpRoot, 'target', 'new-hardlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'hardlink',
            };

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.action).toBe('hardlink');
            expect(await fs.pathExists(targetPath)).toBe(true);

            // Verify it's actually a hardlink (same inode)
            const sourceStats = await fs.stat(sourcePath);
            const targetStats = await fs.stat(targetPath);
            expect(sourceStats.ino).toBe(targetStats.ino);
        });

        test('should create parent directories when option is enabled', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'deep', 'nested', 'symlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                createParentDirectories: true,
                verboseMetadata: true,
            };

            expect(await fs.pathExists(path.dirname(targetPath))).toBe(false);

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.metadata?.parentDirectoriesCreated).toBe(true);
            expect(await fs.pathExists(path.dirname(targetPath))).toBe(true);
            expect(await fs.pathExists(targetPath)).toBe(true);
        });

        test('should handle overwrite behavior with function callback', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'overwrite-test-file.txt');

            // Setup: Create the target file for this test
            await fs.ensureFile(targetPath);
            await fs.writeFile(targetPath, 'existing target content');
            const handleOverwriteBehaviorFunc = jest.fn().mockResolvedValue('overwrite');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                handleOverwriteBehaviorFunc,
                verboseMetadata: true,
            };

            expect(await fs.pathExists(targetPath)).toBe(true);

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.metadata?.targetExisted).toBe(true);
            expect(result.metadata?.overwritePerformed).toBe(true);
            expect(handleOverwriteBehaviorFunc).toHaveBeenCalledWith(
                sourcePath,
                targetPath,
                targetPath
            );

            // Verify the original file was replaced with symlink
            const stats = await fs.lstat(targetPath);
            expect(stats.isSymbolicLink()).toBe(true);
        });

        test('should skip overwrite when callback returns skip', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'skip-test-file.txt');

            // Setup: Create the target file for this test
            await fs.ensureFile(targetPath);
            await fs.writeFile(targetPath, 'existing target content');
            const handleOverwriteBehaviorFunc = jest.fn().mockResolvedValue('skip');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                handleOverwriteBehaviorFunc,
                verboseMetadata: true,
            };

            // Store original content
            const originalContent = await fs.readFile(targetPath, 'utf8');

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.metadata?.targetExisted).toBe(true);
            expect(result.metadata?.overwritePerformed).toBe(false);

            // Verify the original file was not modified
            const currentContent = await fs.readFile(targetPath, 'utf8');
            expect(currentContent).toBe(originalContent);
            const stats = await fs.lstat(targetPath);
            expect(stats.isSymbolicLink()).toBe(false);
        });
    });

    describe('Directory symlink creation', () => {
        test('should create directory symlink successfully', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'subdirectory');
            const targetPath = path.join(tmpRoot, 'target', 'dir-symlink');
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };

            expect(await fs.pathExists(sourcePath)).toBe(true);
            expect(await fs.pathExists(targetPath)).toBe(false);

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.success).toBe(true);
            expect(result.sourcePath).toBe(sourcePath);
            expect(result.targetPath).toBe(targetPath);
            expect(result.operation).toBe('create');
            expect(result.itemType).toBe('directory');
            expect(result.action).toBe('symlink');
            expect(await fs.pathExists(targetPath)).toBe(true);

            // Verify it's actually a directory symlink
            const stats = await fs.lstat(targetPath);
            expect(stats.isSymbolicLink()).toBe(true);

            // Verify content is accessible through symlink
            const nestedFile = path.join(targetPath, 'nested-file.txt');
            expect(await fs.pathExists(nestedFile)).toBe(true);
        });

        test('should create directory junction on Windows platform', async () => {
            // Arrange
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'win32' });

            const sourcePath = path.join(tmpRoot, 'source', 'empty-dir');
            const targetPath = path.join(tmpRoot, 'target', 'windows-junction');
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };

            try {
                // Act
                const result = await createLink(sourcePath, targetPath, options);

                // Assert
                expect(result.success).toBe(true);
                expect(result.action).toBe('symlink');
                expect(await fs.pathExists(targetPath)).toBe(true);
            } finally {
                // Restore original platform
                Object.defineProperty(process, 'platform', { value: originalPlatform });
            }
        });

        test('should create directory symlink on Linux platform', async () => {
            // Arrange
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const sourcePath = path.join(tmpRoot, 'source', 'empty-dir');
            const targetPath = path.join(tmpRoot, 'target', 'linux-dir-symlink');
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };

            try {
                // Act
                const result = await createLink(sourcePath, targetPath, options);

                // Assert
                expect(result.success).toBe(true);
                expect(result.action).toBe('symlink');
                expect(await fs.pathExists(targetPath)).toBe(true);
            } finally {
                // Restore original platform
                Object.defineProperty(process, 'platform', { value: originalPlatform });
            }
        });

        test('should handle regular file overwrite correctly', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'regular-file-overwrite.txt');

            // Create a regular file at target that's not a link
            await fs.ensureFile(targetPath);
            await fs.writeFile(targetPath, 'regular file content');

            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                verboseMetadata: true,
            };

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert - should overwrite the regular file
            expect(result.success).toBe(true);
            expect(result.metadata?.targetExisted).toBe(true);
            expect(result.metadata?.overwritePerformed).toBe(true);

            // Verify it's now a symlink
            const stats = await fs.lstat(targetPath);
            expect(stats.isSymbolicLink()).toBe(true);
        });

        test('should create directory link on Darwin platform', async () => {
            // Arrange
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'darwin' });

            const sourcePath = path.join(tmpRoot, 'source', 'empty-dir');
            const targetPath = path.join(tmpRoot, 'target', 'darwin-dir-symlink');
            const options: DirectoryLinkOptions = {
                itemType: 'directory',
            };

            try {
                // Act
                const result = await createLink(sourcePath, targetPath, options);

                // Assert
                expect(result.success).toBe(true);
                expect(result.action).toBe('symlink');
                expect(await fs.pathExists(targetPath)).toBe(true);
            } finally {
                // Restore original platform
                Object.defineProperty(process, 'platform', { value: originalPlatform });
            }
        });

        test('should detect existing hardlink and return early', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'hardlink-detection-test.txt');

            // First create a hardlink
            const hardlinkOptions: FileLinkOptions = {
                itemType: 'file',
                action: 'hardlink',
                verboseMetadata: true,
            };
            await createLink(sourcePath, targetPath, hardlinkOptions);

            // Now try to create a symlink to the same source
            const symlinkOptions: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                verboseMetadata: true,
            };

            // Act
            const result = await createLink(sourcePath, targetPath, symlinkOptions);

            // Assert - should detect existing hardlink and return early
            expect(result.success).toBe(true);
            expect(result.metadata?.targetExisted).toBe(true);
            expect(result.metadata?.overwritePerformed).toBe(false);
            expect(result.action).toBe('symlink');

            // Verify it's still a hardlink
            const sourceStats = await fs.stat(sourcePath);
            const targetStats = await fs.stat(targetPath);
            expect(sourceStats.ino).toBe(targetStats.ino);
        });
    });

    describe('Cross-platform behavior', () => {
        test('should handle Linux symlink creation', async () => {
            // Arrange
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'linux-symlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };

            try {
                // Act
                const result = await createLink(sourcePath, targetPath, options);

                // Assert
                expect(result.success).toBe(true);
                expect(result.action).toBe('symlink');
                expect(await fs.pathExists(targetPath)).toBe(true);
            } finally {
                // Restore original platform
                Object.defineProperty(process, 'platform', { value: originalPlatform });
            }
        });

        test('should handle Windows symlink creation', async () => {
            // Arrange
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'win32' });

            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'windows-symlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };

            try {
                // Act
                const result = await createLink(sourcePath, targetPath, options);

                // Assert
                expect(result.success).toBe(true);
                expect(result.action).toBe('symlink');
                expect(await fs.pathExists(targetPath)).toBe(true);
            } finally {
                // Restore original platform
                Object.defineProperty(process, 'platform', { value: originalPlatform });
            }
        });
    });

    describe('Error handling', () => {
        test('should throw domain error when source file does not exist', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'nonexistent.txt');
            const targetPath = path.join(tmpRoot, 'target', 'broken-symlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };

            expect(await fs.pathExists(sourcePath)).toBe(false);

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
        });

        test('should throw domain error when source type validation fails', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'subdirectory'); // Directory
            const targetPath = path.join(tmpRoot, 'target', 'type-mismatch.txt');
            const options: FileLinkOptions = {
                // File options for directory source
                itemType: 'file',
                action: 'symlink',
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
        });

        test('should throw domain error when parent directory creation fails', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'no-write-access', 'denied', 'symlink.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                createParentDirectories: true,
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
        });

        test('should handle overwrite callback rejection', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'callback-rejection-test.txt');

            // Setup: Create the target file for this test
            await fs.ensureFile(targetPath);
            await fs.writeFile(targetPath, 'existing target content');
            const handleOverwriteBehaviorFunc = jest
                .fn()
                .mockRejectedValue(new Error('User cancelled'));
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                handleOverwriteBehaviorFunc,
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(
                'User cancelled'
            );
        });

        test('should handle unknown overwrite behavior', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'unknown-behavior-test.txt');

            // Setup: Create the target file for this test
            await fs.ensureFile(targetPath);
            await fs.writeFile(targetPath, 'existing target content');
            const handleOverwriteBehaviorFunc = jest.fn().mockResolvedValue('unknown-action');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                handleOverwriteBehaviorFunc,
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
        });

        test('should return early when target already points to the same source', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'same-target-test.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                verboseMetadata: true,
            };

            // First create the symlink
            await createLink(sourcePath, targetPath, options);
            expect(await fs.pathExists(targetPath)).toBe(true);

            // Act - try to create the same link again
            const result = await createLink(sourcePath, targetPath, options);

            // Assert - should return early without overwriting
            expect(result.success).toBe(true);
            expect(result.metadata?.targetExisted).toBe(true);
            expect(result.metadata?.overwritePerformed).toBe(false);
            expect(result.action).toBe('symlink');

            // Verify it's still a symlink pointing to the correct source
            const stats = await fs.lstat(targetPath);
            expect(stats.isSymbolicLink()).toBe(true);
        });

        test('should throw error when overwrite behavior is set to error', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'error-behavior-test.txt');

            // Setup: Create the target file for this test
            await fs.ensureFile(targetPath);
            await fs.writeFile(targetPath, 'existing target content');
            const handleOverwriteBehaviorFunc = jest.fn().mockResolvedValue('error');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                handleOverwriteBehaviorFunc,
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(
                'Target file already exists and overwrite behavior is set to error'
            );
        });

        test('should throw error when directory source is used for file link', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'subdirectory'); // This is a directory
            const targetPath = path.join(tmpRoot, 'target', 'dir-as-file-test.txt');
            const options: FileLinkOptions = {
                itemType: 'file', // Expecting file but source is directory
                action: 'symlink',
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(
                'Source path must be a file for file symlink creation'
            );
        });

        test('should throw error when file source is used for directory link', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt'); // This is a file
            const targetPath = path.join(tmpRoot, 'target', 'file-as-dir-test');
            const options: DirectoryLinkOptions = {
                itemType: 'directory', // Expecting directory but source is file
            };

            // Act & Assert
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(DomainError);
            await expect(createLink(sourcePath, targetPath, options)).rejects.toThrow(
                'Source path must be a directory for directory link creation'
            );
        });
    });

    describe('Business logic validation', () => {
        test('should validate discriminated union branches correctly', async () => {
            // Test file branch
            const fileOptions: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };
            expect(fileOptions.itemType).toBe('file');
            expect(fileOptions.action).toBe('symlink');

            // Test directory branch
            const dirOptions: DirectoryLinkOptions = {
                itemType: 'directory',
            };
            expect(dirOptions.itemType).toBe('directory');
            // Directory options only have itemType property
        });

        test('should generate consistent metadata timestamps', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath1 = path.join(tmpRoot, 'target', 'timestamp-test1.txt');
            const targetPath2 = path.join(tmpRoot, 'target', 'timestamp-test2.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
            };

            // Act
            const result1 = await createLink(sourcePath, targetPath1, options);
            await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
            const result2 = await createLink(sourcePath, targetPath2, options);

            // Assert
            expect(result1.metadata?.timestamp).toBeDefined();
            expect(result2.metadata?.timestamp).toBeDefined();
            expect(result1.metadata?.timestamp).not.toBe(result2.metadata?.timestamp);

            // Verify ISO timestamp format
            const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            expect(result1.metadata?.timestamp).toMatch(timestampRegex);
            expect(result2.metadata?.timestamp).toMatch(timestampRegex);
        });

        test('should handle complex metadata collection when verbose is enabled', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file1.txt');
            const targetPath = path.join(tmpRoot, 'target', 'verbose-meta.txt');
            const options: FileLinkOptions = {
                itemType: 'file',
                action: 'symlink',
                createParentDirectories: false,
                verboseMetadata: true,
            };

            // Act
            const result = await createLink(sourcePath, targetPath, options);

            // Assert
            expect(result.metadata).toMatchObject({
                timestamp: expect.any(String),
                targetExisted: false,
                parentDirectoriesCreated: false,
                overwritePerformed: false,
            });
        });
    });
});
