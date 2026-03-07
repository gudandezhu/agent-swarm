/**
 * InMemoryMapStore - L1 内存缓存层
 *
 * 使用 Map 存储当前会话热数据，提供快速访问
 * 支持 TTL 自动清理和访问统计更新
 */

import type { Memory, MemoryQuery, MemoryStoreStats } from '../types.js';
import { IMemoryStore } from '../core/IMemoryStore.js';

/**
 * InMemoryMapStore 配置选项
 */
export interface InMemoryMapStoreOptions {
  /**
   * TTL（生存时间），单位毫秒
   * 默认 1 小时
   */
  ttl?: number;

  /**
   * 清理间隔，单位毫秒
   * 默认 5 分钟
   */
  cleanupInterval?: number;
}

/**
 * InMemoryMapStore - L1 内存缓存实现
 */
export class InMemoryMapStore implements IMemoryStore {
  private cache = new Map<string, Memory>();
  private sessionIndex = new Map<string, Set<string>>();
  private agentIndex = new Map<string, Set<string>>();
  private createdAt = new Map<string, number>();

  private readonly ttl: number;
  private readonly cleanupInterval: number;
  private lastCleanup = Date.now();

  constructor(options: InMemoryMapStoreOptions = {}) {
    this.ttl = options.ttl ?? 3600000; // 默认 1 小时
    this.cleanupInterval = options.cleanupInterval ?? 300000; // 默认 5 分钟
  }

  async add(memory: Memory): Promise<string> {
    // 添加到缓存
    this.cache.set(memory.id, { ...memory });
    this.createdAt.set(memory.id, Date.now());

    // 更新索引
    this.updateIndexes(memory);

    return memory.id;
  }

  async get(id: string): Promise<Memory | null> {
    // 触发清理（如果需要）
    this.scheduleCleanup();

    const memory = this.cache.get(id);
    if (!memory) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(id)) {
      this.delete(id);
      return null;
    }

    // 更新访问统计（不可变更新）
    const updatedMemory: Memory = {
      ...memory,
      lastAccessedAt: Date.now(),
      accessCount: memory.accessCount + 1,
    };

    this.cache.set(id, updatedMemory);

    return updatedMemory;
  }

  async update(id: string, updates: Partial<Memory>): Promise<void> {
    const memory = this.cache.get(id);
    if (!memory) {
      return;
    }

    // 不可变更新
    const updatedMemory: Memory = {
      ...memory,
      ...updates,
      id: memory.id, // 确保 ID 不被覆盖
    };

    this.cache.set(id, updatedMemory);
  }

  async delete(id: string): Promise<void> {
    const memory = this.cache.get(id);
    if (!memory) {
      return;
    }

    // 从缓存移除
    this.cache.delete(id);
    this.createdAt.delete(id);

    // 从索引移除
    if (memory.sessionId) {
      const sessionIds = this.sessionIndex.get(memory.sessionId);
      if (sessionIds) {
        sessionIds.delete(id);
        if (sessionIds.size === 0) {
          this.sessionIndex.delete(memory.sessionId);
        }
      }
    }

    if (memory.agentId) {
      const agentIds = this.agentIndex.get(memory.agentId);
      if (agentIds) {
        agentIds.delete(id);
        if (agentIds.size === 0) {
          this.agentIndex.delete(memory.agentId);
        }
      }
    }
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    this.scheduleCleanup();

    let results = Array.from(this.cache.values());

    // 按 sessionId 筛选
    if (query.sessionId) {
      const ids = this.sessionIndex.get(query.sessionId);
      results = ids ? Array.from(ids).map(id => this.cache.get(id)!).filter(Boolean) : [];
    }

    // 按 agentId 筛选
    if (query.agentId) {
      const ids = this.agentIndex.get(query.agentId);
      const agentMemories = ids ? new Set(Array.from(ids).map(id => this.cache.get(id)!).filter(Boolean)) : new Set();
      results = results.filter(m => agentMemories.has(m));
    }

    // 按 type 筛选
    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    // 按 importance 筛选
    if (query.minImportance !== undefined) {
      results = results.filter(m => m.importance >= query.minImportance!);
    }

    // 限制结果数量
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async getBySession(sessionId: string): Promise<Memory[]> {
    const ids = this.sessionIndex.get(sessionId);
    if (!ids) {
      return [];
    }

    return Array.from(ids)
      .map(id => this.cache.get(id))
      .filter((m): m is Memory => m !== undefined);
  }

  async getByAgent(agentId: string): Promise<Memory[]> {
    const ids = this.agentIndex.get(agentId);
    if (!ids) {
      return [];
    }

    return Array.from(ids)
      .map(id => this.cache.get(id))
      .filter((m): m is Memory => m !== undefined);
  }

  async stats(): Promise<MemoryStoreStats> {
    this.scheduleCleanup();

    const memories = Array.from(this.cache.values());

    const byType: Record<string, number> = {};
    const bySession: Record<string, number> = {};

    for (const memory of memories) {
      // 统计类型
      byType[memory.type] = (byType[memory.type] || 0) + 1;

      // 统计会话
      if (memory.sessionId) {
        bySession[memory.sessionId] = (bySession[memory.sessionId] || 0) + 1;
      }
    }

    return {
      totalMemories: memories.length,
      byType: byType as Record<'fact' | 'preference' | 'event' | 'skill', number>,
      bySession,
    };
  }

  /**
   * 更新索引
   */
  private updateIndexes(memory: Memory): void {
    // 更新会话索引
    if (memory.sessionId) {
      let sessionIds = this.sessionIndex.get(memory.sessionId);
      if (!sessionIds) {
        sessionIds = new Set();
        this.sessionIndex.set(memory.sessionId, sessionIds);
      }
      sessionIds.add(memory.id);
    }

    // 更新 Agent 索引
    if (memory.agentId) {
      let agentIds = this.agentIndex.get(memory.agentId);
      if (!agentIds) {
        agentIds = new Set();
        this.agentIndex.set(memory.agentId, agentIds);
      }
      agentIds.add(memory.id);
    }
  }

  /**
   * 检查记忆是否过期
   */
  private isExpired(id: string): boolean {
    const created = this.createdAt.get(id);
    if (!created) {
      return true;
    }
    return Date.now() - created > this.ttl;
  }

  /**
   * 调度清理任务
   */
  private scheduleCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup();
      this.lastCleanup = now;
    }
  }

  /**
   * 清理过期记忆
   */
  private cleanup(): void {
    const expiredIds: string[] = [];

    for (const id of this.cache.keys()) {
      if (this.isExpired(id)) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.delete(id);
    }
  }
}
