import { FileSystemOperationBase } from './file-system-operation-base.interface';
import { FileSystemAction } from './file-system-action.type';
import { FileSystemItemType } from './file-system-item.type';

/**
 * Interface for copying individual files from source to destination.
 * 
 * This operation creates physical copies of files, as opposed to links.
 * The copied files are independent of the original files and can be
 * modified without affecting the source.
 */
export interface CopyFileOperation extends FileSystemOperationBase {
    /** Action type discriminant - must be 'copy' for copy operations */
    action: Extract<FileSystemAction, 'copy'>;
    /** Item type discriminant - must be 'file' for file operations */
    itemType: Extract<FileSystemItemType, 'file'>;
}
