/**
 * JSONLMessageStore - 消息持久化存储
 *
 * 存储路径：sessions/<sessionId>/messages_persistent.jsonl
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { IMessageStore, MessageStatus, PersistentMessage } from '../core/IMessageStore.js';
import type { Message } from './types.js';

interface MessageIndexEntry {
  messageId: string;
  sessionId: string;
  status: MessageStatus;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

export class JSONLMessageStore implements IMessageStore {
  private basePath: string;
  private indexPath: string;
  private indexCache = new Map<string, MessageIndexEntry>();

  constructor(basePath = './sessions') {
    this.basePath = basePath;
    this.indexPath = join(basePath, 'messages_index.jsonl');
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await this.loadIndex();
    } catch (error) {
      throw new Error(`Failed to initialize message store: ${error}`);
    }
  }

  /**
   * 获取消息文件路径
   */
  private getMessagePath(sessionId: string): string {
    return join(this.basePath, sessionId, 'messages_persistent.jsonl');
  }

  /**
   * 保存消息
   */
  async save(message: PersistentMessage): Promise<void> {
    const entry: MessageIndexEntry = {
      messageId: message.id,
      sessionId: message.sessionId,
      status: message.status,
      retryCount: message.retryCount,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };

    this.indexCache.set(message.id, entry);
    await this.appendToFile(message);

    // 更新索引文件
    await this.appendIndex(entry);
  }

  /**
   * 获取消息
   */
  async get(messageId: string): Promise<PersistentMessage | null> {
    const entry = this.indexCache.get(messageId);
    if (!entry) return null;

    const messagePath = this.getMessagePath(entry.sessionId);
    try {
      const content = await fs.readFile(messagePath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as PersistentMessage;
          if (msg.id === messageId) {
            return msg;
          }
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 文件不存在
    }

    return null;
  }

  /**
   * 更新消息状态
   */
  async updateStatus(messageId: string, status: MessageStatus, error?: string): Promise<void> {
    const entry = this.indexCache.get(messageId);
    if (!entry) return;

    // 更新缓存
    entry.status = status;
    entry.updatedAt = Date.now();

    // 重新写入消息文件
    await this.rewriteMessage(entry.sessionId, messageId, {
      status,
      error,
      updatedAt: entry.updatedAt,
    });
  }

  /**
   * 增加重试次数
   */
  async incrementRetry(messageId: string): Promise<void> {
    const entry = this.indexCache.get(messageId);
    if (!entry) return;

    entry.retryCount++;
    entry.updatedAt = Date.now();

    // 重新写入消息文件
    await this.rewriteMessage(entry.sessionId, messageId, {
      retryCount: entry.retryCount,
      updatedAt: entry.updatedAt,
    });
  }

  /**
   * 获取超时消息
   */
  async getTimeoutMessages(before: Date): Promise<PersistentMessage[]> {
    const results: PersistentMessage[] = [];
    const beforeTime = before.getTime();

    for (const entry of this.indexCache.values()) {
      if (
        (entry.status === 'pending' || entry.status === 'processing') &&
        entry.updatedAt < beforeTime
      ) {
        const msg = await this.get(entry.messageId);
        if (msg) {
          results.push(msg);
        }
      }
    }

    return results;
  }

  /**
   * 获取可重试的消息
   */
  async getRetryableMessages(maxRetries: number): Promise<PersistentMessage[]> {
    const results: PersistentMessage[] = [];

    for (const entry of this.indexCache.values()) {
      if (entry.status === 'failed' && entry.retryCount < maxRetries) {
        const msg = await this.get(entry.messageId);
        if (msg) {
          results.push(msg);
        }
      }
    }

    return results;
  }

  /**
   * 删除已完成的消息
   */
  async deleteCompleted(before: Date): Promise<number> {
    const beforeTime = before.getTime();
    const toDelete: string[] = [];

    for (const [id, entry] of this.indexCache) {
      if (entry.status === 'completed' && entry.updatedAt < beforeTime) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.delete(id);
    }

    return toDelete.length;
  }

  /**
   * 删除消息
   */
  private async delete(messageId: string): Promise<void> {
    const entry = this.indexCache.get(messageId);
    if (!entry) return;

    this.indexCache.delete(messageId);

    // 从文件中删除该消息
    await this.removeMessageFromFile(entry.sessionId, messageId);

    // 重写索引
    await this.rewriteIndex();
  }

  /**
   * 加载索引
   */
  private async loadIndex(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const entry: MessageIndexEntry = JSON.parse(line);
          this.indexCache.set(entry.messageId, entry);
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      await fs.writeFile(this.indexPath, '', 'utf-8');
    }
  }

  /**
   * 追加索引
   */
  private async appendIndex(entry: MessageIndexEntry): Promise<void> {
    await fs.appendFile(this.indexPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  /**
   * 重写索引
   */
  private async rewriteIndex(): Promise<void> {
    const lines = Array.from(this.indexCache.values()).map((e) => JSON.stringify(e));
    await fs.writeFile(this.indexPath, lines.join('\n') + '\n', 'utf-8');
  }

  /**
   * 追加消息到文件
   */
  private async appendToFile(message: PersistentMessage): Promise<void> {
    const messagePath = this.getMessagePath(message.sessionId);
    await fs.mkdir(join(this.basePath, message.sessionId), { recursive: true });
    await fs.appendFile(messagePath, JSON.stringify(message) + '\n', 'utf-8');
  }

  /**
   * 重写消息（更新部分字段）
   */
  private async rewriteMessage(
    sessionId: string,
    messageId: string,
    updates: Partial<PersistentMessage>
  ): Promise<void> {
    const messagePath = this.getMessagePath(sessionId);

    try {
      const content = await fs.readFile(messagePath, 'utf-8');
      const lines = content.trim().split('\n');
      const newLines: string[] = [];

      for (const line of lines) {
        if (!line) {
          newLines.push('');
          continue;
        }
        try {
          const msg = JSON.parse(line) as PersistentMessage;
          if (msg.id === messageId) {
            // 更新字段
            const updated = { ...msg, ...updates };
            newLines.push(JSON.stringify(updated));
          } else {
            newLines.push(line);
          }
        } catch {
          newLines.push(line);
        }
      }

      await fs.writeFile(messagePath, newLines.join('\n') + '\n', 'utf-8');
    } catch {
      // 文件不存在，创建新文件
      await this.appendToFile({
        id: messageId,
        sessionId,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timestamp: Date.now(),
        version: '1.0',
        from: '',
        to: '',
        type: 'request',
        payload: {},
        ack: { required: false, timeout: 0, retry: 0 },
        ...updates,
      } as PersistentMessage);
    }
  }

  /**
   * 从文件中删除消息
   */
  private async removeMessageFromFile(sessionId: string, messageId: string): Promise<void> {
    const messagePath = this.getMessagePath(sessionId);

    try {
      const content = await fs.readFile(messagePath, 'utf-8');
      const lines = content.trim().split('\n');
      const newLines: string[] = [];

      for (const line of lines) {
        if (!line) {
          newLines.push('');
          continue;
        }
        try {
          const msg = JSON.parse(line) as PersistentMessage;
          if (msg.id !== messageId) {
            newLines.push(line);
          }
        } catch {
          newLines.push(line);
        }
      }

      await fs.writeFile(messagePath, newLines.join('\n') + '\n', 'utf-8');
    } catch {
      // 文件不存在，忽略
    }
  }

  /**
   * 将 Message 转换为 PersistentMessage
   */
  static toPersistent(message: Message): PersistentMessage {
    return {
      ...message,
      status: 'pending' as MessageStatus,
      retryCount: 0,
      createdAt: message.timestamp,
      updatedAt: Date.now(),
    };
  }

  /**
   * 清理
   */
  async destroy(): Promise<void> {
    this.indexCache.clear();
  }
}
