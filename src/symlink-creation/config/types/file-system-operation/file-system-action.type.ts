/**
 * Represents the type of file system action to perform on discovered items.
 * 
 * This type defines the available operations that can be executed on files and directories
 * found through pattern matching. Each action has specific behaviors and requirements:
 * 
 * - 'symlink': Creates symbolic links to the original files/directories
 * - 'hardlink': Creates hard links to files (directories not supported)
 * - 'copy': Creates copies of files or directories
 */
export type FileSystemAction = 'symlink' | 'hardlink' | 'copy';