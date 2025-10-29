import * as path from 'path';
import { buildAuditItems } from './build-audit-items.function';
import { LinkAuditItem } from '../types/link-audit-item.interface';

describe('build-audit-items.function', () => {
    describe('Construction', () => {
        test('should be a function', () => {
            // Arrange & Act & Assert
            expect(typeof buildAuditItems).toBe('function');
        });
    });

    describe('Audit item normalization', () => {
        test('should deduplicate items by path case-insensitively and preserve first occurrence', () => {
            // Arrange
            const workspaceRoot = path.join('C:', 'workspace');
            const originalItem: LinkAuditItem = {
                path: path.join(workspaceRoot, 'File.txt'),
                targetPath: path.join('C:', 'source', 'file.txt'),
                linkType: 'symlink',
            };
            const duplicateItem: LinkAuditItem = {
                path: path.join(workspaceRoot, 'file.txt'),
                targetPath: path.join('D:', 'mirror', 'file.txt'),
                linkType: 'hardlink',
            };
            const additionalItem: LinkAuditItem = {
                path: path.join(workspaceRoot, 'another.txt'),
                targetPath: path.join('C:', 'source', 'another.txt'),
                linkType: 'none',
            };

            // Act
            const result = buildAuditItems([originalItem, duplicateItem, additionalItem]);

            // Assert
            expect(result).toHaveLength(2);
            const [firstItem, secondItem] = result;
            expect(firstItem).toBeDefined();
            expect(secondItem).toBeDefined();

            if (firstItem === undefined || secondItem === undefined) {
                throw new Error('Expected audit items to be present after deduplication.');
            }

            const expectedAnotherPath = path.normalize(path.join(workspaceRoot, 'another.txt'));
            const expectedFilePath = path.normalize(path.join(workspaceRoot, 'File.txt'));
            const expectedTargetPath = path.normalize(path.join('C:', 'source', 'file.txt'));

            expect(firstItem.path).toBe(expectedAnotherPath);
            expect(secondItem.path).toBe(expectedFilePath);
            expect(secondItem.linkType).toBe('symlink');
            expect(secondItem.targetPath).toBe(expectedTargetPath);
        });

        test('should normalize extended-length and relative paths', () => {
            // Arrange
            const items: LinkAuditItem[] = [
                {
                    path: '\\\\?\\C:\\workspace\\..\\repo\\file.txt',
                    targetPath: 'C:/repo/../source/file.txt',
                    linkType: 'none',
                },
                {
                    path: 'C:/workspace/sub/../dir/entry.ts',
                    targetPath: '\\\\?\\C:\\workspace\\target\\dir\\entry.ts',
                    linkType: 'junction',
                },
            ];

            // Act
            const result = buildAuditItems(items);

            // Assert
            expect(result).toHaveLength(2);
            const [firstItem, secondItem] = result;
            expect(firstItem).toBeDefined();
            expect(secondItem).toBeDefined();

            if (firstItem === undefined || secondItem === undefined) {
                throw new Error('Expected normalized audit items to remain defined.');
            }

            const expectedFirstPath = path.normalize('C:/repo/file.txt');
            const expectedFirstTarget = path.normalize('C:/source/file.txt');
            const expectedSecondPath = path.normalize('C:/workspace/dir/entry.ts');
            const expectedSecondTarget = path.normalize('C:/workspace/target/dir/entry.ts');

            expect(firstItem.path).toBe(expectedFirstPath);
            expect(firstItem.targetPath).toBe(expectedFirstTarget);
            expect(secondItem.path).toBe(expectedSecondPath);
            expect(secondItem.targetPath).toBe(expectedSecondTarget);
        });
    });
});
