import type { GlobSearchPattern } from './glob-search-pattern.interface';
import type { IgnoreRulesSearchPattern } from './ignore-rules-search-pattern.interface';
import type { PathSearchPattern } from './path-search-pattern.interface';
import type { RegexSearchPattern } from './regex-search-pattern.interface';

/**
 * Discriminated union for all search pattern types.
 * Supports regex, glob, path, and ignore rules file patterns for flexible file discovery.
 * Each pattern type provides specific matching capabilities with type safety.
 */
export type SearchPattern = RegexSearchPattern | GlobSearchPattern | IgnoreRulesSearchPattern | PathSearchPattern;