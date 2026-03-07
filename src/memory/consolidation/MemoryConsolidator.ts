/**
 * 记忆整合引擎
 *
 * 负责去重、合并、重要性重新计算和短期→长期迁移
 */

import type { Memory } from '../types.js';
import type { IMemoryStore } from '../core/IMemoryStore.js';
import { ImportanceCalculator } from './ImportanceCalculator.js';

/**
 * 记忆整合引擎
 */
export class MemoryConsolidator {
  constructor(private readonly store: IMemoryStore) {}

  /**
   * 查找重复的记忆
   * @param sessionId 会话 ID
   * @param threshold 相似度阈值（0-1）
   * @returns 重复的记忆组
   */
  async findDuplicates(_sessionId: string): Promise<Memory[][]> {
    const memories = await this.store.getBySession(_sessionId);

    // 按内容分组
    const groups = new Map<string, Memory[]>();

    for (const memory of memories) {
      const key = this.normalizeContent(memory.content);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(memory);
    }

    // 返回有重复的组
    return Array.from(groups.values()).filter((group) => group.length > 1);
  }

  /**
   * 整合会话记忆
   * @param sessionId 会话 ID
   */
  async consolidate(sessionId: string): Promise<void> {
    const duplicates = await this.findDuplicates(sessionId);

    for (const group of duplicates) {
      // 合并重复的记忆
      const merged = this.mergeMemories(group);

      // 删除原始记忆
      for (const memory of group) {
        await this.store.delete(memory.id);
      }

      // 添加合并后的记忆
      await this.store.add(merged);
    }
  }

  /**
   * 归档旧记忆到长期存储
   * @param sessionId 会话 ID
   * @param days 多少天前的记忆需要归档
   */
  async archive(sessionId: string, days = 7): Promise<void> {
    const memories = await this.store.getBySession(sessionId);
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    for (const memory of memories) {
      if (memory.createdAt < cutoffTime) {
        // 重新计算重要性（包含时间衰减）
        const newImportance = ImportanceCalculator.calculate(memory);

        if (newImportance < 0.3) {
          // 低重要性记忆，可以考虑删除
          await this.store.delete(memory.id);
        } else {
          // 更新重要性
          await this.store.update(memory.id, {
            importance: newImportance,
            lastAccessedAt: Date.now(),
          });
        }
      }
    }
  }

  /**
   * 合并多个记忆
   */
  private mergeMemories(memories: Memory[]): Memory {
    // 按创建时间排序，取最早的
    const sorted = [...memories].sort((a, b) => a.createdAt - b.createdAt);
    const first = sorted[0];

    // 累加访问次数
    const totalAccessCount = memories.reduce((sum, m) => sum + m.accessCount, 0);

    // 合并相关记忆 ID
    const allRelatedIds = new Set<string>();
    for (const memory of memories) {
      for (const relatedId of memory.relatedIds) {
        if (relatedId !== memory.id) {
          allRelatedIds.add(relatedId);
        }
      }
    }

    // 重新计算重要性
    const merged: Memory = {
      ...first,
      accessCount: totalAccessCount,
      relatedIds: Array.from(allRelatedIds),
      lastAccessedAt: Date.now(),
    };

    merged.importance = ImportanceCalculator.calculate(merged);

    return merged;
  }

  /**
   * 规范化内容用于去重比较
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/gi, ''); // 只保留中英文、数字、空格
  }
}
