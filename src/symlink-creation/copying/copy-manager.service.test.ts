import * as path from 'path';
import mockFs from 'mock-fs';
import { CopyManagerService } from './copy-manager.service';
import * as copyFile from './copy-manager/copy-file-or-directory.function';
import * as handleOverwrite from './copy-manager/handle-overwrite.function';
import { DomainError } from '../../common/domain.error';
import { COPYING_DOMAIN_ERRORS } from './copying-domain-errors.const';
import { LoggerService } from '../../logging/logger.service';

jest.mock('./copy-manager/copy-file-or-directory.function');
jest.mock('./copy-manager/handle-overwrite.function');

describe('copy-manager.service', () => {
    const tmpRoot = path.join(process.cwd(), 'tmp', 'test-' + Date.now());
    let service: CopyManagerService;
    let logger: LoggerService;

    beforeAll(() => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');

        // Create virtual filesystem with expected structure
        mockFs({
            [tmpRoot]: {
                source: {
                    'file1.txt': 'test content 1',
                    'file2.txt': 'test content 2',
                    'file3.txt': 'test content 3',
                    dir1: {
                        'subfile1.txt': 'directory content 1',
                    },
                    dir2: {
                        'subfile2.txt': 'directory content 2',
                    },
                    dir3: {
                        'subfile3.txt': 'directory content 3',
                    },
                },
                target: {},
                existing: {
                    'file2.txt': 'existing content',
                    dir2: {
                        'existing.txt': 'existing dir content',
                    },
                },
            },
            // Preserve node_modules for Jest functionality
            [nodeModulesPath]: mockFs.load(nodeModulesPath),
        });
    });

    afterAll(() => {
        mockFs.restore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        logger = { info: jest.fn(), debug: jest.fn() } as unknown as LoggerService;
        service = new CopyManagerService(logger);
    });

    test('should construct successfully', () => {
        expect(service).toBeInstanceOf(CopyManagerService);
    });

    describe('copyFiles', () => {
        test('should copy files and return success result', async () => {
            // Arrange
            (copyFile.copyFileOrDirectory as jest.Mock).mockResolvedValue(undefined);
            (handleOverwrite.handleOverwrite as jest.Mock).mockResolvedValue(true);
            const filesToCopy = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file1.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file1.txt'),
                },
            ];

            // Act
            const result = await service.copyFiles(filesToCopy, false, 'overwrite');

            // Assert
            expect(result[0]).toBeDefined();
            expect(result[0]?.status).toBe('success');
            expect(copyFile.copyFileOrDirectory).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'file1.txt'),
                expect.any(String)
            );
        });

        test('should skip file if overwrite not allowed', async () => {
            // Arrange
            (handleOverwrite.handleOverwrite as jest.Mock).mockResolvedValue(false);
            const filesToCopy = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file2.txt'),
                    destinationPath: path.join(tmpRoot, 'existing', 'file2.txt'),
                },
            ];

            // Act
            const result = await service.copyFiles(filesToCopy, false, 'skip');

            // Assert
            expect(result[0]).toBeDefined();
            expect(result[0]?.status).toBe('skipped');
        });

        test('should handle error during file copy', async () => {
            // Arrange
            const domainError = new DomainError(COPYING_DOMAIN_ERRORS.COPY_TYPE);
            (copyFile.copyFileOrDirectory as jest.Mock).mockRejectedValue(domainError);
            (handleOverwrite.handleOverwrite as jest.Mock).mockResolvedValue(true);
            const filesToCopy = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'file3.txt'),
                    destinationPath: path.join(tmpRoot, 'target', 'file3.txt'),
                },
            ];

            // Act
            const result = await service.copyFiles(filesToCopy, false, 'overwrite');

            // Assert
            expect(result[0]).toBeDefined();
            expect(result[0]?.status).toBe('error');
            expect(result[0]?.error).toBeInstanceOf(DomainError);
            expect((result[0]?.error as DomainError).domainErrorInfo.key).toBe(
                COPYING_DOMAIN_ERRORS.COPY_TYPE.key
            );
        });
    });

    describe('copyDirectories', () => {
        test('should copy directories and return success result', async () => {
            // Arrange
            (copyFile.copyFileOrDirectory as jest.Mock).mockResolvedValue(undefined);
            (handleOverwrite.handleOverwrite as jest.Mock).mockResolvedValue(true);
            const dirsToCopy = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'dir1'),
                    destinationPath: path.join(tmpRoot, 'target', 'dir1'),
                },
            ];

            // Act
            const result = await service.copyDirectories(dirsToCopy, false, 'overwrite');

            // Assert
            expect(result[0]).toBeDefined();
            expect(result[0]?.status).toBe('success');
            expect(copyFile.copyFileOrDirectory).toHaveBeenCalledWith(
                path.join(tmpRoot, 'source', 'dir1'),
                expect.any(String)
            );
        });

        test('should skip directory if overwrite not allowed', async () => {
            // Arrange
            (handleOverwrite.handleOverwrite as jest.Mock).mockResolvedValue(false);
            const dirsToCopy = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'dir2'),
                    destinationPath: path.join(tmpRoot, 'existing', 'dir2'),
                },
            ];

            // Act
            const result = await service.copyDirectories(dirsToCopy, false, 'skip');

            // Assert
            expect(result[0]).toBeDefined();
            expect(result[0]?.status).toBe('skipped');
        });

        test('should handle error during directory copy', async () => {
            // Arrange
            const domainError = new DomainError(COPYING_DOMAIN_ERRORS.COPY_ACCESS);
            (copyFile.copyFileOrDirectory as jest.Mock).mockRejectedValue(domainError);
            (handleOverwrite.handleOverwrite as jest.Mock).mockResolvedValue(true);
            const dirsToCopy = [
                {
                    sourcePath: path.join(tmpRoot, 'source', 'dir3'),
                    destinationPath: path.join(tmpRoot, 'target', 'dir3'),
                },
            ];

            // Act
            const result = await service.copyDirectories(dirsToCopy, false, 'overwrite');

            // Assert
            expect(result[0]).toBeDefined();
            expect(result[0]?.status).toBe('error');
            expect(result[0]?.error).toBeInstanceOf(DomainError);
            expect((result[0]?.error as DomainError).domainErrorInfo.key).toBe(
                COPYING_DOMAIN_ERRORS.COPY_ACCESS.key
            );
        });
    });
});
