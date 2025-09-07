import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import { copyFileOrDirectory } from './copy-file-or-directory.function';
import { DomainError } from '../../../common/domain.error';
import { COPYING_DOMAIN_ERRORS } from '../copying-domain-errors.const';

describe('copy-file-or-directory.function', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());

    const expectDomainError = (error: unknown, expectedKey: string) => {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).domainErrorInfo.key).toBe(expectedKey);
    };

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with expected structure
        mockFs({
            [tmpRoot]: {
                source: {
                    'file.txt': 'test content',
                },
                dest: {},
                protected: mockFs.directory({
                    mode: 0o000, // No permissions
                    items: {},
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
            expect(typeof copyFileOrDirectory).toBe('function');
        });
    });

    describe('File copying operations', () => {
        test('should copy file when source and target are valid', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file.txt');
            const targetPath = path.join(tmpRoot, 'dest', 'file.txt');

            // Verify source exists in mock filesystem
            expect(await fs.pathExists(sourcePath)).toBe(true);

            // Act
            await expect(copyFileOrDirectory(sourcePath, targetPath)).resolves.toBeUndefined();

            // Assert
            expect(await fs.pathExists(targetPath)).toBe(true);
            const sourceContent = await fs.readFile(sourcePath, 'utf8');
            const targetContent = await fs.readFile(targetPath, 'utf8');
            expect(targetContent).toBe(sourceContent);
        });

        test('should throw DomainError with COPY_GENERAL when target directory cannot be created', async () => {
            // Arrange
            const sourcePath = path.join(tmpRoot, 'source', 'file.txt');
            const protectedTargetPath = path.join(tmpRoot, 'protected', 'file.txt');

            // Act & Assert
            await expect(copyFileOrDirectory(sourcePath, protectedTargetPath)).rejects.toThrow(
                DomainError
            );

            try {
                await copyFileOrDirectory(sourcePath, protectedTargetPath);
                fail('Expected error to be thrown');
            } catch (error) {
                expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_GENERAL.key);
                expect((error as DomainError).message).toContain(
                    `Failed to copy file from '${sourcePath}' to '${protectedTargetPath}'`
                );
                expect((error as DomainError).cause).toBeInstanceOf(Error);
            }
        });

        test('should throw DomainError with COPY_GENERAL when source file does not exist', async () => {
            // Arrange
            const nonExistentSource = path.join(tmpRoot, 'source', 'nonexistent.txt');
            const targetPath = path.join(tmpRoot, 'dest', 'file.txt');

            // Verify source does not exist
            expect(await fs.pathExists(nonExistentSource)).toBe(false);

            // Act & Assert
            await expect(copyFileOrDirectory(nonExistentSource, targetPath)).rejects.toThrow(
                DomainError
            );

            try {
                await copyFileOrDirectory(nonExistentSource, targetPath);
                fail('Expected error to be thrown');
            } catch (error) {
                expectDomainError(error, COPYING_DOMAIN_ERRORS.COPY_GENERAL.key);
                expect((error as DomainError).message).toContain(
                    `Failed to copy file from '${nonExistentSource}' to '${targetPath}'`
                );
                expect((error as DomainError).cause).toBeInstanceOf(Error);
            }
        });
    });
});
