import { CopyDirectoryOperation } from "./copy-directory-operation.interface";
import { CopyFileOperation } from "./copy-file-operation.interface";
import { HardlinkFileOperation } from "./hardlink-file-operation.interface";
import { SymlinkDirectoryOperation } from "./symlink-directory-operation.interface";
import { SymlinkFileOperation } from "./symlink-file-operation.interface";

/**
 * Union type for all file-only operation variants.
 * 
 * This convenience type includes all operations that can be performed
 * on individual files, including hardlinks which are not supported
 * for directories.
 */
export type FileSystemOperationFileVariants =
    | HardlinkFileOperation
    | SymlinkFileOperation
    | CopyFileOperation;

/**
 * Union type for all directory-only operation variants.
 * 
 * This convenience type includes all operations that can be performed
 * on directories. Note that hardlink operations are not included
 * as they are not supported for directories.
 */
export type FileSystemOperationDirectoryVariants =
    | SymlinkDirectoryOperation
    | CopyDirectoryOperation;

/**
 * Main discriminated union type for all file system operations.
 * 
 * This is the primary type used throughout the codebase for representing
 * file system operations. It combines both file and directory variants
 * and enables type-safe discrimination based on action and itemType properties.
 */
export type FileSystemOperation =
    | FileSystemOperationFileVariants
    | FileSystemOperationDirectoryVariants;