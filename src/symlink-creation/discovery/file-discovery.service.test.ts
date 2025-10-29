import { DomainError } from '../../common';
import { LoggerService } from '../../logging';
import type { SearchPatternBase } from '../config';
import { FileDiscoveryService } from './file-discovery.service';
import { countFilesInDirectories } from './file-discovery/count-files-in-directories.function';
import {
    discoverAllDirectories,
    discoverAllFiles,
    discoverDirectoriesWithGlob,
    discoverDirectoriesWithIgnore,
    discoverFilesWithGlob,
    discoverDirectoriesWithPath,
    discoverFilesWithPath,
    discoverFilesWithIgnore,
} from './file-discovery/discover-files-and-directories.function';
import { normalizeDirectoryPaths } from './file-discovery/normalize-directory-paths.function';
import { processIgnoreRulesFile } from './file-discovery/process-ignore-rules.function';
import { processRegexPattern } from './file-discovery/process-regex-patterns.function';

jest.mock('./file-discovery/count-files-in-directories.function');
jest.mock('./file-discovery/discover-files-and-directories.function');
jest.mock('./file-discovery/normalize-directory-paths.function');
jest.mock('./file-discovery/process-ignore-rules.function');
jest.mock('./file-discovery/process-regex-patterns.function');

describe('file-discovery.service', () => {
    let serviceUnderTest: FileDiscoveryService;
    let mockLoggerService: jest.Mocked<LoggerService>;
    let mockCountFilesInDirectories: jest.MockedFunction<typeof countFilesInDirectories>;
    let mockDiscoverFilesWithPath: jest.MockedFunction<typeof discoverFilesWithPath>;
    let mockDiscoverDirectoriesWithPath: jest.MockedFunction<typeof discoverDirectoriesWithPath>;
    let mockDiscoverFilesWithGlob: jest.MockedFunction<typeof discoverFilesWithGlob>;
    let mockDiscoverDirectoriesWithGlob: jest.MockedFunction<typeof discoverDirectoriesWithGlob>;
    let mockDiscoverAllFiles: jest.MockedFunction<typeof discoverAllFiles>;
    let mockDiscoverAllDirectories: jest.MockedFunction<typeof discoverAllDirectories>;
    let mockDiscoverFilesWithIgnore: jest.MockedFunction<typeof discoverFilesWithIgnore>;
    let mockDiscoverDirectoriesWithIgnore: jest.MockedFunction<
        typeof discoverDirectoriesWithIgnore
    >;
    let mockNormalizeDirectoryPaths: jest.MockedFunction<typeof normalizeDirectoryPaths>;
    let mockProcessIgnoreRulesFile: jest.MockedFunction<typeof processIgnoreRulesFile>;
    let mockProcessRegexPattern: jest.MockedFunction<typeof processRegexPattern>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup logger mock
        mockLoggerService = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
        } as any;

        // Setup function mocks
        mockCountFilesInDirectories = countFilesInDirectories as jest.MockedFunction<
            typeof countFilesInDirectories
        >;
        mockDiscoverFilesWithPath = discoverFilesWithPath as jest.MockedFunction<
            typeof discoverFilesWithPath
        >;
        mockDiscoverDirectoriesWithPath = discoverDirectoriesWithPath as jest.MockedFunction<
            typeof discoverDirectoriesWithPath
        >;
        mockDiscoverFilesWithGlob = discoverFilesWithGlob as jest.MockedFunction<
            typeof discoverFilesWithGlob
        >;
        mockDiscoverDirectoriesWithGlob = discoverDirectoriesWithGlob as jest.MockedFunction<
            typeof discoverDirectoriesWithGlob
        >;
        mockDiscoverAllFiles = discoverAllFiles as jest.MockedFunction<typeof discoverAllFiles>;
        mockDiscoverAllDirectories = discoverAllDirectories as jest.MockedFunction<
            typeof discoverAllDirectories
        >;
        mockDiscoverFilesWithIgnore = discoverFilesWithIgnore as jest.MockedFunction<
            typeof discoverFilesWithIgnore
        >;
        mockDiscoverDirectoriesWithIgnore = discoverDirectoriesWithIgnore as jest.MockedFunction<
            typeof discoverDirectoriesWithIgnore
        >;
        mockNormalizeDirectoryPaths = normalizeDirectoryPaths as jest.MockedFunction<
            typeof normalizeDirectoryPaths
        >;
        mockProcessIgnoreRulesFile = processIgnoreRulesFile as jest.MockedFunction<
            typeof processIgnoreRulesFile
        >;
        mockProcessRegexPattern = processRegexPattern as jest.MockedFunction<
            typeof processRegexPattern
        >;

        serviceUnderTest = new FileDiscoveryService(mockLoggerService);
    });

    describe('Construction', () => {
        test('should construct successfully with logger dependency', () => {
            // Arrange & Act & Assert
            expect(serviceUnderTest).toBeInstanceOf(FileDiscoveryService);
            expect(serviceUnderTest).toBeDefined();
        });
    });

    describe('File discovery with path patterns', () => {
        test('should discover files using path pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'path', pattern: 'src/file.ts' },
            ];
            const expectedFiles = ['/test/base/src/file.ts'];

            mockDiscoverFilesWithPath.mockResolvedValue(expectedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(expectedFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverFilesWithPath).toHaveBeenCalledWith(
                baseDirectoryPath,
                'src/file.ts'
            );
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Discovering files in /test/base with 1 patterns',
                expect.objectContaining({
                    operation: 'filesDiscovery',
                    workingDirectory: baseDirectoryPath,
                })
            );
        });

        test('should discover directories using path pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [{ patternType: 'path', pattern: 'src' }];
            const expectedDirs = ['/test/base/src'];
            const normalizedDirs = ['/test/base/src'];

            mockDiscoverDirectoriesWithPath.mockResolvedValue(expectedDirs);
            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirs);

            // Act
            const result = await serviceUnderTest.discoverDirectories(
                baseDirectoryPath,
                searchPatterns
            );

            // Assert
            expect(result).toEqual(normalizedDirs);
            expect(mockDiscoverDirectoriesWithPath).toHaveBeenCalledWith(baseDirectoryPath, 'src');
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(expectedDirs);
        });

        test('should normalize path mapping entry to source path when discovering files', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                {
                    patternType: 'path',
                    pattern: {
                        sourcePath: 'src/file.ts',
                        destinationPath: 'lib/file.ts',
                    },
                },
            ];
            const expectedFiles = ['/test/base/src/file.ts'];

            mockDiscoverFilesWithPath.mockResolvedValue(expectedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(expectedFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverFilesWithPath).toHaveBeenCalledWith(
                baseDirectoryPath,
                'src/file.ts'
            );
        });

        test('should normalize array of path mapping entries to source paths when discovering files', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                {
                    patternType: 'path',
                    pattern: [
                        {
                            sourcePath: 'src/alpha.ts',
                            destinationPath: 'lib/alpha.ts',
                        },
                        {
                            sourcePath: 'src/beta.ts',
                            destinationPath: 'lib/beta.ts',
                        },
                    ],
                },
            ];
            const expectedFiles = ['/test/base/src/alpha.ts', '/test/base/src/beta.ts'];

            mockDiscoverFilesWithPath.mockResolvedValue(expectedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(expectedFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverFilesWithPath).toHaveBeenCalledWith(baseDirectoryPath, [
                'src/alpha.ts',
                'src/beta.ts',
            ]);
        });

        test('should preserve string arrays when discovering files with path patterns', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                {
                    patternType: 'path',
                    pattern: ['src/alpha.ts', 'src/beta.ts'],
                },
            ];
            const expectedFiles = ['/test/base/src/alpha.ts', '/test/base/src/beta.ts'];

            mockDiscoverFilesWithPath.mockResolvedValue(expectedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(expectedFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverFilesWithPath).toHaveBeenCalledWith(baseDirectoryPath, [
                'src/alpha.ts',
                'src/beta.ts',
            ]);
        });
    });

    describe('File discovery with glob patterns', () => {
        test('should discover files using glob pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'glob', pattern: '**/*.ts' },
            ];
            const expectedFiles = ['/test/base/src/file1.ts', '/test/base/src/file2.ts'];

            mockDiscoverFilesWithGlob.mockResolvedValue(expectedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(expectedFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverFilesWithGlob).toHaveBeenCalledWith(
                baseDirectoryPath,
                '**/*.ts',
                undefined
            );
        });

        test('should discover directories using glob pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'glob', pattern: '**/src' },
            ];
            const expectedDirs = ['/test/base/lib/src', '/test/base/tests/src'];
            const normalizedDirs = ['/test/base/lib/src', '/test/base/tests/src'];

            mockDiscoverDirectoriesWithGlob.mockResolvedValue(expectedDirs);
            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirs);

            // Act
            const result = await serviceUnderTest.discoverDirectories(
                baseDirectoryPath,
                searchPatterns
            );

            // Assert
            expect(result).toEqual(normalizedDirs);
            expect(mockDiscoverDirectoriesWithGlob).toHaveBeenCalledWith(
                baseDirectoryPath,
                '**/src',
                undefined
            );
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(expectedDirs);
        });

        test('should forward followSymbolicLinks option to directory glob discovery', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'glob', pattern: '**/src' },
            ];
            const expectedDirs = ['/external/src'];
            const normalizedDirs = ['/external/src'];

            mockDiscoverDirectoriesWithGlob.mockResolvedValue(expectedDirs);
            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirs);

            // Act
            const result = await serviceUnderTest.discoverDirectories(
                baseDirectoryPath,
                searchPatterns,
                {
                    followSymbolicLinks: true,
                }
            );

            // Assert
            expect(result).toEqual(normalizedDirs);
            expect(mockDiscoverDirectoriesWithGlob).toHaveBeenCalledWith(
                baseDirectoryPath,
                '**/src',
                {
                    followSymbolicLinks: true,
                }
            );
        });

        test('should forward followSymbolicLinks option to glob discovery', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'glob', pattern: '**/*.ts' },
            ];
            const expectedFiles = ['/external/file.ts'];

            mockDiscoverFilesWithGlob.mockResolvedValue(expectedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns, {
                followSymbolicLinks: true,
            });

            // Assert
            expect(result).toEqual(expectedFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverFilesWithGlob).toHaveBeenCalledWith(baseDirectoryPath, '**/*.ts', {
                followSymbolicLinks: true,
            });
        });
    });

    describe('File discovery with regex patterns', () => {
        test('should discover files using regex pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'regex', pattern: '.*\\.test\\.ts$' },
            ];
            const allFiles = ['/test/base/file.ts', '/test/base/file.test.ts'];
            const regexResults = ['/test/base/file.test.ts'];

            mockDiscoverAllFiles.mockResolvedValue(allFiles);
            mockProcessRegexPattern.mockReturnValue(regexResults);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(regexResults.map(path => path.replaceAll('/', '\\')));
            expect(mockDiscoverAllFiles).toHaveBeenCalledWith(baseDirectoryPath, undefined);
            expect(mockProcessRegexPattern).toHaveBeenCalledWith(
                allFiles,
                '.*\\.test\\.ts$',
                mockLoggerService,
                baseDirectoryPath
            );
        });

        test('should discover directories using regex pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'regex', pattern: '.*test.*' },
            ];
            const allDirs = ['/test/base/src', '/test/base/test', '/test/base/tests'];
            const regexResults = ['/test/base/test', '/test/base/tests'];
            const normalizedDirs = ['/test/base/test', '/test/base/tests'];

            mockDiscoverAllDirectories.mockResolvedValue(allDirs);
            mockProcessRegexPattern.mockReturnValue(regexResults);
            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirs);

            // Act
            const result = await serviceUnderTest.discoverDirectories(
                baseDirectoryPath,
                searchPatterns
            );

            // Assert
            expect(result).toEqual(normalizedDirs);
            expect(mockDiscoverAllDirectories).toHaveBeenCalledWith(baseDirectoryPath, undefined);
            expect(mockProcessRegexPattern).toHaveBeenCalledWith(
                allDirs,
                '.*test.*',
                mockLoggerService,
                baseDirectoryPath
            );
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(regexResults);
        });
    });

    describe('File discovery with ignore rules patterns', () => {
        test('should discover files using ignore rules without negation patterns', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'ignore-rules-file-path', pattern: '.gitignore' },
            ];
            const parsedRules = {
                ignorePatterns: ['node_modules', '*.log'],
                negationPatterns: [],
            };
            const ignoredFiles = ['/test/base/src/file.ts', '/test/base/lib/index.ts'];

            mockProcessIgnoreRulesFile.mockResolvedValue(parsedRules);
            mockDiscoverFilesWithIgnore.mockResolvedValue(ignoredFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(ignoredFiles.map(path => path.replaceAll('/', '\\')));
            expect(mockProcessIgnoreRulesFile).toHaveBeenCalledWith(
                '.gitignore',
                mockLoggerService,
                baseDirectoryPath
            );
            expect(mockDiscoverFilesWithIgnore).toHaveBeenCalledWith(
                baseDirectoryPath,
                parsedRules.ignorePatterns,
                undefined
            );
        });

        test('should discover files using ignore rules with negation patterns', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'ignore-rules-file-path', pattern: '.gitignore' },
            ];
            const parsedRules = {
                ignorePatterns: ['*.log'],
                negationPatterns: ['important.log'],
            };
            const ignoredFiles = ['/test/base/src/file.ts'];
            const negatedFiles = ['/test/base/important.log'];

            mockProcessIgnoreRulesFile.mockResolvedValue(parsedRules);
            mockDiscoverFilesWithIgnore.mockResolvedValue(ignoredFiles);
            mockDiscoverFilesWithGlob.mockResolvedValue(negatedFiles);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert - compare unique sets to tolerate potential duplicates from implementation
            const expectedCombined = [...ignoredFiles, ...negatedFiles].map(p => {
                return p.replaceAll('/', '\\');
            });
            const uniqueExpected = Array.from(new Set(expectedCombined)).sort();
            const uniqueResult = Array.from(new Set(result)).sort();
            expect(uniqueResult).toEqual(uniqueExpected);
            expect(mockDiscoverFilesWithIgnore).toHaveBeenCalledWith(
                baseDirectoryPath,
                parsedRules.ignorePatterns,
                undefined
            );
            expect(mockDiscoverFilesWithGlob).toHaveBeenCalledWith(
                baseDirectoryPath,
                'important.log',
                undefined
            );
        });

        test('should discover directories using ignore rules with negation patterns', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'ignore-rules-file-path', pattern: '.gitignore' },
            ];
            const parsedRules = {
                ignorePatterns: ['**/temp'],
                negationPatterns: ['**/temp/keep'],
            };
            const ignoredDirs = ['/test/base/src', '/test/base/lib'];
            const negatedDirs = ['/test/base/temp/keep'];
            const normalizedDirs = ['/test/base/src', '/test/base/lib', '/test/base/temp/keep'];

            mockProcessIgnoreRulesFile.mockResolvedValue(parsedRules);
            mockDiscoverDirectoriesWithIgnore.mockResolvedValue(ignoredDirs);
            mockDiscoverDirectoriesWithGlob.mockResolvedValue(negatedDirs);
            mockNormalizeDirectoryPaths.mockReturnValue(normalizedDirs);

            // Act
            const result = await serviceUnderTest.discoverDirectories(
                baseDirectoryPath,
                searchPatterns
            );

            // Assert - compare normalized result and ensure normalize was called with an array containing both sets
            expect(result).toEqual(normalizedDirs);
            expect(mockDiscoverDirectoriesWithIgnore).toHaveBeenCalledWith(
                baseDirectoryPath,
                parsedRules.ignorePatterns,
                undefined
            );
            expect(mockDiscoverDirectoriesWithGlob).toHaveBeenCalledWith(
                baseDirectoryPath,
                '**/temp/keep',
                undefined
            );
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(
                expect.arrayContaining([...ignoredDirs, ...negatedDirs])
            );
        });

        test('should handle null parsed rules from ignore file', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'ignore-rules-file-path', pattern: '.nonexistent' },
            ];

            mockProcessIgnoreRulesFile.mockResolvedValue(null);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual([]);
            expect(mockProcessIgnoreRulesFile).toHaveBeenCalledWith(
                '.nonexistent',
                mockLoggerService,
                baseDirectoryPath
            );
            expect(mockDiscoverFilesWithIgnore).not.toHaveBeenCalled();
        });
    });

    describe('Unsupported pattern types', () => {
        test('should throw domain error for unsupported pattern type', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'unknown' as any, pattern: 'test' },
            ];

            // Act & Assert
            await expect(
                serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns)
            ).rejects.toThrow(DomainError);

            expect(mockLoggerService.error).toHaveBeenCalledWith(
                "Not supported pattern 'unknown'",
                expect.objectContaining({
                    operation: 'filesDiscovery',
                    workingDirectory: baseDirectoryPath,
                })
            );
        });

        test('should throw domain error with correct error info for unsupported pattern', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'unsupported' as any, pattern: 'test' },
            ];

            // Act & Assert
            await expect(
                serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns)
            ).rejects.toThrow("Not supported pattern 'unsupported'");
        });
    });

    describe('Multiple pattern processing', () => {
        test('should process multiple patterns and combine results for files', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'path', pattern: 'src/file1.ts' },
                { patternType: 'glob', pattern: '**/*.js' },
            ];
            const pathResults = ['/test/base/src/file1.ts'];
            const globResults = ['/test/base/lib/file2.js', '/test/base/utils/file3.js'];

            mockDiscoverFilesWithPath.mockResolvedValue(pathResults);
            mockDiscoverFilesWithGlob.mockResolvedValue(globResults);

            // Act
            const result = await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(result).toEqual(
                [...pathResults, ...globResults].map(path => path.replaceAll('/', '\\'))
            );
            expect(mockDiscoverFilesWithPath).toHaveBeenCalledWith(
                baseDirectoryPath,
                'src/file1.ts'
            );
            expect(mockDiscoverFilesWithGlob).toHaveBeenCalledWith(
                baseDirectoryPath,
                '**/*.js',
                undefined
            );
        });

        test('should process multiple patterns and combine results for directories', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'path', pattern: 'src' },
                { patternType: 'path', pattern: 'lib' },
            ];
            const pathResults1 = ['/test/base/src'];
            const pathResults2 = ['/test/base/lib'];
            const combinedResults = ['/test/base/src', '/test/base/lib'];
            const normalizedResults = ['/test/base/src', '/test/base/lib'];

            mockDiscoverDirectoriesWithPath
                .mockResolvedValueOnce(pathResults1)
                .mockResolvedValueOnce(pathResults2);
            mockNormalizeDirectoryPaths.mockReturnValue(normalizedResults);

            // Act
            const result = await serviceUnderTest.discoverDirectories(
                baseDirectoryPath,
                searchPatterns
            );

            // Assert
            expect(result).toEqual(normalizedResults);
            expect(mockDiscoverDirectoriesWithPath).toHaveBeenCalledTimes(2);
            expect(mockNormalizeDirectoryPaths).toHaveBeenCalledWith(combinedResults);
        });
    });

    describe('Count files in directories', () => {
        test('should count files in directories successfully', async () => {
            // Arrange
            const directoryPaths = ['/test/dir1', '/test/dir2'];
            const expectedCount = 42;

            mockCountFilesInDirectories.mockResolvedValue(expectedCount);

            // Act
            const result = await serviceUnderTest.countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(expectedCount);
            expect(mockCountFilesInDirectories).toHaveBeenCalledWith(directoryPaths);
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Starting file count for 2 directories',
                expect.objectContaining({
                    operation: 'countFilesInDirectories',
                    processedCount: 2,
                    workingDirectory: '/test/dir1',
                })
            );
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'File counting operation completed with result: 42',
                expect.objectContaining({
                    operation: 'countFilesInDirectories',
                    processedCount: 42,
                    workingDirectory: '/test/dir1',
                })
            );
        });

        test('should return 0 for empty directory array', async () => {
            // Arrange
            const directoryPaths: string[] = [];

            // Act
            const result = await serviceUnderTest.countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(0);
            expect(mockCountFilesInDirectories).not.toHaveBeenCalled();
        });

        test('should return 0 for null directory array', async () => {
            // Arrange
            const directoryPaths = null as any;

            // Act
            const result = await serviceUnderTest.countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(0);
            expect(mockCountFilesInDirectories).not.toHaveBeenCalled();
        });

        test('should handle directory array with empty string as first element', async () => {
            // Arrange
            const directoryPaths = ['', '/test/dir2'];
            const expectedCount = 15;

            mockCountFilesInDirectories.mockResolvedValue(expectedCount);

            // Act
            const result = await serviceUnderTest.countFilesInDirectories(directoryPaths);

            // Assert
            expect(result).toBe(expectedCount);
            expect(mockCountFilesInDirectories).toHaveBeenCalledWith(directoryPaths);
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Starting file count for 2 directories',
                expect.objectContaining({
                    operation: 'countFilesInDirectories',
                    processedCount: 2,
                    workingDirectory: 'unknown', // This triggers the || 'unknown' fallback
                })
            );
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'File counting operation completed with result: 15',
                expect.objectContaining({
                    operation: 'countFilesInDirectories',
                    processedCount: 15,
                    workingDirectory: 'unknown', // This triggers the || 'unknown' fallback
                })
            );
        });
    });

    describe('Logging behavior', () => {
        test('should log debug information for file discovery operations', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [
                { patternType: 'path', pattern: 'test.ts' },
            ];

            mockDiscoverFilesWithPath.mockResolvedValue(['/test/base/test.ts']);

            // Act
            await serviceUnderTest.discoverFiles(baseDirectoryPath, searchPatterns);

            // Assert
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Discovering files in /test/base with 1 patterns',
                expect.objectContaining({
                    operation: 'filesDiscovery',
                    workingDirectory: baseDirectoryPath,
                })
            );
        });

        test('should log debug information for directory discovery operations', async () => {
            // Arrange
            const baseDirectoryPath = '/test/base';
            const searchPatterns: SearchPatternBase[] = [{ patternType: 'path', pattern: 'src' }];

            mockDiscoverDirectoriesWithPath.mockResolvedValue(['/test/base/src']);
            mockNormalizeDirectoryPaths.mockReturnValue(['/test/base/src']);

            // Act
            await serviceUnderTest.discoverDirectories(baseDirectoryPath, searchPatterns);

            // Assert
            expect(mockLoggerService.debug).toHaveBeenCalledWith(
                'Discovering directories in /test/base with 1 patterns',
                expect.objectContaining({
                    operation: 'directoriesDiscovery',
                    workingDirectory: baseDirectoryPath,
                })
            );
        });
    });
});
