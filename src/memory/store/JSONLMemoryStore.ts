/**
 * JSONLMemoryStore - L2 持久化存储层
 *
 * 使用 JSONL 格式持久化存储记忆数据
 * 支持按会话分组存储和全局索引
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { Memory, MemoryQuery, MemoryStoreStats } from '../types.js';
import { IMemoryStore } from '../core/IMemoryStore.js';

/**
 * 索引条目
 */
interface IndexEntry {
  id: string;
  sessionId: string;
  agentId?: string;
  type: string;
  importance: number;
  createdAt: number;
}

/**
 * JSONLMemoryStore 配置选项
 */
export interface JSONLMemoryStoreOptions {
  /**
   * 是否启用原子写入（使用临时文件）
   */
  atomicWrite?: boolean;
}

/**
 * JSONLMemoryStore - JSONL 持久化存储实现
 */
export class JSONLMemoryStore implements IMemoryStore {
  private readonly memoryPath: string;
  private readonly indexPath: string;
  private readonly sessionsPath: string;
  private readonly atomicWrite: boolean;
  private indexCache = new Map<string, IndexEntry>();

  constructor(memoryPath: string, options: JSONLMemoryStoreOptions = {}) {
    this.memoryPath = memoryPath;
    this.indexPath = join(memoryPath, 'index.jsonl');
    this.sessionsPath = join(memoryPath, 'sessions');
    this.atomicWrite = options.atomicWrite ?? true;
  }

  /**
   * 初始化存储
   */
  async init(): Promise<void> {
    // 创建目录
    await fs.mkdir(this.memoryPath, { recursive: true });
    await fs.mkdir(this.sessionsPath, { recursive: true });

    // 加载索引
    await this.loadIndex();
  }

  async add(memory: Memory): Promise<string> {
    // 追加到会话文件
    const sessionPath = join(this.sessionsPath, `${memory.sessionId}.jsonl`);
    const line = JSON.stringify(memory) + '\n';

    if (this.atomicWrite) {
      await this.atomicWriteFile(sessionPath, line);
    } else {
      await fs.appendFile(sessionPath, line, 'utf-8');
    }

    // 更新索引
    await this.updateIndex(memory);

    return memory.id;
  }

  async get(id: string): Promise<Memory | null> {
    // 从索引查找 sessionId
    const indexEntry = this.indexCache.get(id);
    if (!indexEntry) {
      return null;
    }

    // 从会话文件读取
    const sessionPath = join(this.sessionsPath, `${indexEntry.sessionId}.jsonl`);
    const memories = await this.loadSessionFile(sessionPath);

    return memories.find((m) => m.id === id) || null;
  }

  async update(id: string, updates: Partial<Memory>): Promise<void> {
    // 获取原始记忆
    const memory = await this.get(id);
    if (!memory) {
      return;
    }

    // 不可变更新
    const updatedMemory: Memory = {
      ...memory,
      ...updates,
      id: memory.id, // 确保 ID 不被覆盖
    };

    // 重写整个会话文件
    const sessionPath = join(this.sessionsPath, `${memory.sessionId}.jsonl`);
    const memories = await this.loadSessionFile(sessionPath);

    const updatedMemories = memories.map((m) => (m.id === id ? updatedMemory : m));

    await this.writeSessionFile(sessionPath, updatedMemories);

    // 更新索引
    await this.updateIndex(updatedMemory);
  }

  async delete(id: string): Promise<void> {
    // 获取原始记忆
    const memory = await this.get(id);
    if (!memory) {
      return;
    }

    // 重写会话文件（排除删除的记忆）
    const sessionPath = join(this.sessionsPath, `${memory.sessionId}.jsonl`);
    const memories = await this.loadSessionFile(sessionPath);

    const filteredMemories = memories.filter((m) => m.id !== id);

    await this.writeSessionFile(sessionPath, filteredMemories);

    // 从索引删除
    this.indexCache.delete(id);
    await this.writeIndex();
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    let results: Memory[] = [];

    // 如果指定了 sessionId，只加载该会话
    if (query.sessionId) {
      results = await this.getBySession(query.sessionId);
    } else {
      // 加载所有记忆
      results = await this.loadAllMemories();
    }

    // 按 agentId 筛选
    if (query.agentId) {
      results = results.filter((m) => m.agentId === query.agentId);
    }

    // 按 type 筛选
    if (query.type) {
      results = results.filter((m) => m.type === query.type);
    }

    // 按 importance 筛选
    if (query.minImportance !== undefined) {
      results = results.filter((m) => m.importance >= query.minImportance!);
    }

    // 限制结果数量
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async getBySession(sessionId: string): Promise<Memory[]> {
    const sessionPath = join(this.sessionsPath, `${sessionId}.jsonl`);

    try {
      return await this.loadSessionFile(sessionPath);
    } catch {
      return [];
    }
  }

  async getByAgent(agentId: string): Promise<Memory[]> {
    // 从索引查找该 agent 的所有记忆 ID
    const memoryIds = Array.from(this.indexCache.values())
      .filter((entry) => entry.agentId === agentId)
      .map((entry) => entry.id);

    // 批量获取记忆
    const memories: Memory[] = [];
    for (const id of memoryIds) {
      const memory = await this.get(id);
      if (memory) {
        memories.push(memory);
      }
    }

    return memories;
  }

  async stats(): Promise<MemoryStoreStats> {
    const memories = await this.loadAllMemories();

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
   * 加载索引
   */
  private async loadIndex(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      this.indexCache.clear();
      for (const line of lines) {
        try {
          const entry: IndexEntry = JSON.parse(line);
          this.indexCache.set(entry.id, entry);
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 文件不存在，空索引
      this.indexCache.clear();
    }
  }

  /**
   * 更新索引
   */
  private async updateIndex(memory: Memory): Promise<void> {
    const entry: IndexEntry = {
      id: memory.id,
      sessionId: memory.sessionId,
      agentId: memory.agentId,
      type: memory.type,
      importance: memory.importance,
      createdAt: memory.createdAt,
    };

    this.indexCache.set(memory.id, entry);
    await this.writeIndex();
  }

  /**
   * 写入索引
   */
  private async writeIndex(): Promise<void> {
    const lines =
      Array.from(this.indexCache.values())
        .map((entry) => JSON.stringify(entry))
        .join('\n') + '\n';

    if (this.atomicWrite) {
      await this.atomicWriteFile(this.indexPath, lines, true);
    } else {
      await fs.writeFile(this.indexPath, lines, 'utf-8');
    }
  }

  /**
   * 加载会话文件
   */
  private async loadSessionFile(sessionPath: string): Promise<Memory[]> {
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const memories: Memory[] = [];
      for (const line of lines) {
        try {
          const memory: Memory = JSON.parse(line);
          memories.push(memory);
        } catch {
          // 跳过无效行
        }
      }

      return memories;
    } catch {
      return [];
    }
  }

  /**
   * 写入会话文件
   */
  private async writeSessionFile(sessionPath: string, memories: Memory[]): Promise<void> {
    const lines = memories.map((m) => JSON.stringify(m)).join('\n');

    if (lines) {
      if (this.atomicWrite) {
        await this.atomicWriteFile(sessionPath, lines + '\n', true);
      } else {
        await fs.writeFile(sessionPath, lines + '\n', 'utf-8');
      }
    } else {
      // 空会话，删除文件
      try {
        await fs.unlink(sessionPath);
      } catch {
        // 忽略
      }
    }
  }

  /**
   * 加载所有记忆
   */
  private async loadAllMemories(): Promise<Memory[]> {
    try {
      const files = await fs.readdir(this.sessionsPath);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      const allMemories: Memory[] = [];
      for (const file of jsonlFiles) {
        const sessionPath = join(this.sessionsPath, file);
        const memories = await this.loadSessionFile(sessionPath);
        allMemories.push(...memories);
      }

      return allMemories;
    } catch {
      return [];
    }
  }

  /**
   * 原子写入文件
   */
  private async atomicWriteFile(
    filePath: string,
    content: string,
    overwrite = false
  ): Promise<void> {
    const tempPath = filePath + '.tmp';

    if (overwrite) {
      // 覆盖模式：写入临时文件，然后重命名
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } else {
      // 追加模式：直接追加到原文件（不需要临时文件）
      await fs.appendFile(filePath, content, 'utf-8');
    }
  }
}
