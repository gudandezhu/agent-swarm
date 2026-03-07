/**
 * IMemoryVectorStore - 向量存储接口
 *
 * 扩展 IMemoryStore，添加语义搜索和向量操作功能
 */

import type { MemorySearchResult } from '../types.js';
import { IMemoryStore } from './IMemoryStore.js';

/**
 * 向量存储接口
 * 支持语义搜索的存储实现
 */
export interface IMemoryVectorStore extends IMemoryStore {
  /**
   * 语义搜索
   * 根据查询文本的语义相似度搜索记忆
   * @param query 查询文本
   * @param topK 返回结果数量，默认 10
   * @returns 搜索结果，包含记忆和相似度分数
   */
  semanticSearch(query: string, topK?: number): Promise<MemorySearchResult[]>;

  /**
   * 添加向量
   * 为指定记忆添加向量
   * @param id 记忆 ID
   * @param embedding 向量数据
   */
  addEmbedding(id: string, embedding: number[]): Promise<void>;

  /**
   * 获取向量
   * 获取指定记忆的向量
   * @param id 记忆 ID
   * @returns 向量数据，不存在时返回 null
   */
  getEmbedding(id: string): Promise<number[] | null>;
}
