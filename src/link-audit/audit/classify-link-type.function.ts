import { lstat, readlink, realpath, stat } from 'fs-extra';
import { dirname, isAbsolute, normalize, resolve } from 'node:path';
import { platform } from 'node:os';
import { DomainError } from '../../common';
import { LINK_AUDIT_DOMAIN_ERRORS } from '../link-audit-domain-errors.const';

const WINDOWS_LONG_PATH_PREFIX_PATTERN = /^\\\\\?\\/u;

/**
 * Classifies the filesystem entry at the provided path by resolving link metadata.
 * Detects symbolic links, Windows directory junctions, hardlinks, and standard files.
 *
 * @param filePath Absolute or relative path to the filesystem entry to classify.
 * @returns Promise resolving to the detected link type and resolved target path.
 * @throws {DomainError} When filesystem metadata cannot be inspected.
 */
export async function classifyLinkType(
    filePath: string
): Promise<{ linkType: 'symlink' | 'junction' | 'hardlink' | 'none'; targetPath: string; }> {
    try {
        const normalizedInputPath = normalizeAbsolutePath(filePath);
        const metadata = await lstat(normalizedInputPath);
        const currentPlatform = platform();

        if (metadata.isSymbolicLink()) {
            const targetPath = await resolveSymbolicLinkTarget(normalizedInputPath);

            if (currentPlatform === 'win32') {
                try {
                    const resolvedStats = await stat(normalizedInputPath);

                    if (resolvedStats.isDirectory()) {
                        return {
                            linkType: 'junction',
                            targetPath
                        };
                    }
                } catch {
                    // If the target path cannot be resolved, fall back to reporting a generic symlink.
                }
            }

            return {
                linkType: 'symlink',
                targetPath
            };
        }

        const resolvedStats = await stat(normalizedInputPath);
        const canonicalTargetPath = await resolveRealpathOrFallback(normalizedInputPath);

        if (resolvedStats.isFile() && resolvedStats.nlink > 1) {
            return {
                linkType: 'hardlink',
                targetPath: canonicalTargetPath
            };
        }

        const ancestorLinkType = await detectAncestorSymbolicLink(
            normalizedInputPath,
            canonicalTargetPath,
            currentPlatform
        );

        if (ancestorLinkType !== null) {
            return {
                linkType: ancestorLinkType,
                targetPath: canonicalTargetPath
            };
        }

        return {
            linkType: 'none',
            targetPath: canonicalTargetPath
        };
    } catch (error) {
        throw new DomainError(LINK_AUDIT_DOMAIN_ERRORS.CLASSIFICATION_FAILURE, { cause: error });
    }
}

function normalizeAbsolutePath(pathValue: string): string {
    const absolutePath = isAbsolute(pathValue) ? pathValue : resolve(pathValue);

    return normalize(absolutePath).replace(WINDOWS_LONG_PATH_PREFIX_PATTERN, '');
}

async function resolveSymbolicLinkTarget(filePath: string): Promise<string> {
    try {
        const realTargetPath = await realpath(filePath);

        return normalizeAbsolutePath(realTargetPath);
    } catch {
        const linkTarget = await readlink(filePath);
        const absoluteTarget = isAbsolute(linkTarget) ? linkTarget : resolve(dirname(filePath), linkTarget);

        return normalizeAbsolutePath(absoluteTarget);
    }
}

async function resolveRealpathOrFallback(filePath: string): Promise<string> {
    try {
        const realTargetPath = await realpath(filePath);

        return normalizeAbsolutePath(realTargetPath);
    } catch {
        return normalizeAbsolutePath(filePath);
    }
}

interface SymbolicAncestorInfo {
    isDirectory: boolean;
}

async function detectAncestorSymbolicLink(
    inputPath: string,
    canonicalTargetPath: string,
    platformName: NodeJS.Platform
): Promise<'junction' | 'symlink' | null> {
    if (arePathsEquivalent(inputPath, canonicalTargetPath, platformName)) {
        return null;
    }

    const symbolicAncestor = await findNearestSymbolicAncestor(inputPath);

    if (symbolicAncestor === null) {
        return null;
    }

    if (platformName === 'win32' && symbolicAncestor.isDirectory) {
        return 'junction';
    }

    return 'symlink';
}

async function findNearestSymbolicAncestor(filePath: string): Promise<SymbolicAncestorInfo | null> {
    let previousPath = filePath;
    let currentPath = dirname(filePath);

    while (currentPath !== previousPath) {
        try {
            const candidateStats = await lstat(currentPath);

            if (candidateStats.isSymbolicLink()) {
                const isDirectory = await isDirectoryLinkTarget(currentPath);

                return { isDirectory };
            }
        } catch {
            // Continue searching upwards when metadata cannot be read for this segment.
        }

        previousPath = currentPath;
        currentPath = dirname(currentPath);
    }

    return null;
}

async function isDirectoryLinkTarget(pathValue: string): Promise<boolean> {
    try {
        const resolvedStats = await stat(pathValue);

        return resolvedStats.isDirectory();
    } catch {
        // Assume directory semantics when the target cannot be resolved. Ancestor
        // symbolic links that expose children behave as directories for traversal.
        return true;
    }
}

function arePathsEquivalent(
    firstPath: string,
    secondPath: string,
    platformName: NodeJS.Platform
): boolean {
    if (platformName === 'win32') {
        return firstPath.toLowerCase() === secondPath.toLowerCase();
    }

    return firstPath === secondPath;
}
