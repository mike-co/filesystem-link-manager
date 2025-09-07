import { FileSystemOperationBase } from './file-system-operation-base.interface';
import { FileSystemAction } from './file-system-action.type';
import { FileSystemItemType } from './file-system-item.type';

/**
 * Interface for creating hard links to individual files.
 * 
 * Hard links create additional directory entries that point to the same
 * file data on disk. Unlike symbolic links, hard links cannot be broken
 * by moving or deleting the original file, as long as at least one hard
 * link remains. Hard links are only supported for files, not directories.
 */
export interface HardlinkFileOperation extends FileSystemOperationBase {
    /** Action type discriminant - must be 'hardlink' for hardlink operations */
    action: Extract<FileSystemAction, 'hardlink'>;
    /** Item type discriminant - must be 'file' for file operations (hardlinks only support files) */
    itemType: Extract<FileSystemItemType, 'file'>;
}
