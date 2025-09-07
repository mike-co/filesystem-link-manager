import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import { setFileReadonly } from './set-file-readonly.function';
import { DomainError } from '../../../common';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

describe('set-file-readonly.function', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with mock-fs
        mockFs({
            [tmpRoot]: {
                'writable-file.txt': mockFs.file({
                    content: 'writable content',
                    mode: 0o644, // writable
                }),
                'readonly-file.txt': mockFs.file({
                    content: 'readonly content',
                    mode: 0o444, // readonly
                }),
                'test-file-win.txt': mockFs.file({
                    content: 'test content windows',
                    mode: 0o644, // writable initially
                }),
                'test-file-unix.txt': mockFs.file({
                    content: 'test content unix',
                    mode: 0o644, // writable initially
                }),
            },
            // Preserve node_modules for Jest functionality
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    afterAll(() => {
        mockFs.restore();
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof setFileReadonly).toBe('function');
        });
    });

    describe('File readonly modification on Windows platform', () => {
        const originalPlatform = process.platform;

        beforeEach(() => {
            // Mock Windows platform
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true,
            });
        });

        afterEach(() => {
            // Restore original platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                configurable: true,
            });
        });

        test('should set file to readonly on Windows', async () => {
            // Arrange
            const testFile = path.join(tmpRoot, 'test-file-win.txt');

            // Act
            await setFileReadonly(testFile, true);

            // Assert
            const stats = await fs.stat(testFile);
            expect((stats.mode & 0o200) === 0).toBe(true); // Write bit should be cleared
        });

        test('should set file to writable on Windows', async () => {
            // Arrange
            const testFile = path.join(tmpRoot, 'readonly-file.txt');

            // Act
            await setFileReadonly(testFile, false);

            // Assert
            const stats = await fs.stat(testFile);
            expect((stats.mode & 0o200) !== 0).toBe(true); // Write bit should be set
        });
    });

    describe('File readonly modification on Unix-like platforms', () => {
        const originalPlatform = process.platform;

        beforeEach(() => {
            // Mock Unix-like platform
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
            });
        });

        afterEach(() => {
            // Restore original platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                configurable: true,
            });
        });

        test('should set file to readonly on Unix-like system', async () => {
            // Arrange
            const testFile = path.join(tmpRoot, 'test-file-unix.txt');

            // Act
            await setFileReadonly(testFile, true);

            // Assert
            const stats = await fs.stat(testFile);
            expect((stats.mode & 0o200) === 0).toBe(true); // Owner write bit should be cleared
        });

        test('should set file to writable on Unix-like system', async () => {
            // Arrange
            const readonlyFile = path.join(tmpRoot, 'readonly-file.txt');

            // Act
            await setFileReadonly(readonlyFile, false);

            // Assert
            const stats = await fs.stat(readonlyFile);
            expect((stats.mode & 0o200) !== 0).toBe(true); // Owner write bit should be set
        });
    });

    describe('Error handling scenarios', () => {
        test('should throw DomainError when file does not exist', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert
            await expect(setFileReadonly(nonExistentFile, true)).rejects.toThrow(DomainError);
        });

        test('should throw DomainError with FILE_ATTRIBUTE_MODIFICATION_FAILED when file access fails', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert
            await expect(setFileReadonly(nonExistentFile, true)).rejects.toThrow(
                expect.objectContaining({
                    domainErrorInfo:
                        FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_MODIFICATION_FAILED,
                })
            );
        });

        test('should include file path in error message when modification fails', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert
            await expect(setFileReadonly(nonExistentFile, true)).rejects.toThrow(
                expect.objectContaining({
                    message: expect.stringContaining(nonExistentFile),
                })
            );
        });

        test('should handle both readonly and writable operations in error scenarios', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert - Test readonly=true
            await expect(setFileReadonly(nonExistentFile, true)).rejects.toThrow(DomainError);

            // Act & Assert - Test readonly=false
            await expect(setFileReadonly(nonExistentFile, false)).rejects.toThrow(DomainError);
        });
    });
});
