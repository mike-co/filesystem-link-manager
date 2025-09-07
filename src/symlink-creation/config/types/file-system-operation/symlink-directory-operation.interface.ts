import { FileSystemOperationBase } from './file-system-operation-base.interface';
import { FileSystemAction } from './file-system-action.type';
import { FileSystemItemType } from './file-system-item.type';

/**
 * Interface for creating symbolic links to directories.
 * 
 * Directory symbolic links create references to entire directory structures.
 * This operation supports selective linking where only specific subdirectories
 * are linked instead of the entire directory tree.
 */
export interface SymlinkDirectoryOperation extends FileSystemOperationBase {
    /** Action type discriminant - must be 'symlink' for symbolic link operations */
    action: Extract<FileSystemAction, 'symlink'>;
    /** Item type discriminant - must be 'directory' for directory operations */
    itemType: Extract<FileSystemItemType, 'directory'>;
}
