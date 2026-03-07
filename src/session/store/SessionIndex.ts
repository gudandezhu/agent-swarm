/**
 * SessionIndex - Session 索引管理
 *
 * 管理 Session 元数据索引
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Session } from '../types.js';

export interface SessionIndexEntry {
  type: 'session';
  id: string;
  channelId: string;
  channelUserId: string;
  conversationId?: string;
  threadId?: string;
  createdAt: number;
  lastActiveAt: number;
  agents: string[];
}

export class SessionIndex {
  private indexCache = new Map<string, SessionIndexEntry>();
  private readonly indexPath: string;

  constructor(basePath: string) {
    this.indexPath = join(basePath, 'index.jsonl');
  }

  /**
   * 初始化索引
   */
  async init(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line) continue;
        try {
          const entry: SessionIndexEntry = JSON.parse(line);
          this.indexCache.set(entry.id, entry);
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      await fs.writeFile(this.indexPath, '', 'utf-8');
    }
  }

  /**
   * 获取索引条目
   */
  get(sessionId: string): SessionIndexEntry | undefined {
    return this.indexCache.get(sessionId);
  }

  /**
   * 检查索引是否存在
   */
  has(sessionId: string): boolean {
    return this.indexCache.has(sessionId);
  }

  /**
   * 保存 Session 到索引
   */
  async save(session: Session): Promise<void> {
    const entry: SessionIndexEntry = {
      type: 'session',
      id: session.id,
      channelId: session.channelId,
      channelUserId: session.channelUserId,
      conversationId: session.conversationId,
      threadId: session.threadId,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      agents: session.agents ?? [],
    };

    this.indexCache.set(session.id, entry);
    await this.rewrite();
  }

  /**
   * 删除索引条目
   */
  delete(sessionId: string): void {
    this.indexCache.delete(sessionId);
  }

  /**
   * 获取所有索引条目
   */
  entries(): Iterable<SessionIndexEntry> {
    return this.indexCache.values();
  }

  /**
   * 获取索引大小
   */
  size(): number {
    return this.indexCache.size;
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.indexCache.clear();
  }

  /**
   * 重写索引文件
   */
  async rewrite(): Promise<void> {
    const lines = Array.from(this.indexCache.values()).map((e) => JSON.stringify(e));
    await fs.writeFile(this.indexPath, lines.join('\n') + '\n', 'utf-8');
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalSessions: number } {
    return {
      totalSessions: this.indexCache.size,
    };
  }
}
