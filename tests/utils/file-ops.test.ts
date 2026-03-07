/**
 * 文件操作工具类测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readFile,
  writeFile,
  readJSON,
  writeJSON,
  ensureDir,
  emptyDir,
  removeDir,
  exists,
  isFile,
  isDirectory,
} from '../../src/utils/file-ops.js';

describe('文件操作工具类', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `file-ops-test-${Date.now()}`);
    await ensureDir(testDir);
  });

  afterEach(async () => {
    await removeDir(testDir).catch(() => {});
  });

  describe('文件读写', () => {
    describe('readFile', () => {
      it('应读取文件内容', async () => {
        const filePath = join(testDir, 'test.txt');
        await fs.writeFile(filePath, 'Hello, World!');
        const content = await readFile(filePath);
        expect(content).toBe('Hello, World!');
      });

      it('应抛出文件不存在错误', async () => {
        const filePath = join(testDir, 'non-existent.txt');
        await expect(readFile(filePath)).rejects.toThrow();
      });
    });

    describe('writeFile', () => {
      it('应写入文件内容', async () => {
        const filePath = join(testDir, 'test.txt');
        await writeFile(filePath, 'Hello, World!');
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toBe('Hello, World!');
      });

      it('应覆盖已存在的文件', async () => {
        const filePath = join(testDir, 'test.txt');
        await writeFile(filePath, 'First');
        await writeFile(filePath, 'Second');
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toBe('Second');
      });
    });

    describe('readJSON', () => {
      it('应读取并解析 JSON 文件', async () => {
        const filePath = join(testDir, 'test.json');
        const data = { name: 'test', value: 123 };
        await fs.writeFile(filePath, JSON.stringify(data));
        const result = await readJSON<typeof data>(filePath);
        expect(result).toEqual(data);
      });

      it('应抛出无效 JSON 错误', async () => {
        const filePath = join(testDir, 'invalid.json');
        await fs.writeFile(filePath, '{ invalid json }');
        await expect(readJSON(filePath)).rejects.toThrow();
      });
    });

    describe('writeJSON', () => {
      it('应写入格式化的 JSON 文件', async () => {
        const filePath = join(testDir, 'test.json');
        const data = { name: 'test', value: 123 };
        await writeJSON(filePath, data);
        const content = await fs.readFile(filePath, 'utf-8');
        const result = JSON.parse(content);
        expect(result).toEqual(data);
      });

      it('应支持自定义缩进', async () => {
        const filePath = join(testDir, 'test.json');
        const data = { name: 'test' };
        await writeJSON(filePath, data, 2);
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toContain('  "name"');
      });
    });
  });

  describe('目录操作', () => {
    describe('ensureDir', () => {
      it('应创建不存在的目录', async () => {
        const dirPath = join(testDir, 'new-dir', 'nested');
        await ensureDir(dirPath);
        const stat = await fs.stat(dirPath);
        expect(stat.isDirectory()).toBe(true);
      });

      it('应对已存在的目录不报错', async () => {
        const dirPath = join(testDir, 'existing-dir');
        await fs.mkdir(dirPath, { recursive: true });
        await expect(ensureDir(dirPath)).resolves.not.toThrow();
      });
    });

    describe('emptyDir', () => {
      it('应清空目录内容', async () => {
        const dirPath = join(testDir, 'to-empty');
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(join(dirPath, 'file1.txt'), 'content1');
        await fs.writeFile(join(dirPath, 'file2.txt'), 'content2');
        await fs.mkdir(join(dirPath, 'subdir'));

        await emptyDir(dirPath);

        const files = await fs.readdir(dirPath);
        expect(files).toHaveLength(0);
      });

      it('应对不存在的目录不报错', async () => {
        const dirPath = join(testDir, 'non-existent');
        await expect(emptyDir(dirPath)).resolves.not.toThrow();
      });
    });

    describe('removeDir', () => {
      it('应删除目录及其内容', async () => {
        const dirPath = join(testDir, 'to-remove');
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(join(dirPath, 'file.txt'), 'content');
        await fs.mkdir(join(dirPath, 'subdir'));

        await removeDir(dirPath);

        const exists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      });

      it('应对不存在的目录不报错', async () => {
        const dirPath = join(testDir, 'non-existent');
        await expect(removeDir(dirPath)).resolves.not.toThrow();
      });
    });
  });

  describe('文件检查', () => {
    describe('exists', () => {
      it('应返回 true 当文件存在', async () => {
        const filePath = join(testDir, 'existing.txt');
        await fs.writeFile(filePath, 'content');
        expect(await exists(filePath)).toBe(true);
      });

      it('应返回 true 当目录存在', async () => {
        const dirPath = join(testDir, 'existing-dir');
        await fs.mkdir(dirPath);
        expect(await exists(dirPath)).toBe(true);
      });

      it('应返回 false 当路径不存在', async () => {
        expect(await exists(join(testDir, 'non-existent'))).toBe(false);
      });
    });

    describe('isFile', () => {
      it('应返回 true 当路径是文件', async () => {
        const filePath = join(testDir, 'file.txt');
        await fs.writeFile(filePath, 'content');
        expect(await isFile(filePath)).toBe(true);
      });

      it('应返回 false 当路径是目录', async () => {
        const dirPath = join(testDir, 'dir');
        await fs.mkdir(dirPath);
        expect(await isFile(dirPath)).toBe(false);
      });

      it('应返回 false 当路径不存在', async () => {
        expect(await isFile(join(testDir, 'non-existent'))).toBe(false);
      });
    });

    describe('isDirectory', () => {
      it('应返回 true 当路径是目录', async () => {
        const dirPath = join(testDir, 'dir');
        await fs.mkdir(dirPath);
        expect(await isDirectory(dirPath)).toBe(true);
      });

      it('应返回 false 当路径是文件', async () => {
        const filePath = join(testDir, 'file.txt');
        await fs.writeFile(filePath, 'content');
        expect(await isDirectory(filePath)).toBe(false);
      });

      it('应返回 false 当路径不存在', async () => {
        expect(await isDirectory(join(testDir, 'non-existent'))).toBe(false);
      });
    });
  });
});
