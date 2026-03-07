/**
 * JSONL 文件存储工具
 *
 * 提供 JSONL 格式文件的读写操作
 */

import { promises as fs } from 'fs';

export class JsonlFileStore<T> {
  constructor(private readonly filePath: string) {}

  /**
   * 读取所有条目
   */
  async readAll(): Promise<T[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const lines = content.trim().split('\n');
      const items: T[] = [];

      for (const line of lines) {
        if (!line) continue;
        try {
          items.push(JSON.parse(line) as T);
        } catch {
          // 跳过无效行
        }
      }

      return items;
    } catch {
      // 文件不存在，返回空数组
      return [];
    }
  }

  /**
   * 追加单个条目
   */
  async append(item: T): Promise<void> {
    await fs.appendFile(this.filePath, JSON.stringify(item) + '\n', 'utf-8');
  }

  /**
   * 追加多个条目
   */
  async appendMany(items: T[]): Promise<void> {
    const lines = items.map((item) => JSON.stringify(item)).join('\n') + '\n';
    await fs.appendFile(this.filePath, lines, 'utf-8');
  }

  /**
   * 重写整个文件
   */
  async rewrite(items: T[]): Promise<void> {
    const lines = items.map((item) => JSON.stringify(item)).join('\n');
    if (lines) {
      await fs.writeFile(this.filePath, lines + '\n', 'utf-8');
    } else {
      await fs.writeFile(this.filePath, '', 'utf-8');
    }
  }

  /**
   * 确保文件存在
   */
  async ensureFile(): Promise<void> {
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, '', 'utf-8');
    }
  }
}
