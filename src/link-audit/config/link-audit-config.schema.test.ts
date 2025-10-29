import { DomainError } from '../../common';
import { parseLinkAuditConfiguration } from './link-audit-config.schema';

describe('link-audit-config.schema', () => {
    test('should parse multi-collection configuration into strongly typed collections', () => {
        // Arrange
        const configuration = {
            collections: [
                {
                    searchPatterns: [
                        { patternType: 'glob', pattern: '**/*.ts' },
                        { patternType: 'regex', pattern: '^src/.*\\.test\\.ts$' },
                    ],
                    outputRelativePath: '.filesystem-link-manager/audits/typescript.json',
                },
                {
                    searchPatterns: [{ patternType: 'glob', pattern: 'packages/**/package.json' }],
                    outputRelativePath: '.filesystem-link-manager/audits/packages.json',
                },
            ],
        };

        // Act
        const result = parseLinkAuditConfiguration(configuration);

        // Assert
        expect(result).toHaveLength(2);

        const firstCollection = result[0];
        const secondCollection = result[1];

        if (!firstCollection || !secondCollection) {
            throw new Error('link audit configuration should produce two collections');
        }

        const firstPattern = firstCollection.searchPatterns[0];

        if (!firstPattern) {
            throw new Error('first collection should include at least one search pattern');
        }

        expect(firstPattern.patternType).toBe('glob');
        expect(secondCollection.outputRelativePath).toBe(
            '.filesystem-link-manager/audits/packages.json'
        );
    });

    test('should normalize single-collection configuration into array format', () => {
        // Arrange
        const configuration = {
            searchPatterns: [{ patternType: 'glob', pattern: 'src/**/*.ts' }],
            outputRelativePath: '.filesystem-link-manager/audits/single.json',
        };

        // Act
        const result = parseLinkAuditConfiguration(configuration);

        // Assert
        expect(result).toHaveLength(1);

        const [singleCollection] = result;

        if (!singleCollection) {
            throw new Error('single configuration should produce a single collection');
        }

        expect(singleCollection.outputRelativePath).toBe(
            '.filesystem-link-manager/audits/single.json'
        );
    });

    test('should throw DomainError when unsupported pattern type is provided', () => {
        // Arrange
        const configuration = {
            collections: [
                {
                    searchPatterns: [{ patternType: 'path', pattern: ['foo/bar'] }],
                    outputRelativePath: '.filesystem-link-manager/audits/invalid.json',
                },
            ],
        };

        // Act & Assert
        expect.assertions(2);

        try {
            parseLinkAuditConfiguration(configuration);
        } catch (error) {
            expect(error).toBeInstanceOf(DomainError);

            if (error instanceof DomainError) {
                expect(error.message).toContain('patternType');
            }

            return;
        }

        throw new Error(
            'Expected configuration parsing to throw DomainError for unsupported pattern type'
        );
    });

    test('should include validation issues in DomainError message when configuration is incomplete', () => {
        // Arrange
        const configuration = {
            collections: [
                {
                    searchPatterns: [],
                    outputRelativePath: '',
                },
            ],
        };

        // Act & Assert
        expect.assertions(3);

        try {
            parseLinkAuditConfiguration(configuration);
        } catch (error) {
            expect(error).toBeInstanceOf(DomainError);

            if (error instanceof DomainError) {
                expect(error.message).toContain('searchPatterns');
                expect(error.message).toContain('outputRelativePath');
            }

            return;
        }

        throw new Error(
            'Expected configuration parsing to throw DomainError for empty collection fields'
        );
    });
});
