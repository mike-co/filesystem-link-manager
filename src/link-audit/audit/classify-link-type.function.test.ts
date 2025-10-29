jest.mock('node:os', () => ({
    platform: jest.fn(() => 'win32'),
}));

import * as path from 'path';
import * as fs from 'fs-extra';
import mockFs from 'mock-fs';
import { classifyLinkType } from './classify-link-type.function';

import { platform as platformFn } from 'node:os';
import { LINK_AUDIT_DOMAIN_ERRORS } from '../link-audit-domain-errors.const';

describe('classify-link-type.function', () => {
    const platformMock = platformFn as jest.MockedFunction<typeof platformFn>;
    const tmpRoot = path.join(process.cwd(), 'tmp', 'classify-link-test-' + Date.now());

    beforeAll(async () => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        mockFs({
            [tmpRoot]: {
                source: {
                    files: {
                        'file.txt': 'file content',
                        'another-file.txt': 'second file content',
                    },
                    directories: {
                        nested: {
                            'index.ts': 'export const value = 1;',
                        },
                    },
                },
                links: {
                    'file-link.txt': mockFs.symlink({ path: '../source/files/file.txt' }),
                    'directory-link': mockFs.symlink({ path: '../source/directories/nested' }),
                },
                hardlinks: {},
            },
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });

        const sourceFilePath = path.join(tmpRoot, 'source', 'files', 'another-file.txt');
        const hardlinkPath = path.join(tmpRoot, 'hardlinks', 'another-file-hardlink.txt');
        await fs.ensureDir(path.dirname(hardlinkPath));
        await fs.link(sourceFilePath, hardlinkPath);
    });

    afterAll(() => {
        mockFs.restore();
    });

    beforeEach(() => {
        platformMock.mockReturnValue('win32');
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof classifyLinkType).toBe('function');
        });
    });

    describe('Link classification', () => {
        test('should classify standard file as none', async () => {
            // Arrange
            const filePath = path.join(tmpRoot, 'source', 'files', 'file.txt');

            // Act
            const result = await classifyLinkType(filePath);

            // Assert
            expect(result).toEqual({
                linkType: 'none',
                targetPath: path.normalize(filePath),
            });
        });

        test('should classify symbolic link to file as symlink', async () => {
            // Arrange
            const linkPath = path.join(tmpRoot, 'links', 'file-link.txt');
            const expectedTarget = path.normalize(
                path.join(tmpRoot, 'source', 'files', 'file.txt')
            );

            // Act
            const result = await classifyLinkType(linkPath);

            // Assert
            expect(result.linkType).toBe('symlink');
            expect(result.targetPath).toBe(expectedTarget);
        });

        test('should classify directory link as junction on Windows', async () => {
            // Arrange
            platformMock.mockReturnValue('win32');
            const linkPath = path.join(tmpRoot, 'links', 'directory-link');
            const expectedTarget = path.normalize(
                path.join(tmpRoot, 'source', 'directories', 'nested')
            );

            // Act
            const result = await classifyLinkType(linkPath);

            // Assert
            expect(result.linkType).toBe('junction');
            expect(result.targetPath).toBe(expectedTarget);
        });

        test('should classify files within directory link as junction on Windows', async () => {
            // Arrange
            platformMock.mockReturnValue('win32');
            const fileWithinLinkPath = path.join(tmpRoot, 'links', 'directory-link', 'index.ts');
            const expectedTarget = path.normalize(
                path.join(tmpRoot, 'source', 'directories', 'nested', 'index.ts')
            );

            // Act
            const result = await classifyLinkType(fileWithinLinkPath);

            // Assert
            expect(result.linkType).toBe('junction');
            expect(result.targetPath).toBe(expectedTarget);
        });

        test('should classify directory link as symlink on non-Windows platforms', async () => {
            // Arrange
            platformMock.mockReturnValue('linux');
            const linkPath = path.join(tmpRoot, 'links', 'directory-link');

            // Act
            const result = await classifyLinkType(linkPath);

            // Assert
            expect(result.linkType).toBe('symlink');
        });

        test('should classify hardlink using inode information', async () => {
            // Arrange
            const hardlinkPath = path.join(tmpRoot, 'hardlinks', 'another-file-hardlink.txt');

            // Act
            const result = await classifyLinkType(hardlinkPath);

            // Assert
            expect(result.linkType).toBe('hardlink');
            expect(result.targetPath).toBe(path.normalize(hardlinkPath));
        });
    });

    describe('Error handling', () => {
        test('should throw DomainError when path does not exist', async () => {
            // Arrange
            const missingPath = path.join(tmpRoot, 'missing', 'file.txt');

            // Act & Assert
            await expect(classifyLinkType(missingPath)).rejects.toMatchObject({
                domainErrorInfo: LINK_AUDIT_DOMAIN_ERRORS.CLASSIFICATION_FAILURE,
            });
        });
    });
});
