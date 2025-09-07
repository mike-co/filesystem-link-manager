import { countFilesInDirectories } from './count-files-in-directories.function';

jest.mock('./discover-files-and-directories.function');
jest.mock('./normalize-directory-paths.function');

import { discoverAllFiles } from './discover-files-and-directories.function';
import { normalizeDirectoryPaths } from './normalize-directory-paths.function';

describe('count-files-in-directories.function', () => {
    let mockDiscoverAllFiles: jest.MockedFunction<typeof discoverAllFiles>;
    let mockNormalizeDirectoryPaths: jest.MockedFunction<typeof normalizeDirectoryPaths>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDiscoverAllFiles = discoverAllFiles as jest.MockedFunction<typeof discoverAllFiles>;
        mockNormalizeDirectoryPaths = normalizeDirectoryPaths as jest.MockedFunction<
            typeof normalizeDirectoryPaths
        >;
    });

    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof countFilesInDirectories).toBe('function');
        });
    });

    describe('File counting with empty input', () => {
        test('should return 0 when directory paths array is empty', async () => {
            // Arrange
            const directoryPaths: string[] = [];

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(0);
            expect(mockNormalizeDirectoryPaths).not.toHaveBeenCalled();
            expect(mockDiscoverAllFiles).not.toHaveBeenCalled();
        });

        test('should return 0 when directory paths array is null', async () => {
            // Arrange
            const directoryPaths = null as any;

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(0);
            expect(mockNormalizeDirectoryPaths).not.toHaveBeenCalled();
            expect(mockDiscoverAllFiles).not.toHaveBeenCalled();
        });

        test('should return 0 when directory paths array is undefined', async () => {
            // Arrange
            const directoryPaths = undefined as any;

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(0);
            expect(mockNormalizeDirectoryPaths).not.toHaveBeenCalled();
            expect(mockDiscoverAllFiles).not.toHaveBeenCalled();
        });
    });

    describe('File counting with single directory', () => {
        test('should count files in single directory', async () => {
            // Arrange
            const directoryPaths = ['/source/dir1'];
            const normalizedDirectories = ['/source/dir1'];
            const mockFiles = ['/source/dir1/file1.txt', '/source/dir1/file2.txt'];

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles.mockResolvedValue(mockFiles);

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(2);
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(directoryPaths);
            expect(mockDiscoverAllFiles).toHaveBeenCalledWith('/source/dir1');
            expect(mockDiscoverAllFiles).toHaveBeenCalledTimes(1);
        });

        test('should count zero files when directory is empty', async () => {
            // Arrange
            const directoryPaths = ['/source/empty-dir'];
            const normalizedDirectories = ['/source/empty-dir'];
            const mockFiles: string[] = [];

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles.mockResolvedValue(mockFiles);

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(0);
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(directoryPaths);
            expect(mockDiscoverAllFiles).toHaveBeenCalledWith('/source/empty-dir');
        });
    });

    describe('File counting with multiple directories', () => {
        test('should count files across multiple directories', async () => {
            // Arrange
            const directoryPaths = ['/source/dir1', '/source/dir2', '/source/dir3'];
            const normalizedDirectories = ['/source/dir1', '/source/dir2', '/source/dir3'];

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles
                .mockResolvedValueOnce(['/source/dir1/file1.txt', '/source/dir1/file2.txt']) // 2 files
                .mockResolvedValueOnce(['/source/dir2/file3.txt']) // 1 file
                .mockResolvedValueOnce([]); // 0 files

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(3);
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(directoryPaths);
            expect(mockDiscoverAllFiles).toHaveBeenCalledTimes(3);
            expect(mockDiscoverAllFiles).toHaveBeenNthCalledWith(1, '/source/dir1');
            expect(mockDiscoverAllFiles).toHaveBeenNthCalledWith(2, '/source/dir2');
            expect(mockDiscoverAllFiles).toHaveBeenNthCalledWith(3, '/source/dir3');
        });

        test('should handle directories with normalized path deduplication', async () => {
            // Arrange
            const directoryPaths = ['/source/parent', '/source/parent/child', '/source/other'];
            const normalizedDirectories = ['/source/parent', '/source/other']; // child removed by normalization

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles
                .mockResolvedValueOnce([
                    '/source/parent/file1.txt',
                    '/source/parent/child/file2.txt',
                ]) // 2 files
                .mockResolvedValueOnce(['/source/other/file3.txt']); // 1 file

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(3);
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(directoryPaths);
            expect(mockDiscoverAllFiles).toHaveBeenCalledTimes(2);
            expect(mockDiscoverAllFiles).toHaveBeenNthCalledWith(1, '/source/parent');
            expect(mockDiscoverAllFiles).toHaveBeenNthCalledWith(2, '/source/other');
        });
    });

    describe('Error handling', () => {
        test('should throw DomainError when discoverAllFiles fails', async () => {
            // Arrange
            const directoryPaths = ['/source/error-dir'];
            const normalizedDirectories = ['/source/error-dir'];
            const mockError = new Error('Permission denied');

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles.mockRejectedValue(mockError);

            // Act & Assert
            await expect(countFilesInDirectories(directoryPaths)).rejects.toThrow(
                'File discovery operation failed'
            );
        });

        test('should throw DomainError with original error as cause', async () => {
            // Arrange
            const directoryPaths = ['/source/error-dir'];
            const normalizedDirectories = ['/source/error-dir'];
            const mockError = new Error('Filesystem error');

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles.mockRejectedValue(mockError);

            // Act & Assert
            try {
                await countFilesInDirectories(directoryPaths);
            } catch (error: any) {
                expect(error.message).toContain('File discovery operation failed');
                expect(error.cause).toBe(mockError);
            }
        });

        test('should handle partial failures in multiple directories', async () => {
            // Arrange
            const directoryPaths = ['/source/good-dir', '/source/error-dir'];
            const normalizedDirectories = ['/source/good-dir', '/source/error-dir'];
            const mockError = new Error('Access denied');

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles
                .mockResolvedValueOnce(['/source/good-dir/file1.txt']) // Success
                .mockRejectedValueOnce(mockError); // Failure

            // Act & Assert
            await expect(countFilesInDirectories(directoryPaths)).rejects.toThrow(
                'File discovery operation failed'
            );
        });
    });

    describe('Large directory count scenarios', () => {
        test('should handle large number of files across directories', async () => {
            // Arrange
            const directoryPaths = ['/source/large-dir1', '/source/large-dir2'];
            const normalizedDirectories = ['/source/large-dir1', '/source/large-dir2'];

            // Create large file arrays
            const largeFileArray1 = Array.from(
                { length: 1000 },
                (_, i) => `/source/large-dir1/file${i}.txt`
            );
            const largeFileArray2 = Array.from(
                { length: 500 },
                (_, i) => `/source/large-dir2/file${i}.txt`
            );

            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirectories);
            mockDiscoverAllFiles
                .mockResolvedValueOnce(largeFileArray1)
                .mockResolvedValueOnce(largeFileArray2);

            // Act
            const result = await countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(1500);
            expect(mockDiscoverAllFiles).toHaveBeenCalledTimes(2);
        });
    });
});
