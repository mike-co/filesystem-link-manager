import { basename, relative } from 'path';
import { window } from 'vscode';
import { DomainError } from '../../../common/domain.error';
import { COPYING_DOMAIN_ERRORS } from '../copying-domain-errors.const';

/**
 * Handles overwrite behavior for existing files and directories during copy operations.
 * Supports both silent mode (using default behavior) and interactive mode (user prompts).
 * 
 * @param sourcePath - The absolute path of the source file or directory to copy from.
 * @param targetPath - The absolute path of the target file or directory to copy to.
 * @param options - Configuration options for the overwrite behavior.
 * @param options.silentMode - Whether to operate in silent mode without user prompts.
 * @param options.defaultOverwriteBehavior - The default behavior when files exist ('overwrite' | 'skip' | 'error').
 * @returns Promise resolving to true if overwrite should proceed, false otherwise.
 * @throws DomainError when invalid parameters or error behavior is specified.
 */
export async function handleOverwrite(
    sourcePath: string,
    targetPath: string,
    options: {
        /** Whether to operate in silent mode without user prompts. */
        silentMode: boolean
        /** The default behavior when files exist ('overwrite' | 'skip' | 'error'). */
        defaultOverwriteBehavior?: 'overwrite' | 'skip' | 'error';
    }
): Promise<boolean> {
    // Parameter validation
    if (!sourcePath || sourcePath.trim().length === 0) {
        throw new DomainError({
            ...COPYING_DOMAIN_ERRORS.COPY_TYPE,
            message: 'Source path for copy operation is empty or invalid.'
        });
    }

    if (!targetPath || targetPath.trim().length === 0) {
        throw new DomainError({
            ...COPYING_DOMAIN_ERRORS.COPY_TYPE,
            message: 'Target path for copy operation is empty or invalid.'
        });
    }

    // Interactive mode - show user prompts
    if (!options.silentMode) {
        return await promptUserForOverwrite(sourcePath, targetPath);
    }

    // Silent mode - use defaultOverwriteBehavior
    const behavior = options.defaultOverwriteBehavior || 'overwrite';

    if (behavior === 'error') {
        throw new DomainError({
            ...COPYING_DOMAIN_ERRORS.COPY_OVERWRITE,
            message: `Target already exists: ${targetPath}`
        });
    }

    if (behavior === 'skip') {
        return false;
    }

    // Default is 'overwrite'
    return true;
}

/**
 * Prompts the user for overwrite decision in interactive mode.
 * 
 * @param sourcePath - The absolute path of the source file or directory (for enhanced prompts).
 * @param targetPath - The absolute path of the target file or directory that already exists.
 * @returns Promise resolving to true if user chooses to overwrite, false otherwise.
 * @throws DomainError when user cancels the operation.
 */
async function promptUserForOverwrite(sourcePath: string, targetPath: string): Promise<boolean> {
    const fileName = basename(targetPath);
    const relativePath = relative(process.cwd(), targetPath);
    const sourceFileName = basename(sourcePath);

    const message = `The file '${fileName}' already exists at '${relativePath}'. Do you want to overwrite it with '${sourceFileName}'?`;
    const overwriteOption = 'Overwrite';
    const skipOption = 'Skip';

    const choice = await window.showWarningMessage(
        message,
        { modal: true },
        overwriteOption,
        skipOption
    );

    switch (choice) {
        case overwriteOption:
            return true;
        case skipOption:
            return false;
        default:
            throw new DomainError({
                ...COPYING_DOMAIN_ERRORS.COPY_OVERWRITE,
                message: 'Copy operation cancelled by user'
            });
    }
}