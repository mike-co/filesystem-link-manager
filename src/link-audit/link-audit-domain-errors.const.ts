import { DomainErrorInfo } from '../common';

/**
 * Domain-specific error definitions for the link audit feature.
 * Provides structured error metadata for consistent error handling across the domain.
 */
export const LINK_AUDIT_DOMAIN_ERRORS = {
    /** Error when configuration payload cannot be parsed from source. */
    CONFIG_PARSE: {
        key: 'LINK_AUDIT_CONFIG_PARSE',
        message: 'Failed to parse link audit configuration payload',
        description: 'Occurs when the link audit command cannot read or deserialize the provided configuration data.'
    } as DomainErrorInfo,

    /** Error when configuration does not satisfy schema validation rules. */
    CONFIG_SCHEMA_INVALID: {
        key: 'LINK_AUDIT_CONFIG_SCHEMA_INVALID',
        message: 'Link audit configuration does not match required schema',
        description: 'Occurs when configuration fields are missing, contain unsupported pattern types, or include invalid values.'
    } as DomainErrorInfo,

    /** Error when discovery pipeline fails for a collection. */
    DISCOVERY_FAILURE: {
        key: 'LINK_AUDIT_DISCOVERY_FAILURE',
        message: 'Failed to discover filesystem items for link audit collection',
        description: 'Occurs when the discovery service encounters errors while enumerating filesystem entries for a collection.'
    } as DomainErrorInfo,

    /** Error when link classification fails for a discovered item. */
    CLASSIFICATION_FAILURE: {
        key: 'LINK_AUDIT_CLASSIFICATION_FAILURE',
        message: 'Failed to classify link type for discovered filesystem entry',
        description: 'Occurs when filesystem metadata cannot be resolved to determine symlink, junction, hardlink, or standard file status.'
    } as DomainErrorInfo,

    /** Error when report output cannot be written to disk. */
    REPORT_WRITE_FAILURE: {
        key: 'LINK_AUDIT_REPORT_WRITE_FAILURE',
        message: 'Unable to persist link audit report to configured output path',
        description: 'Occurs when the report output directory cannot be created or the JSON file cannot be written to disk.'
    } as DomainErrorInfo
} as const;
