import { FileSystemOperationBase } from './file-system-operation-base.interface';
import { FileSystemAction } from './file-system-action.type';
import { FileSystemItemType } from './file-system-item.type';

/**
 * Interface for creating symbolic links to individual files.
 * 
 * Symbolic links create file system entries that reference other files.
 * Unlike hard links, symbolic links can point to files on different
 * file systems and can become broken if the target file is moved or deleted.
 */
export interface SymlinkFileOperation extends FileSystemOperationBase {
    /** Action type discriminant - must be 'symlink' for symbolic link operations */
    action: Extract<FileSystemAction, 'symlink'>;
    /** Item type discriminant - must be 'file' for file operations */
    itemType: Extract<FileSystemItemType, 'file'>;
}
