import { z, ZodError } from 'zod';
import type { ZodIssue } from 'zod';
import { DomainError } from '../../common';
import { LINK_AUDIT_DOMAIN_ERRORS } from '../link-audit-domain-errors.const';
import { LinkAuditCollection } from '../types/audit-collection.interface';

const linkAuditSearchPatternSchema = z.object({
    patternType: z.enum(['glob', 'regex']),
    pattern: z.string().min(1, 'Search pattern must be a non-empty string')
}).strict();

const linkAuditCollectionSchema = z.object({
    searchPatterns: z.array(linkAuditSearchPatternSchema).min(1, 'At least one search pattern is required for each collection'),
    outputRelativePath: z.string().min(1, 'Output relative path is required for each collection')
}).strict();

const multiCollectionConfigSchema = z.object({
    collections: z.array(linkAuditCollectionSchema).min(1, 'Configuration must include at least one link audit collection')
}).strict();

type MultiCollectionConfig = z.infer<typeof multiCollectionConfigSchema>;
type SingleCollectionConfig = z.infer<typeof linkAuditCollectionSchema>;

const linkAuditConfigurationSchema = z.union([
    multiCollectionConfigSchema,
    linkAuditCollectionSchema
]);

/**
 * Formats a Zod validation error into a concise human-readable message.
 * Aggregates all issue messages with their associated data paths.
 * @param validationError Zod validation error containing schema issue details.
 * @returns Aggregated validation error message.
 */
function formatZodError(validationError: ZodError): string {
    const issueMessages = flattenIssues(validationError.issues);

    return issueMessages.join('; ');
}

/**
 * Recursively flattens Zod issue structures, including nested union errors, into readable messages.
 * @param issues Collection of issues reported by Zod during validation.
 * @returns Flattened list of issue messages with their associated data paths.
 */
function flattenIssues(issues: ZodIssue[]): string[] {
    return issues.flatMap((issue) => {
        if (issue.code === 'invalid_union') {
            return issue.unionErrors.flatMap((unionError) => flattenIssues(unionError.issues));
        }

        const issuePath = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return [`${issuePath}: ${issue.message}`];
    });
}

/**
 * Type guard that determines whether the parsed configuration contains a collections array.
 * @param value Parsed configuration value to inspect.
 * @returns True when the configuration represents the multi-collection format.
 */
function isMultiCollectionConfig(value: MultiCollectionConfig | SingleCollectionConfig): value is MultiCollectionConfig {
    return Object.prototype.hasOwnProperty.call(value, 'collections');
}

/**
 * Parses the provided configuration payload using the link audit schema.
 * Supports both the recommended multi-collection format and the single-collection format.
 * @param configuration Unknown configuration payload supplied by the caller.
 * @returns Normalized array of link audit collections.
 * @throws {DomainError} When validation fails or configuration cannot be parsed.
 */
export function parseLinkAuditConfiguration(configuration: unknown): LinkAuditCollection[] {
    try {
        const parsedConfiguration = linkAuditConfigurationSchema.parse(configuration);

        if (isMultiCollectionConfig(parsedConfiguration)) {
            return parsedConfiguration.collections;
        }

        return [parsedConfiguration];
    }
    catch (error) {
        if (error instanceof ZodError) {
            const aggregatedMessage = formatZodError(error);

            throw new DomainError(
                {
                    ...LINK_AUDIT_DOMAIN_ERRORS.CONFIG_SCHEMA_INVALID,
                    message: `${LINK_AUDIT_DOMAIN_ERRORS.CONFIG_SCHEMA_INVALID.message}: ${aggregatedMessage}`
                },
                { cause: error }
            );
        }

        throw new DomainError(LINK_AUDIT_DOMAIN_ERRORS.CONFIG_PARSE, { cause: error });
    }
}
