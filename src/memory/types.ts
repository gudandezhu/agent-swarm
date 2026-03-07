/**
 * Memory 系统类型定义
 */

/**
 * 记忆类型
 */
export type MemoryType = 'fact' | 'preference' | 'event' | 'skill';

/**
 * 记忆来源
 */
export type MemorySource = 'user' | 'agent' | 'system';

/**
 * 记忆数据结构
 */
export interface Memory {
  // 标识
  id: string;
  sessionId: string;
  agentId?: string;

  // 内容
  content: string;
  embedding?: number[];  // 768 维向量

  // 元数据
  type: MemoryType;
  importance: number;  // 0-1
  confidence: number;  // 0-1

  // 时间
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;

  // 关联
  relatedIds: string[];
  source: MemorySource;
}

/**
 * 记忆查询条件
 */
export interface MemoryQuery {
  sessionId?: string;
  agentId?: string;
  type?: MemoryType;
  minImportance?: number;
  limit?: number;
}

/**
 * 语义搜索结果
 */
export interface MemorySearchResult {
  memory: Memory;
  score: number;  // 相似度分数
}

/**
 * 存储统计信息
 */
export interface MemoryStoreStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  bySession: Record<string, number>;
}
