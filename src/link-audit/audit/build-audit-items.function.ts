import { isAbsolute, normalize, resolve } from 'node:path';
import { LinkAuditItem } from '../types/link-audit-item.interface';

const WINDOWS_LONG_PATH_PREFIX_PATTERN = /^\\\\\?\\/u;

/**
 * Deduplicates and sorts link audit items to produce a canonical report sequence.
 * Removes duplicate entries by path (case-insensitive) and normalizes paths for consistent output.
 *
 * @param items Collection of link audit items to normalize.
 * @returns Deduplicated and sorted audit items ready for persistence.
 */
export function buildAuditItems(items: readonly LinkAuditItem[]): LinkAuditItem[] {
    const deduplicatedItems = new Map<string, LinkAuditItem>();

    for (const item of items) {
        const normalizedPath = normalizeAbsolutePath(item.path);
        const normalizedTargetPath = normalizeAbsolutePath(item.targetPath);
        const dedupeKey = normalizedPath.toLocaleLowerCase();

        if (!deduplicatedItems.has(dedupeKey)) {
            deduplicatedItems.set(dedupeKey, {
                ...item,
                path: normalizedPath,
                targetPath: normalizedTargetPath
            });
        }
    }

    return Array.from(deduplicatedItems.values()).sort((first, second) =>
        first.path.localeCompare(second.path, undefined, { sensitivity: 'base' })
    );
}

function normalizeAbsolutePath(pathValue: string): string {
    const absolutePath = isAbsolute(pathValue) ? pathValue : resolve(pathValue);

    return normalize(absolutePath).replace(WINDOWS_LONG_PATH_PREFIX_PATTERN, '');
}
