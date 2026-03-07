/**
 * 重要性评分器测试
 */

import { describe, it, expect } from 'vitest';
import { ImportanceCalculator } from '../../../src/memory/consolidation/ImportanceCalculator.js';
import type { Memory } from '../../../src/memory/types.js';

describe('ImportanceCalculator', () => {
  describe('calculate', () => {
    it('应返回基础分 0.5', () => {
      const memory: Partial<Memory> = {
        content: '普通内容',
        source: 'agent',
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.5);
    });

    it('用户陈述应 +0.3', () => {
      const memory: Partial<Memory> = {
        content: '普通内容',
        source: 'user',
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.8);
    });

    it('重复提及应 +0.2', () => {
      const memory: Partial<Memory> = {
        content: '普通内容',
        source: 'agent',
        accessCount: 5,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.7);
    });

    it('包含数字应 +0.1', () => {
      const memory: Partial<Memory> = {
        content: '我的电话号码是 12345',
        source: 'agent',
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.6);
    });

    it('包含邮箱应 +0.1', () => {
      const memory: Partial<Memory> = {
        content: '联系邮箱 test@example.com',
        source: 'agent',
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.6);
    });

    it('包含重要关键词应 +0.1', () => {
      const memory: Partial<Memory> = {
        content: '这是非常重要的事情',
        source: 'agent',
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.6);
    });

    it('30天未访问应 -0.2', () => {
      const memory: Partial<Memory> = {
        content: '普通内容',
        source: 'agent',
        accessCount: 0,
        lastAccessedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      };
      expect(ImportanceCalculator.calculate(memory)).toBe(0.3);
    });

    it('应限制在 0-1 范围内', () => {
      const highMemory: Partial<Memory> = {
        content: '重要邮件 test@example.com 必须完成',
        source: 'user',
        accessCount: 100,
        lastAccessedAt: Date.now(),
      };
      expect(ImportanceCalculator.calculate(highMemory)).toBe(1.0);

      const lowMemory: Partial<Memory> = {
        content: '普通内容',
        source: 'agent',
        accessCount: 0,
        lastAccessedAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
      };
      // 基础 0.5 - 0.2 = 0.3
      expect(ImportanceCalculator.calculate(lowMemory)).toBe(0.3);
    });

    it('综合计算应正确', () => {
      const memory: Partial<Memory> = {
        content: '我喜欢这个项目，预算 5000 万',
        source: 'user',
        accessCount: 3,
        lastAccessedAt: Date.now(),
      };
      // 基础 0.5 + 用户 0.3 + 重复 0.2 + 数字 0.1 + 关键词 0.1 = 1.0
      expect(ImportanceCalculator.calculate(memory)).toBe(1.0);
    });
  });
});
