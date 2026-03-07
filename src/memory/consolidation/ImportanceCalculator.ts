/**
 * 重要性评分器
 *
 * 根据多个因素计算记忆的重要性分数（0-1）
 * 影响记忆的保留和检索优先级
 */

import type { Memory } from '../types.js';

/**
 * 重要性评分器
 */
export class ImportanceCalculator {
  /**
   * 计算记忆的重要性分数
   * @param memory 记忆对象（部分字段）
   * @returns 重要性分数（0-1）
   */
  static calculate(memory: Partial<Memory>): number {
    let score = 0.5; // 基础分

    // 用户明确陈述 +0.3
    if (memory.source === 'user') {
      score += 0.3;
    }

    // 重复提及 +0.2
    if (memory.accessCount && memory.accessCount > 1) {
      score += 0.2;
    }

    // 包含具体数据（数字或邮箱） +0.1
    if (memory.content && ImportanceCalculator.hasConcreteData(memory.content)) {
      score += 0.1;
    }

    // 情感关键词 +0.1
    if (memory.content && ImportanceCalculator.hasEmotionalKeywords(memory.content)) {
      score += 0.1;
    }

    // 时间衰减（30天未访问 -0.2）
    if (memory.lastAccessedAt) {
      const daysSinceAccess = (Date.now() - memory.lastAccessedAt) / (24 * 60 * 60 * 1000);
      if (daysSinceAccess > 30) {
        score -= 0.2;
      }
    }

    // 限制在 0-1 范围内
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 检测内容是否包含具体数据
   */
  private static hasConcreteData(content: string): boolean {
    // 检测数字
    if (/[0-9]+/.test(content)) {
      return true;
    }

    // 检测邮箱
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+/i.test(content)) {
      return true;
    }

    return false;
  }

  /**
   * 检测内容是否包含情感关键词
   */
  private static hasEmotionalKeywords(content: string): boolean {
    const keywords = ['喜欢', '讨厌', '重要', '必须', '务必', '爱', '恨'];
    return keywords.some((keyword) => content.includes(keyword));
  }
}
