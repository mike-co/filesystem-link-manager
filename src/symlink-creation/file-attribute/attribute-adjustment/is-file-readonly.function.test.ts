import * as path from 'path';
import mockFs from 'mock-fs';
import { isFileReadonly } from './is-file-readonly.function';
import { DomainError } from '../../../common';
import { FILE_ATTRIBUTE_DOMAIN_ERRORS } from '../file-attribute-domain-errors.const';

describe('is-file-readonly.function', () => {
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
                'writable-file-win.txt': mockFs.file({
                    content: 'writable content windows',
                    mode: 0o644, // has write bit
                }),
                'readonly-file-win.txt': mockFs.file({
                    content: 'readonly content windows',
                    mode: 0o444, // no write bit
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
            expect(typeof isFileReadonly).toBe('function');
        });
    });

    describe('File readonly detection on Windows platform', () => {
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

        test('should return false for writable file on Windows', async () => {
            // Arrange
            const writableFile = path.join(tmpRoot, 'writable-file-win.txt');

            // Act
            const result = await isFileReadonly(writableFile);

            // Assert
            expect(result).toBe(false);
        });

        test('should return true for readonly file on Windows', async () => {
            // Arrange
            const readonlyFile = path.join(tmpRoot, 'readonly-file-win.txt');

            // Act
            const result = await isFileReadonly(readonlyFile);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('File readonly detection on Unix-like platforms', () => {
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

        test('should return false for writable file on Unix-like system', async () => {
            // Arrange
            const writableFile = path.join(tmpRoot, 'writable-file.txt');

            // Act
            const result = await isFileReadonly(writableFile);

            // Assert
            expect(result).toBe(false);
        });

        test('should return true for readonly file on Unix-like system', async () => {
            // Arrange
            const readonlyFile = path.join(tmpRoot, 'readonly-file.txt');

            // Act
            const result = await isFileReadonly(readonlyFile);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('Error handling scenarios', () => {
        test('should throw DomainError when file does not exist', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert
            await expect(isFileReadonly(nonExistentFile)).rejects.toThrow(DomainError);
        });

        test('should throw DomainError with FILE_ATTRIBUTE_CHECK_FAILED when file access fails', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert
            await expect(isFileReadonly(nonExistentFile)).rejects.toThrow(
                expect.objectContaining({
                    domainErrorInfo: FILE_ATTRIBUTE_DOMAIN_ERRORS.FILE_ATTRIBUTE_CHECK_FAILED,
                })
            );
        });

        test('should include file path in error message when access fails', async () => {
            // Arrange
            const nonExistentFile = path.join(tmpRoot, 'does-not-exist.txt');

            // Act & Assert
            await expect(isFileReadonly(nonExistentFile)).rejects.toThrow(
                expect.objectContaining({
                    message: expect.stringContaining(nonExistentFile),
                })
            );
        });
    });
});
