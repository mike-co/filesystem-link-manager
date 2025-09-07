import { FileSystemOperationBase } from './file-system-operation-base.interface';
import { FileSystemAction } from './file-system-action.type';
import { FileSystemItemType } from './file-system-item.type';

/**
 * Interface for copying directories and their contents.
 * 
 * This operation creates physical copies of entire directory structures,
 * including all files and subdirectories. The copied directories are
 * independent of the original directories.
 */
export interface CopyDirectoryOperation extends FileSystemOperationBase {
    /** Action type discriminant - must be 'copy' for copy operations */
    action: Extract<FileSystemAction, 'copy'>;
    /** Item type discriminant - must be 'directory' for directory operations */
    itemType: Extract<FileSystemItemType, 'directory'>;
}
