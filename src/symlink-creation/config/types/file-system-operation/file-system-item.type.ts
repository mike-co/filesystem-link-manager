/**
 * Represents the type of file system item that can be processed.
 * 
 * This type specifies whether the target of a file system operation is a file or directory.
 * Different operations may have different support for these types:
 * 
 * - 'file': Individual files that can be symlinked, hardlinked, or copied
 * - 'directory': Directories that can be symlinked or copied (hardlinks not supported)
 */
export type FileSystemItemType = 'file' | 'directory';