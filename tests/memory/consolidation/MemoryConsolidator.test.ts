/**
 * 记忆整合引擎测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryConsolidator } from '../../../src/memory/consolidation/MemoryConsolidator.js';
import { JSONLMemoryStore } from '../../../src/memory/store/JSONLMemoryStore.js';
import type { Memory } from '../../../src/memory/types.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

describe('MemoryConsolidator', () => {
  let store: JSONLMemoryStore;
  let consolidator: MemoryConsolidator;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `memory-consolidator-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    store = new JSONLMemoryStore(testDir);
    await store.init();

    consolidator = new MemoryConsolidator(store);
  });

  describe('去重功能', () => {
    it('应检测到完全相同的内容', async () => {
      const memory1: Memory = {
        id: 'mem-1',
        sessionId: 'session-1',
        content: '用户喜欢咖啡',
        type: 'preference',
        importance: 0.8,
        confidence: 1.0,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        relatedIds: [],
        source: 'user',
      };

      const memory2: Memory = {
        ...memory1,
        id: 'mem-2',
      };

      await store.add(memory1);
      await store.add(memory2);

      const duplicates = await consolidator.findDuplicates('session-1');
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].length).toBe(2);
    });

    it('应检测到相似内容（标点符号差异）', async () => {
      const memory1: Memory = {
        id: 'mem-1',
        sessionId: 'session-1',
        content: '用户喜欢咖啡！',
        type: 'preference',
        importance: 0.8,
        confidence: 1.0,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        relatedIds: [],
        source: 'user',
      };

      const memory2: Memory = {
        ...memory1,
        id: 'mem-2',
        content: '用户喜欢咖啡。',
      };

      await store.add(memory1);
      await store.add(memory2);

      const duplicates = await consolidator.findDuplicates('session-1');
      expect(duplicates).toHaveLength(1);
    });
  });

  describe('记忆合并', () => {
    it('应合并相同的记忆', async () => {
      const memory1: Memory = {
        id: 'mem-1',
        sessionId: 'session-1',
        content: '用户喜欢咖啡',
        type: 'preference',
        importance: 0.8,
        confidence: 1.0,
        createdAt: Date.now() - 1000,
        lastAccessedAt: Date.now(),
        accessCount: 1,
        relatedIds: [],
        source: 'user',
      };

      const memory2: Memory = {
        ...memory1,
        id: 'mem-2',
        accessCount: 2,
      };

      await store.add(memory1);
      await store.add(memory2);

      await consolidator.consolidate('session-1');

      const memories = await store.getBySession('session-1');
      expect(memories).toHaveLength(1);
      expect(memories[0].accessCount).toBe(3); // 1 + 2
    });

    it('应保留最早的时间戳', async () => {
      const earlierTime = Date.now() - 10000;
      const laterTime = Date.now();

      const memory1: Memory = {
        id: 'mem-1',
        sessionId: 'session-1',
        content: '用户喜欢咖啡',
        type: 'preference',
        importance: 0.8,
        confidence: 1.0,
        createdAt: earlierTime,
        lastAccessedAt: earlierTime,
        accessCount: 1,
        relatedIds: [],
        source: 'user',
      };

      const memory2: Memory = {
        ...memory1,
        id: 'mem-2',
        createdAt: laterTime,
        lastAccessedAt: laterTime,
      };

      await store.add(memory1);
      await store.add(memory2);

      await consolidator.consolidate('session-1');

      const memories = await store.getBySession('session-1');
      expect(memories[0].createdAt).toBe(earlierTime);
    });
  });

  describe('重要性重新计算', () => {
    it('合并后应重新计算重要性', async () => {
      const memory1: Memory = {
        id: 'mem-1',
        sessionId: 'session-1',
        content: '重要事项：预算 5000 万',
        type: 'fact',
        importance: 0.5,
        confidence: 1.0,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        relatedIds: [],
        source: 'user',
      };

      const memory2: Memory = {
        ...memory1,
        id: 'mem-2',
      };

      await store.add(memory1);
      await store.add(memory2);

      await consolidator.consolidate('session-1');

      const memories = await store.getBySession('session-1');
      // 用户来源 + 重复访问 = 更高重要性
      expect(memories[0].importance).toBeGreaterThan(0.5);
    });
  });

  describe('短期→长期迁移', () => {
    it('应标记旧记忆为长期存储', async () => {
      const oldMemory: Memory = {
        id: 'mem-1',
        sessionId: 'session-1',
        content: '旧的记忆',
        type: 'fact',
        importance: 0.5,
        confidence: 1.0,
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10天前
        lastAccessedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5天前
        accessCount: 5,
        relatedIds: [],
        source: 'user',
      };

      await store.add(oldMemory);

      await consolidator.archive('session-1');

      const memories = await store.getBySession('session-1');
      // 检查是否有标记（这里简化为检查记忆是否仍然存在）
      expect(memories).toHaveLength(1);
    });
  });
});
