import { z } from 'zod';
import { DomainError } from '../../../common';
import { CONFIG_DOMAIN_ERRORS } from '../config-domain-errors.const';
import { isPathMappingEntry } from './is-path-mapping-entry.function';
import type { FileSystemOperationConfig } from '../types/core/file-system-operation-config.interface';

/**
 * Validates all configuration properties against defined schema before processing.
 * Uses zod validation to prevent injection attacks and ensure type safety.
 * Validates silent mode configuration requirements with graceful error handling.
 * Enforces pattern type validation where 'path' patterns can be string, string[], path mapping objects,
 * or arrays of path mapping objects, while all other pattern types must be string only.
 * 
 * @param config - Configuration object to validate
 * @returns Promise resolving to validation result with detailed error information
 */
export function validateConfig(config: unknown): Promise<void> {
    return Promise.resolve().then(() => {
                   // First check if config is an object to extract validation settings
            const configObj = (config as Partial<FileSystemOperationConfig> | undefined) ?? {};
            const disableRegexValidation = configObj?.disableRegexValidation === true;
            const disableCommandValidation = configObj?.disableCommandValidation === true;

            // Create schema with current validation settings
            const configSchema = createConfigSchema({
                disableRegexValidation,
                disableCommandValidation
            });

            // Comprehensive validation using zod with silent mode requirements
            configSchema.parse(config);

            // Additional hardlink compatibility validation for each operation
            if (configObj.operations) {
                for (const operation of configObj.operations) {
                    validateHardlinkCompatibility(operation);
                    validatePathMappingCompatibility(operation);
                }
            }
    });
}

/**
 * Validates that hardlink operations are only configured for files, not directories.
 * Throws domain error if hardlink is configured for directory item type.
 * 
 * @param operation - File system operation to validate (using unknown for runtime validation)
 * @throws DomainError when hardlink is configured for directories
 */
export function validateHardlinkCompatibility(operation: unknown): void {
    // Runtime validation for hardlink compatibility
    if (typeof operation === 'object' && operation !== null) {
        const op = operation as { action?: string; itemType?: string };
        
        if (op.action === 'hardlink' && op.itemType === 'directory') {
            const error = new DomainError(CONFIG_DOMAIN_ERRORS.CONFIG_TYPE);
            error.message = 'Hardlinks are not supported for directories. Use symlink instead.';
            throw error;
        }
    }

    // Valid cases: hardlink with file itemType, or any other action
}

const searchPatternContainsPathMapping = (pattern: unknown): boolean => {
    if (pattern === null || typeof pattern !== 'object' || Array.isArray(pattern)) {
        return false;
    }

    const candidate = pattern as Partial<{ patternType?: unknown; pattern?: unknown }>;

    if (candidate.patternType !== 'path') {
        return false;
    }

    const patternValue = candidate.pattern;

    if (Array.isArray(patternValue)) {
        return patternValue.some(entry => isPathMappingEntry(entry));
    }

    return isPathMappingEntry(patternValue);
};

const getPathMappingError = (): DomainError => {
    const error = new DomainError(CONFIG_DOMAIN_ERRORS.CONFIG_TYPE);
    error.message = 'Path mapping entries are only supported for copy and hardlink file operations.';
    return error;
};

const operationContainsPathMapping = (operation: unknown): boolean => {
    if (operation === null || typeof operation !== 'object') {
        return false;
    }

    const candidate = operation as Partial<{ searchPatterns?: unknown[] }>;

    if (!Array.isArray(candidate.searchPatterns)) {
        return false;
    }

    return candidate.searchPatterns.some(searchPatternContainsPathMapping);
};

const isSupportedForPathMappings = (operation: unknown): boolean => {
    if (operation === null || typeof operation !== 'object') {
        return false;
    }

    const candidate = operation as Partial<{ action?: unknown; itemType?: unknown }>;

    const isCopyOrHardlink = candidate.action === 'copy' || candidate.action === 'hardlink';
    const isFileItemType = candidate.itemType === 'file';

    return Boolean(isCopyOrHardlink && isFileItemType);
};

const validatePathMappingCompatibility = (operation: unknown): void => {
    if (!operationContainsPathMapping(operation)) {
        return;
    }

    if (isSupportedForPathMappings(operation)) {
        return;
    }

    throw getPathMappingError();
};

/**
 * Creates schema for search pattern validation with comprehensive pattern type support.
 * Enforces that 'path' patterns can be string or string[], while other types must be string only.
 * 
 * @param disableRegexValidation - Whether to skip regex-based validation for patterns
 * @returns Zod schema for search pattern validation
 */
const pathMappingEntrySchema = z.object({
    sourcePath: z.string()
        .min(1, { message: 'Path mapping sourcePath must be a non-empty string' })
        .refine(value => value.trim().length > 0, { message: 'Path mapping sourcePath cannot be whitespace' }),
    destinationPath: z.string()
        .min(1, { message: 'Path mapping destinationPath must be a non-empty string' })
        .refine(value => value.trim().length > 0, { message: 'Path mapping destinationPath cannot be whitespace' }),
}).strict();

const pathPatternMixedArraySchema = z.array(z.union([
    z.string().min(1, { message: 'Pattern array elements cannot be empty' }),
    pathMappingEntrySchema
])).min(1, { message: 'Pattern array cannot be empty' });

const createSearchPatternSchema = (disableRegexValidation?: boolean) => z.object({
    patternType: z.enum(['glob', 'regex', 'ignore-rules-file-path', 'path'], {
        errorMap: () => ({ message: 'Pattern type must be "glob", "regex", "ignore-rules-file-path", or "path"' }),
    }),
    pattern: z.union([
        z.string().min(1, { message: 'Pattern cannot be empty' }),
        z.array(z.string().min(1, { message: 'Pattern array elements cannot be empty' })).min(1, { message: 'Pattern array cannot be empty' }),
        pathMappingEntrySchema,
        z.array(pathMappingEntrySchema).min(1, { message: 'Path mapping entry array cannot be empty' }),
        pathPatternMixedArraySchema
    ]),
}).superRefine((data, ctx) => {
    const isPathMappingObject = (value: unknown): value is { sourcePath: string; destinationPath: string } => {
        if (Array.isArray(value) || value === null || typeof value !== 'object') {
            return false;
        }

        const candidate = value as Partial<{ sourcePath: unknown; destinationPath: unknown }>;
        return typeof candidate.sourcePath === 'string' && typeof candidate.destinationPath === 'string';
    };

    const arrayContainsPathMappings = Array.isArray(data.pattern) && data.pattern.some(entry => isPathMappingObject(entry));

    // Pattern type-specific validation: only 'path' patterns can be arrays or path mapping entries
    if (data.patternType !== 'path' && Array.isArray(data.pattern)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pattern'],
            message: `Pattern type "${data.patternType}" must be a string, not an array. Only "path" patterns can be arrays.`,
        });
        return;
    }

    if (data.patternType !== 'path' && (isPathMappingObject(data.pattern) || arrayContainsPathMappings)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pattern'],
            message: `Pattern type "${data.patternType}" does not support path mapping objects. Use patternType "path" for source-to-destination mappings.`,
        });
        return;
    }
    // Skip regex validation if disabled
    if (disableRegexValidation === true) {
        return;
    }

    // Comprehensive regex validation with ReDoS protection
    if (data.patternType === 'regex') {
        if (typeof data.pattern !== 'string') {
            return;
        }

        const patternString = data.pattern;

        try {
            // Advanced ReDoS pattern detection
            const redosPatterns = [
                // Exponential backtracking patterns
                { pattern: /\(\w\+\)\+/, description: 'nested quantifiers (a+)+', explanation: 'Nested quantifiers can cause catastrophic backtracking and ReDoS.', suggestion: 'Avoid nesting quantifiers like (a+)+. Use a single quantifier or refactor the pattern.' },
                { pattern: /\(\w\*\)\+/, description: 'nested quantifiers (a*)+', explanation: 'Nested quantifiers can cause catastrophic backtracking and ReDoS.', suggestion: 'Avoid nesting quantifiers like (a*)+. Use a single quantifier or refactor the pattern.' },
                { pattern: /\(\w\+\)\*/, description: 'nested quantifiers (a+)*', explanation: 'Nested quantifiers can cause catastrophic backtracking and ReDoS.', suggestion: 'Avoid nesting quantifiers like (a+)*. Use a single quantifier or refactor the pattern.' },
                { pattern: /\(\w\*\)\*/, description: 'nested quantifiers (a*)*', explanation: 'Nested quantifiers can cause catastrophic backtracking and ReDoS.', suggestion: 'Avoid nesting quantifiers like (a*)*. Use a single quantifier or refactor the pattern.' },
                // Alternation with overlap
                { pattern: /\(\w\+\|\w\*\)/, description: 'overlapping alternation', explanation: 'Overlapping alternation can lead to excessive backtracking.', suggestion: 'Refactor alternation to avoid overlap, e.g., separate patterns.' },
                // Complex nested groups
                { pattern: /\(\([^)]+\)\+\)/, description: 'nested groups with quantifiers', explanation: 'Nested groups with quantifiers can cause performance issues.', suggestion: 'Flatten nested groups or reduce quantifier usage.' },
                // Unbounded quantifiers
                { pattern: /(\.\*){2,}/, description: 'multiple unbounded quantifiers (.*.*)', explanation: 'Multiple unbounded quantifiers can cause excessive backtracking.', suggestion: 'Use fewer unbounded quantifiers and anchor your pattern.' },
                { pattern: /(\.\+){2,}/, description: 'multiple unbounded quantifiers (.+.+)', explanation: 'Multiple unbounded quantifiers can cause excessive backtracking.', suggestion: 'Use fewer unbounded quantifiers and anchor your pattern.' },
                // Ambiguous overlapping
                { pattern: /\((a|aa)\)\+/, description: 'ambiguous overlapping (a|aa)+', explanation: 'Ambiguous overlapping can cause exponential backtracking.', suggestion: 'Refactor alternation to avoid ambiguity.' },
                { pattern: /\((.*a)\)\+/, description: 'ambiguous overlapping (.*a)+', explanation: 'Ambiguous overlapping can cause exponential backtracking.', suggestion: 'Refactor alternation to avoid ambiguity.' },
                // Excessive backreferences
                { pattern: /(\\\d{2,})/, description: 'excessive backreferences (\\10, \\11, ...)', explanation: 'Excessive backreferences can cause performance issues.', suggestion: 'Limit the use of backreferences.' },
            ];

            for (const redosPattern of redosPatterns) {
                if (redosPattern.pattern.test(patternString)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['pattern'],
                        message: `Regular expression contains potential ReDoS vulnerability: ${redosPattern.description}. ${redosPattern.explanation} Suggestion: ${redosPattern.suggestion}`,
                    });
                    return;
                }
            }

            // Test regex compilation and validate syntax
            const testRegex = new RegExp(patternString);

            // Additional validation for common problematic patterns
            if (patternString.length > 1000) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['pattern'],
                    message: 'Regular expression pattern is too long (maximum 1000 characters)',
                });
            }

            // Test with empty string to ensure no immediate errors
            testRegex.test('');

        } catch {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['pattern'],
                message: 'Invalid regular expression syntax',
            });
        }
    }

    // Pattern-specific validation for different pattern types
    if (data.patternType === 'glob') {
        if (typeof data.pattern !== 'string') {
            return;
        }

        const patternString = data.pattern;

        // Basic glob pattern validation
        if (patternString.includes('**/**')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['pattern'],
                message: 'Glob pattern contains redundant double globstar (**/**)',
            });
        }
    }

    if (data.patternType === 'ignore-rules-file-path') {
        if (typeof data.pattern !== 'string') {
            return;
        }

        const patternString = data.pattern;

        // Validate ignore rules file path format
        if (patternString.trim() !== patternString) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['pattern'],
                message: 'Ignore rules file path cannot have leading or trailing whitespace',
            });
        }

        if (patternString.includes('..')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['pattern'],
                message: 'Ignore rules file path cannot contain path traversal sequences (..)',
            });
        }
    }
});

/**
 * Creates schema for FileSystemOperation base properties validation.
 * 
 * @param disableRegexValidation - Whether to skip regex-based validation for search patterns
 * @returns Zod schema for FileSystemOperation base properties
 */
const createFileSystemOperationBaseSchema = (disableRegexValidation?: boolean) => z.object({
    baseDirectoryPath: z.string().min(1, { message: 'Base directory path cannot be empty' }),
    searchPatterns: z.array(createSearchPatternSchema(disableRegexValidation)).min(1, {
        message: 'At least one search pattern is required'
    }),
    destinationPath: z.string().optional(),
    fileAttributeAdjustment: z.object({
        readonly: z.enum(['preserve', 'set', 'remove'], {
            errorMap: () => ({ message: 'Readonly attribute must be "preserve", "set", or "remove"' }),
        }),
        backupFilePath: z.string().optional(),
    }).optional(),
});

/**
 * Creates schema for FileSystemOperation discriminated union validation.
 * Supports symlink, copy, and hardlink operations with appropriate item type restrictions.
 * 
 * @param disableRegexValidation - Whether to skip regex-based validation for search patterns
 * @returns Zod schema for FileSystemOperation discriminated union
 */
const createFileSystemOperationSchema = (disableRegexValidation?: boolean) => {
    const baseSchema = createFileSystemOperationBaseSchema(disableRegexValidation);

    return z.union([
        // Symlink operations
        baseSchema.extend({
            action: z.literal('symlink'),
            itemType: z.literal('file'),
        }),
        baseSchema.extend({
            action: z.literal('symlink'),
            itemType: z.literal('directory'),
        }),
        // Copy operations
        baseSchema.extend({
            action: z.literal('copy'),
            itemType: z.literal('file'),
        }),
        baseSchema.extend({
            action: z.literal('copy'),
            itemType: z.literal('directory'),
        }),
        // Hardlink operations (file only)
        baseSchema.extend({
            action: z.literal('hardlink'),
            itemType: z.literal('file'),
        }),
    ]);
};

/**
 * Creates schema for post-execution command validation with comprehensive security checks.
 * Validates command structure, timeout values, and detects potentially dangerous commands.
 * 
 * @param disableCommandValidation - Whether to skip security validation for shell commands
 * @returns Zod schema for PostExecutionCommand validation
 */
const createPostExecutionCommandSchema = (disableCommandValidation?: boolean) => z.object({
    command: z.string().min(1, { message: 'Command cannot be empty' }),
    skipIfPathExists: z.string().optional(),
    cwd: z.string().optional(),
    timeoutInMs: z.number().int().min(1, { message: 'Timeout must be a positive integer in milliseconds' }).optional(),
    env: z.record(z.string(), z.string()).optional(),
    shell: z.union([z.boolean(), z.string(), z.instanceof(URL)]).optional(),
}).superRefine((data, ctx) => {
    // Basic trimming validation for command and skipIfPathExists
    if (typeof data.command === 'string' && data.command.trim().length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['command'],
            message: 'Command cannot be empty or whitespace only',
        });
    }

    if (data.skipIfPathExists !== undefined) {
        if (typeof data.skipIfPathExists !== 'string' || data.skipIfPathExists.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['skipIfPathExists'],
                message: 'skipIfPathExists must be a non-empty path when provided',
            });
        }
    }

    // Validate cwd path
    if (data.cwd !== undefined) {
        if (typeof data.cwd !== 'string' || data.cwd.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cwd'],
                message: 'cwd must be a non-empty path when provided',
            });
        }
    }

    // Skip command security validation if disabled
    if (disableCommandValidation === true) {
        return;
    }

    // Security validation for shell commands
    const unsafePatterns = [
        {
            pattern: /rm\s+-rf\s+\//,
            description: 'rm -rf / (recursive deletion of root)',
            explanation: 'This command recursively deletes all files from the root directory, which will destroy the entire filesystem.',
            suggestion: 'Use specific directory paths instead of root (/). Consider using safer commands like find with -delete or specific rm commands for target directories.'
        },
        {
            pattern: /rm\s+-rf\s+\*/,
            description: 'rm -rf * (recursive deletion of all files)',
            explanation: 'This command recursively deletes all files in the current directory and subdirectories, which can cause data loss.',
            suggestion: 'Use specific file patterns or directory names instead of wildcards. Consider using safer commands with explicit paths.'
        },
        {
            pattern: /^\s*curl\s+\S/,
            description: 'curl command at start',
            explanation: 'Curl commands can download and execute arbitrary content from external sources, potentially introducing malware or data breaches.',
            suggestion: 'Avoid downloading external content in automated scripts. If necessary, validate URLs and use secure protocols (HTTPS) with trusted sources.'
        },
        {
            pattern: /;\s*curl\s+\S/,
            description: 'curl command after semicolon',
            explanation: 'Chained curl commands can download and execute arbitrary content, bypassing command validation.',
            suggestion: 'Remove curl commands from chained operations. Use separate, validated steps for any necessary downloads.'
        },
        {
            pattern: /&&\s*curl\s+\S/,
            description: 'curl command after &&',
            explanation: 'Conditional curl execution can download arbitrary content when previous commands succeed.',
            suggestion: 'Avoid using curl in conditional chains. Separate download operations and validate them independently.'
        },
        {
            pattern: /\|\s*curl\s+\S/,
            description: 'curl command after pipe',
            explanation: 'Piping data to curl can send sensitive information to external servers or download malicious content.',
            suggestion: 'Remove piped curl operations. Handle data processing and external communications separately with proper validation.'
        },
        {
            pattern: /^\s*wget\s+\S/,
            description: 'wget command at start',
            explanation: 'Wget commands can download arbitrary content from external sources, potentially introducing security risks.',
            suggestion: 'Avoid downloading external content in automated scripts. If necessary, use secure protocols and validate sources.'
        },
        {
            pattern: /;\s*wget\s+\S/,
            description: 'wget command after semicolon',
            explanation: 'Chained wget commands can download arbitrary content, bypassing security controls.',
            suggestion: 'Remove wget from chained operations. Use separate, validated steps for any necessary downloads.'
        },
        {
            pattern: /&&\s*wget\s+\S/,
            description: 'wget command after &&',
            explanation: 'Conditional wget execution can download arbitrary content when previous commands succeed.',
            suggestion: 'Avoid using wget in conditional chains. Separate download operations and validate them independently.'
        },
        {
            pattern: /\|\s*wget\s+\S/,
            description: 'wget command after pipe',
            explanation: 'Piping data to wget can send information to external servers or download malicious content.',
            suggestion: 'Remove piped wget operations. Handle data processing and external communications separately.'
        },
        {
            pattern: /\|\s*bash/,
            description: 'pipe to bash',
            explanation: 'Piping data to bash can execute arbitrary commands, including potentially malicious code from external sources.',
            suggestion: 'Avoid piping data to shell interpreters. Use explicit script files or command validation instead.'
        },
        {
            pattern: /\|\s*sh/,
            description: 'pipe to sh',
            explanation: 'Piping data to sh can execute arbitrary commands, creating security vulnerabilities.',
            suggestion: 'Avoid piping data to shell interpreters. Use explicit script files with proper validation instead.'
        },
        {
            pattern: /;\s*rm\b/,
            description: 'rm command after semicolon',
            explanation: 'Chained rm commands can delete files unexpectedly, especially if previous commands fail or succeed unexpectedly.',
            suggestion: 'Use separate rm commands with explicit error handling. Avoid chaining deletion operations.'
        },
        {
            pattern: /&&\s*rm\b/,
            description: 'rm command after &&',
            explanation: 'Conditional rm commands can delete files based on previous command success, which may be unpredictable.',
            suggestion: 'Use separate rm commands with explicit conditions and error handling instead of command chaining.'
        },
        {
            pattern: /format\s+c:/,
            description: 'format c: command',
            explanation: 'This Windows command formats the C: drive, which will erase all data on the primary system drive.',
            suggestion: 'Never use format commands in automated scripts. Use specific file operations for data management instead.'
        },
        {
            pattern: /del\s+\/s/,
            description: 'del /s command',
            explanation: 'This Windows command recursively deletes files from directories and subdirectories, potentially causing data loss.',
            suggestion: 'Use specific file paths instead of recursive deletion. Consider safer alternatives like moving files to a backup location first.'
        }
    ];

    // Test the entire command for unsafe patterns
    const lowerCommand = data.command.toLowerCase();
    const violatingPattern = unsafePatterns.find(({ pattern }) => pattern.test(lowerCommand));

    if (violatingPattern) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['command'],
            message: `Security violation: ${violatingPattern.description} found in command: ${data.command}. ${violatingPattern.explanation} Suggestion: ${violatingPattern.suggestion}`,
        });
    }
});

/**
 * Creates comprehensive zod schema for FileSystemOperationConfig validation.
 * Includes optional validation settings for regex and command security checks.
 * 
 * @param config - Optional configuration for validation behavior
 * @param config.disableRegexValidation - Whether to skip regex-based validation
 * @param config.disableCommandValidation - Whether to skip command security validation
 * @returns Zod schema for FileSystemOperationConfig validation
 */
const createConfigSchema = (config?: { disableRegexValidation?: boolean; disableCommandValidation?: boolean }) => {
    return z.object({
        targetDirectoryPath: z.string().min(1, {
            message: 'Target directory path cannot be empty'
        }),
        silentMode: z.boolean().optional(),
        defaultOverwriteBehavior: z.enum(['overwrite', 'skip', 'error'], {
            errorMap: () => ({ message: 'Default overwrite behavior must be "overwrite", "skip", or "error"' }),
        }),
        operations: z.array(createFileSystemOperationSchema(config?.disableRegexValidation)).optional(),
        postExecutionCommands: z.array(createPostExecutionCommandSchema(config?.disableCommandValidation)).optional(),
        fileCountPromptThreshold: z.number().int().min(1, {
            message: 'File count prompt threshold must be a positive integer',
        }),
        enableSourceDeduplication: z.boolean().optional(),
        disableRegexValidation: z.boolean().optional(),
        disableCommandValidation: z.boolean().optional(),
    }).superRefine((config, ctx) => {
        // When silentMode is enabled, validate that defaultOverwriteBehavior is not 'error'
        if (config.silentMode === true) {
            if (config.defaultOverwriteBehavior === 'error') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['defaultOverwriteBehavior'],
                    message: 'When silentMode is enabled, defaultOverwriteBehavior cannot be "error" because user interaction is not allowed',
                });
            }
        }

        // Additional validation: Ensure at least one operation is configured
        if (!config.operations?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [],
                message: 'Configuration must specify at least one operation in the operations array',
            });
        }
    });
};