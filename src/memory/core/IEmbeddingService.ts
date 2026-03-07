/**
 * IEmbeddingService - 嵌入服务接口
 *
 * 定义文本向量嵌入的生成和缓存功能
 */

/**
 * 嵌入服务接口
 * 负责将文本转换为向量表示
 */
export interface IEmbeddingService {
  /**
   * 生成单个文本的向量嵌入
   * @param text 输入文本
   * @returns 向量数组（768 维）
   */
  embed(text: string): Promise<number[]>;

  /**
   * 批量生成向量嵌入
   * 优化成本，一次性处理多个文本
   * @param texts 输入文本数组
   * @returns 向量数组
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * 生成带缓存的向量嵌入
   * 自动缓存结果，避免重复计算
   * @param text 输入文本
   * @returns 向量数组
   */
  embedWithCache(text: string): Promise<number[]>;

  /**
   * 获取向量维度
   * @returns 维度数（例如 768）
   */
  getDimensions(): number;
}

/**
 * 嵌入缓存接口
 * 用于缓存已生成的向量，减少 API 调用
 */
export interface IEmbeddingCache {
  /**
   * 从缓存获取向量
   * @param text 输入文本
   * @returns 向量数组，不存在时返回 null
   */
  get(text: string): number[] | null;

  /**
   * 设置缓存
   * @param text 输入文本
   * @param embedding 向量数组
   */
  set(text: string, embedding: number[]): void;

  /**
   * 清空缓存
   */
  clear(): void;

  /**
   * 获取缓存大小
   * @returns 缓存条目数
   */
  size(): number;
}
