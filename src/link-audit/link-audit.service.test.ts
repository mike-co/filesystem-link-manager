import 'reflect-metadata';
import * as fsExtra from 'fs-extra';
import * as path from 'node:path';
import mockFs from 'mock-fs';
import { LoggerService } from '../logging';
import { FileDiscoveryService } from '../symlink-creation/discovery';
import { LINK_AUDIT_DOMAIN_ERRORS } from './link-audit-domain-errors.const';
import { LinkAuditService } from './link-audit.service';
import type { LinkAuditCollection } from './types/audit-collection.interface';

jest.mock('fs-extra', () => {
    const actualFsExtraModule = jest.requireActual('fs-extra') as typeof import('fs-extra');
    return {
        ...actualFsExtraModule,
        writeJson: jest.fn(async (...args: Parameters<typeof actualFsExtraModule.writeJson>) =>
            actualFsExtraModule.writeJson(...args)
        ),
    };
});
const actualFsExtra = jest.requireActual('fs-extra') as typeof import('fs-extra');

describe('link-audit/link-audit.service', () => {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');

    let loggerSpies: {
        info: jest.Mock;
        error: jest.Mock;
        warn: jest.Mock;
        debug: jest.Mock;
    };
    let loggerMock: LoggerService;
    let fileDiscoveryService: FileDiscoveryService;
    let serviceUnderTest: LinkAuditService;

    beforeEach(() => {
        loggerSpies = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };
        loggerMock = loggerSpies as unknown as LoggerService;
        fileDiscoveryService = new FileDiscoveryService(loggerMock);
        serviceUnderTest = new LinkAuditService(loggerMock, fileDiscoveryService);

        const writeJsonMock = fsExtra.writeJson as jest.MockedFunction<
            typeof actualFsExtra.writeJson
        >;
        writeJsonMock.mockImplementation(async (...args) => actualFsExtra.writeJson(...args));
    });

    afterEach(() => {
        mockFs.restore();
        jest.restoreAllMocks();
    });

    describe('execute', () => {
        test('should skip execution when no collections provided', async () => {
            // Arrange
            const workspaceRoot = path.join(
                process.cwd(),
                'tmp',
                'link-audit-service-tests',
                'workspace-empty'
            );
            const discoverFilesSpy = jest.spyOn(fileDiscoveryService, 'discoverFiles');

            // Act
            const executionResult = await serviceUnderTest.execute({
                workspaceRoot,
                collections: [],
            });

            // Assert
            expect(executionResult).toEqual([]);
            expect(discoverFilesSpy).not.toHaveBeenCalled();

            const skipLogs = loggerSpies.info.mock.calls.filter(
                ([message, metadata]) =>
                    message === 'Link audit execution skipped: no collections provided.' &&
                    metadata?.operation === 'linkAuditExecution'
            );
            expect(skipLogs).toHaveLength(1);

            const skipLog = skipLogs[0];
            expect(skipLog).toBeDefined();

            if (!skipLog) {
                throw new Error('Expected skip log metadata to be captured.');
            }

            const [, metadata] = skipLog;
            expect(metadata).toMatchObject({
                collectionCount: 0,
                workspaceRoot: path.normalize(workspaceRoot),
            });
        });

        test('should process collections sequentially, deduplicate items, and persist reports', async () => {
            // Arrange
            const workspaceRoot = path.join(
                process.cwd(),
                'tmp',
                'link-audit-service-tests',
                'workspace-sequential'
            );
            const collectionOneOutput = path.join('reports', 'collection-one.json');
            const collectionTwoOutput = path.join('reports', 'collection-two.json');
            const symlinkPath = path.join(workspaceRoot, 'links', 'alpha-link.txt');
            const alphaUpperPath = path.join(workspaceRoot, 'source', 'files', 'ALPHA.TXT');
            const alphaLowerPath = path.join(workspaceRoot, 'source', 'files', 'alpha.txt');
            const betaPath = path.join(workspaceRoot, 'source', 'files', 'beta.txt');
            const gammaPath = path.join(workspaceRoot, 'source', 'files', 'gamma.txt');

            mockFs({
                [workspaceRoot]: {
                    source: {
                        files: {
                            'ALPHA.TXT': 'uppercase alpha',
                            'alpha.txt': 'lowercase alpha',
                            'beta.txt': 'beta content',
                            'gamma.txt': 'gamma content',
                        },
                    },
                    links: {
                        'alpha-link.txt': mockFs.symlink({ path: '../source/files/alpha.txt' }),
                    },
                },
                [nodeModulesPath]: mockFs.load(nodeModulesPath),
            });

            const discoveryResponses = [
                [symlinkPath, alphaUpperPath, alphaLowerPath, betaPath],
                [gammaPath],
            ];
            let discoveryCallIndex = 0;
            const discoverFilesMock = jest
                .spyOn(fileDiscoveryService, 'discoverFiles')
                .mockImplementation(async () => {
                    const response = discoveryResponses[discoveryCallIndex] ?? [];
                    discoveryCallIndex += 1;
                    return response;
                });

            const collections: LinkAuditCollection[] = [
                {
                    outputRelativePath: collectionOneOutput,
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
                {
                    outputRelativePath: collectionTwoOutput,
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
            ];
            const firstCollection = collections[0];
            const secondCollection = collections[1];

            if (!firstCollection || !secondCollection) {
                throw new Error('Expected two collections for integration test.');
            }

            // Act
            const executionResults = await serviceUnderTest.execute({
                workspaceRoot,
                collections,
            });

            // Assert
            expect(discoverFilesMock).toHaveBeenCalledTimes(2);
            const firstDiscoveryCall = discoverFilesMock.mock.calls[0];
            const secondDiscoveryCall = discoverFilesMock.mock.calls[1];

            expect(firstDiscoveryCall).toBeDefined();
            expect(secondDiscoveryCall).toBeDefined();

            if (!firstDiscoveryCall || !secondDiscoveryCall) {
                throw new Error('Expected discoverFiles to be invoked twice.');
            }

            expect(firstDiscoveryCall[0]).toBe(workspaceRoot);
            expect(firstDiscoveryCall[1]).toBe(firstCollection.searchPatterns);
            expect(firstDiscoveryCall[2]).toEqual({ followSymbolicLinks: true });
            expect(secondDiscoveryCall[0]).toBe(workspaceRoot);
            expect(secondDiscoveryCall[1]).toBe(secondCollection.searchPatterns);
            expect(secondDiscoveryCall[2]).toEqual({ followSymbolicLinks: true });

            expect(executionResults).toHaveLength(2);
            const [firstResult, secondResult] = executionResults;
            expect(firstResult).toBeDefined();
            expect(secondResult).toBeDefined();

            if (!firstResult || !secondResult) {
                throw new Error('Expected execution results for both collections.');
            }

            const expectedFirstOutputPath = path.normalize(
                path.join(workspaceRoot, collectionOneOutput)
            );
            const expectedSecondOutputPath = path.normalize(
                path.join(workspaceRoot, collectionTwoOutput)
            );

            expect(firstResult.outputPath).toBe(expectedFirstOutputPath);
            expect(secondResult.outputPath).toBe(expectedSecondOutputPath);

            const firstPersistedReport = await fsExtra.readJson(firstResult.outputPath);
            const secondPersistedReport = await fsExtra.readJson(secondResult.outputPath);

            expect(firstPersistedReport.itemCount).toBe(3);
            expect(firstPersistedReport.items).toHaveLength(3);
            const firstItemPaths = firstPersistedReport.items.map(
                (item: { path: string }) => item.path
            );
            expect(firstItemPaths).toEqual([
                path.normalize(symlinkPath),
                path.normalize(alphaUpperPath),
                path.normalize(betaPath),
            ]);

            const linkTypes = firstPersistedReport.items.map(
                (item: { linkType: string }) => item.linkType
            );
            expect(linkTypes).toEqual(['symlink', 'none', 'none']);

            expect(secondPersistedReport.itemCount).toBe(1);
            expect(secondPersistedReport.items).toHaveLength(1);
            expect(secondPersistedReport.items[0].path).toBe(path.normalize(gammaPath));

            const collectionStartLogs = loggerSpies.info.mock.calls.filter(
                ([, metadata]) => metadata?.operation === 'linkAuditCollectionStart'
            );
            expect(collectionStartLogs).toHaveLength(2);
            expect(collectionStartLogs[0][1]).toMatchObject({ collectionIndex: 0 });
            expect(collectionStartLogs[1][1]).toMatchObject({ collectionIndex: 1 });

            const collectionCompleteLogs = loggerSpies.info.mock.calls.filter(
                ([, metadata]) => metadata?.operation === 'linkAuditCollectionComplete'
            );
            expect(collectionCompleteLogs).toHaveLength(2);
            expect(collectionCompleteLogs[0][1]).toMatchObject({
                collectionIndex: 0,
                itemCount: 3,
            });
            expect(collectionCompleteLogs[1][1]).toMatchObject({
                collectionIndex: 1,
                itemCount: 1,
            });
        });

        test('should wrap discovery failures in domain error', async () => {
            // Arrange
            const workspaceRoot = path.join(
                process.cwd(),
                'tmp',
                'link-audit-service-tests',
                'workspace-discovery-error'
            );
            const collections: LinkAuditCollection[] = [
                {
                    outputRelativePath: path.join('reports', 'discovery-failure.json'),
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
            ];
            jest.spyOn(fileDiscoveryService, 'discoverFiles').mockRejectedValue(
                new Error('Discovery failure')
            );

            // Act
            const executionPromise = serviceUnderTest.execute({
                workspaceRoot,
                collections,
            });

            // Assert
            await expect(executionPromise).rejects.toMatchObject({
                domainErrorInfo: {
                    key: LINK_AUDIT_DOMAIN_ERRORS.DISCOVERY_FAILURE.key,
                },
            });

            const discoveryErrorLogs = loggerSpies.error.mock.calls.filter(
                ([, metadata]) => metadata?.operation === 'linkAuditCollectionDiscovery'
            );
            expect(discoveryErrorLogs).toHaveLength(1);

            const discoveryErrorLog = discoveryErrorLogs[0];
            expect(discoveryErrorLog).toBeDefined();

            if (!discoveryErrorLog) {
                throw new Error('Expected discovery error log to be recorded.');
            }

            const [, metadata] = discoveryErrorLog;
            expect(metadata).toMatchObject({
                workspaceRoot: path.normalize(workspaceRoot),
                outputRelativePath: path.join('reports', 'discovery-failure.json'),
            });
        });

        test('should reject when report output escapes workspace root', async () => {
            // Arrange
            const workspaceRoot = path.join(
                process.cwd(),
                'tmp',
                'link-audit-service-tests',
                'workspace-path-validation'
            );
            const validFilePath = path.join(workspaceRoot, 'source', 'files', 'valid.txt');

            mockFs({
                [workspaceRoot]: {
                    source: {
                        files: {
                            'valid.txt': 'valid content',
                        },
                    },
                },
                [nodeModulesPath]: mockFs.load(nodeModulesPath),
            });

            jest.spyOn(fileDiscoveryService, 'discoverFiles').mockResolvedValue([validFilePath]);

            const collections: LinkAuditCollection[] = [
                {
                    outputRelativePath: path.join('..', 'outside', 'report.json'),
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
            ];

            // Act
            const executionPromise = serviceUnderTest.execute({
                workspaceRoot,
                collections,
            });

            // Assert
            await expect(executionPromise).rejects.toMatchObject({
                domainErrorInfo: {
                    key: LINK_AUDIT_DOMAIN_ERRORS.REPORT_WRITE_FAILURE.key,
                },
            });

            const pathValidationErrors = loggerSpies.error.mock.calls.filter(
                ([, metadata]) => metadata?.operation === 'linkAuditReportPathValidation'
            );
            expect(pathValidationErrors).toHaveLength(1);

            const pathValidationError = pathValidationErrors[0];
            expect(pathValidationError).toBeDefined();

            if (!pathValidationError) {
                throw new Error('Expected path validation error log to be recorded.');
            }

            const [, metadata] = pathValidationError;
            expect(metadata).toMatchObject({
                workspaceRoot: path.normalize(workspaceRoot),
                outputRelativePath: path.join('..', 'outside', 'report.json'),
            });
        });

        test('should wrap persistence failures from writeJson', async () => {
            // Arrange
            const workspaceRoot = path.join(
                process.cwd(),
                'tmp',
                'link-audit-service-tests',
                'workspace-persistence-error'
            );
            const validFilePath = path.join(workspaceRoot, 'source', 'files', 'valid.txt');
            const outputRelativePath = path.join('reports', 'collection.json');

            mockFs({
                [workspaceRoot]: {
                    source: {
                        files: {
                            'valid.txt': 'content',
                        },
                    },
                },
                [nodeModulesPath]: mockFs.load(nodeModulesPath),
            });

            jest.spyOn(fileDiscoveryService, 'discoverFiles').mockResolvedValue([validFilePath]);
            const writeJsonMock = fsExtra.writeJson as jest.MockedFunction<
                typeof actualFsExtra.writeJson
            >;
            writeJsonMock.mockRejectedValue(new Error('Disk full'));

            const collections: LinkAuditCollection[] = [
                {
                    outputRelativePath,
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
            ];

            // Act
            const executionPromise = serviceUnderTest.execute({
                workspaceRoot,
                collections,
            });

            // Assert
            await expect(executionPromise).rejects.toMatchObject({
                domainErrorInfo: {
                    key: LINK_AUDIT_DOMAIN_ERRORS.REPORT_WRITE_FAILURE.key,
                },
            });

            const persistenceErrors = loggerSpies.error.mock.calls.filter(
                ([, metadata]) => metadata?.operation === 'linkAuditReportPersistence'
            );
            expect(persistenceErrors).toHaveLength(1);

            const outputPath = path.join(workspaceRoot, outputRelativePath);
            expect(await fsExtra.pathExists(outputPath)).toBe(false);

            const persistenceError = persistenceErrors[0];
            expect(persistenceError).toBeDefined();

            if (!persistenceError) {
                throw new Error('Expected persistence error metadata to be recorded.');
            }

            const [, metadata] = persistenceError;
            expect(metadata).toMatchObject({
                collectionIndex: 0,
                outputPath: path.normalize(outputPath),
            });
        });

        test('should surface classification errors after previous collections succeed', async () => {
            // Arrange
            const workspaceRoot = path.join(
                process.cwd(),
                'tmp',
                'link-audit-service-tests',
                'workspace-failure'
            );
            const successOutput = path.join('reports', 'collection-success.json');
            const failureOutput = path.join('reports', 'collection-failure.json');
            const validFilePath = path.join(workspaceRoot, 'source', 'files', 'valid.txt');
            const missingFilePath = path.join(workspaceRoot, 'source', 'files', 'missing.txt');

            mockFs({
                [workspaceRoot]: {
                    source: {
                        files: {
                            'valid.txt': 'valid content',
                        },
                    },
                },
                [nodeModulesPath]: mockFs.load(nodeModulesPath),
            });

            const discoveryResponses = [[validFilePath], [missingFilePath]];
            let discoveryCallIndex = 0;
            const discoverFilesMock = jest
                .spyOn(fileDiscoveryService, 'discoverFiles')
                .mockImplementation(async () => {
                    const response = discoveryResponses[discoveryCallIndex] ?? [];
                    discoveryCallIndex += 1;
                    return response;
                });

            const collections: LinkAuditCollection[] = [
                {
                    outputRelativePath: successOutput,
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
                {
                    outputRelativePath: failureOutput,
                    searchPatterns: [{ patternType: 'glob', pattern: '**/*.txt' }],
                },
            ];

            // Act
            const executionPromise = serviceUnderTest.execute({
                workspaceRoot,
                collections,
            });

            // Assert
            await expect(executionPromise).rejects.toMatchObject({
                domainErrorInfo: {
                    key: LINK_AUDIT_DOMAIN_ERRORS.CLASSIFICATION_FAILURE.key,
                },
            });

            expect(discoverFilesMock).toHaveBeenCalledTimes(2);
            const firstReportPath = path.join(workspaceRoot, successOutput);
            const failedReportPath = path.join(workspaceRoot, failureOutput);
            expect(await fsExtra.pathExists(firstReportPath)).toBe(true);
            expect(await fsExtra.pathExists(failedReportPath)).toBe(false);

            const classificationErrors = loggerSpies.error.mock.calls.filter(
                ([, metadata]) => metadata?.operation === 'linkAuditClassification'
            );
            expect(classificationErrors).toHaveLength(1);
            expect(classificationErrors[0][1]).toMatchObject({
                collectionIndex: 1,
                path: missingFilePath,
            });
        });
    });
});
