import { FileSystemAction, FileSystemItemType } from '../../config';
import type { BaseLinkOptions } from './base-link-options.interface';

/**
 * Discriminated union interface for unified link creation operations.
 * Supports both file and directory link creation with type-safe options.
 * Uses discriminated union pattern with itemType as the discriminant property.
 */
export type LinkCreationOptions = 
    | FileLinkOptions 
    | DirectoryLinkOptions;

/**
 * Configuration options specific to file link creation operations.
 * Extends base options with file-specific action types (hardlink or symlink).
 */
export interface FileLinkOptions extends BaseLinkOptions {
    /** The type of link action to perform for files (hardlink or symlink). */
    action: Extract<FileSystemAction, 'hardlink' | 'symlink'>;
    /** Discriminant property indicating this is for file link operations. */
    itemType: Extract<FileSystemItemType, 'file'>;
}

/**
 * Configuration options specific to directory link creation operations.
 * Extends base options with directory-specific linking behavior (symlinks only).
 */
export interface DirectoryLinkOptions extends BaseLinkOptions {
    /** Discriminant property indicating this is for directory link operations. */
    itemType: Extract<FileSystemItemType, 'directory'>;
}