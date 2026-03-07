/**
 * MessageHistory - 消息历史管理
 *
 * 管理 Session 的消息历史记录
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Message } from '../../message/types.js';

export class MessageHistory {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * 获取消息文件路径
   */
  private getMessagesPath(sessionId: string): string {
    return join(this.basePath, sessionId, 'messages.jsonl');
  }

  /**
   * 加载消息历史
   */
  async load(sessionId: string, limit?: number): Promise<Message[]> {
    const messageFilePath = this.getMessagesPath(sessionId);

    try {
      const content = await fs.readFile(messageFilePath, 'utf-8');
      const lines = content.trim().split('\n');

      const messages: Message[] = [];
      for (const line of lines) {
        if (!line) continue;
        try {
          messages.push(JSON.parse(line) as Message);
        } catch {
          // 跳过无效行
        }
      }

      // 应用 limit
      if (limit && limit > 0) {
        return messages.slice(-limit);
      }

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * 保存消息
   */
  async save(sessionId: string, message: Message): Promise<void> {
    const messageFilePath = this.getMessagesPath(sessionId);
    const sessionPath = join(this.basePath, sessionId);

    await fs.mkdir(sessionPath, { recursive: true });
    await fs.appendFile(messageFilePath, JSON.stringify(message) + '\n', 'utf-8');
  }

  /**
   * 删除消息历史
   */
  async delete(sessionId: string): Promise<void> {
    const messageFilePath = this.getMessagesPath(sessionId);
    try {
      await fs.rm(messageFilePath, { force: true });
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 获取消息数量
   */
  async count(sessionId: string): Promise<number> {
    const messages = await this.load(sessionId);
    return messages.length;
  }
}
