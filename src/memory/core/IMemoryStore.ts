/**
 * IMemoryStore - 记忆存储核心接口
 *
 * 定义了记忆存储的基本 CRUD 操作和检索功能
 */

import type { Memory, MemoryQuery, MemoryStoreStats } from '../types.js';

/**
 * 记忆存储接口
 * 所有存储实现必须实现此接口
 */
export interface IMemoryStore {
  /**
   * 添加记忆
   * @param memory 要添加的记忆
   * @returns 记忆 ID
   */
  add(memory: Memory): Promise<string>;

  /**
   * 获取记忆
   * @param id 记忆 ID
   * @returns 记忆对象，不存在时返回 null
   */
  get(id: string): Promise<Memory | null>;

  /**
   * 更新记忆
   * @param id 记忆 ID
   * @param updates 要更新的字段
   */
  update(id: string, updates: Partial<Memory>): Promise<void>;

  /**
   * 删除记忆
   * @param id 记忆 ID
   */
  delete(id: string): Promise<void>;

  /**
   * 搜索记忆
   * @param query 查询条件
   * @returns 匹配的记忆列表
   */
  search(query: MemoryQuery): Promise<Memory[]>;

  /**
   * 获取会话的所有记忆
   * @param sessionId 会话 ID
   * @returns 记忆列表
   */
  getBySession(sessionId: string): Promise<Memory[]>;

  /**
   * 获取 Agent 的所有记忆
   * @param agentId Agent ID
   * @returns 记忆列表
   */
  getByAgent(agentId: string): Promise<Memory[]>;

  /**
   * 获取存储统计信息
   * @returns 统计信息
   */
  stats(): Promise<MemoryStoreStats>;
}
