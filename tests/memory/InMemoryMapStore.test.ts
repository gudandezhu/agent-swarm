/**
 * InMemoryMapStore 单元测试
 * 测试 L1 缓存层的功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryMapStore } from '../../src/memory/store/InMemoryMapStore.js';
import type { Memory } from '../../src/memory/types.js';

describe('InMemoryMapStore', () => {
  let store: InMemoryMapStore;

  beforeEach(() => {
    store = new InMemoryMapStore();
  });

  const createTestMemory = (overrides: Partial<Memory> = {}): Memory => ({
    id: 'test-id',
    sessionId: 'session-1',
    content: 'Test content',
    type: 'fact',
    importance: 0.5,
    confidence: 0.8,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    accessCount: 0,
    relatedIds: [],
    source: 'user',
    ...overrides,
  });

  describe('add', () => {
    it('应该添加记忆并返回 ID', async () => {
      const memory = createTestMemory();
      const id = await store.add(memory);

      expect(id).toBe('test-id');
    });

    it('应该更新 sessionId 索引', async () => {
      const memory = createTestMemory({ id: 'mem-1', sessionId: 'session-1' });
      await store.add(memory);

      const memories = await store.getBySession('session-1');
      expect(memories).toHaveLength(1);
      expect(memories[0].id).toBe('mem-1');
    });

    it('应该更新 agentId 索引', async () => {
      const memory = createTestMemory({ id: 'mem-1', agentId: 'agent-1' });
      await store.add(memory);

      const memories = await store.getByAgent('agent-1');
      expect(memories).toHaveLength(1);
      expect(memories[0].id).toBe('mem-1');
    });
  });

  describe('get', () => {
    it('应该获取已添加的记忆', async () => {
      const memory = createTestMemory();
      await store.add(memory);

      const retrieved = await store.get('test-id');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-id');
    });

    it('应该在获取时更新访问统计', async () => {
      const memory = createTestMemory({ accessCount: 0 });
      await store.add(memory);

      const originalAccessedAt = memory.lastAccessedAt;

      // 等待 1ms 确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1));

      await store.get('test-id');
      const retrieved = await store.get('test-id');

      expect(retrieved?.accessCount).toBe(2);
      expect(retrieved?.lastAccessedAt).toBeGreaterThan(originalAccessedAt);
    });

    it('应该返回 null 当记忆不存在时', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('应该更新记忆字段', async () => {
      const memory = createTestMemory({ importance: 0.5 });
      await store.add(memory);

      await store.update('test-id', { importance: 0.8 });

      const retrieved = await store.get('test-id');
      expect(retrieved?.importance).toBe(0.8);
    });

    it('应该保持不可变性', async () => {
      const memory = createTestMemory({ importance: 0.5 });
      await store.add(memory);

      await store.update('test-id', { importance: 0.8 });

      const retrieved = await store.get('test-id');
      expect(retrieved).not.toBe(memory);
    });
  });

  describe('delete', () => {
    it('应该删除记忆', async () => {
      const memory = createTestMemory();
      await store.add(memory);

      await store.delete('test-id');

      const retrieved = await store.get('test-id');
      expect(retrieved).toBeNull();
    });

    it('应该从索引中移除', async () => {
      const memory = createTestMemory({ sessionId: 'session-1' });
      await store.add(memory);

      await store.delete('test-id');

      const memories = await store.getBySession('session-1');
      expect(memories).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // 添加测试数据
      await store.add(createTestMemory({ id: 'mem-1', sessionId: 'session-1', type: 'fact', importance: 0.8 }));
      await store.add(createTestMemory({ id: 'mem-2', sessionId: 'session-1', type: 'preference', importance: 0.6 }));
      await store.add(createTestMemory({ id: 'mem-3', sessionId: 'session-2', type: 'fact', importance: 0.4 }));
    });

    it('应该按 sessionId 搜索', async () => {
      const results = await store.search({ sessionId: 'session-1' });
      expect(results).toHaveLength(2);
    });

    it('应该按 type 搜索', async () => {
      const results = await store.search({ type: 'fact' });
      expect(results).toHaveLength(2);
    });

    it('应该按 minImportance 搜索', async () => {
      const results = await store.search({ minImportance: 0.5 });
      expect(results).toHaveLength(2);
    });

    it('应该支持组合条件', async () => {
      const results = await store.search({ sessionId: 'session-1', type: 'fact' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem-1');
    });

    it('应该限制结果数量', async () => {
      const results = await store.search({ limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('getBySession', () => {
    it('应该返回会话的所有记忆', async () => {
      await store.add(createTestMemory({ id: 'mem-1', sessionId: 'session-1' }));
      await store.add(createTestMemory({ id: 'mem-2', sessionId: 'session-1' }));
      await store.add(createTestMemory({ id: 'mem-3', sessionId: 'session-2' }));

      const memories = await store.getBySession('session-1');
      expect(memories).toHaveLength(2);
      expect(memories.every(m => m.sessionId === 'session-1')).toBe(true);
    });
  });

  describe('getByAgent', () => {
    it('应该返回 Agent 的所有记忆', async () => {
      await store.add(createTestMemory({ id: 'mem-1', agentId: 'agent-1' }));
      await store.add(createTestMemory({ id: 'mem-2', agentId: 'agent-1' }));
      await store.add(createTestMemory({ id: 'mem-3', agentId: 'agent-2' }));

      const memories = await store.getByAgent('agent-1');
      expect(memories).toHaveLength(2);
      expect(memories.every(m => m.agentId === 'agent-1')).toBe(true);
    });
  });

  describe('stats', () => {
    it('应该返回正确的统计信息', async () => {
      await store.add(createTestMemory({ id: 'mem-1', sessionId: 'session-1', type: 'fact' }));
      await store.add(createTestMemory({ id: 'mem-2', sessionId: 'session-1', type: 'preference' }));
      await store.add(createTestMemory({ id: 'mem-3', sessionId: 'session-2', type: 'fact' }));

      const stats = await store.stats();

      expect(stats.totalMemories).toBe(3);
      expect(stats.byType.fact).toBe(2);
      expect(stats.byType.preference).toBe(1);
      expect(stats.bySession['session-1']).toBe(2);
      expect(stats.bySession['session-2']).toBe(1);
    });

    it('应该返回空统计', async () => {
      const stats = await store.stats();
      expect(stats.totalMemories).toBe(0);
      expect(Object.keys(stats.byType)).toHaveLength(0);
      expect(Object.keys(stats.bySession)).toHaveLength(0);
    });
  });

  describe('TTL 清理', () => {
    it('应该在超过 TTL 时清理过期记忆', async () => {
      const shortTTLStore = new InMemoryMapStore({ ttl: 100 }); // 100ms TTL

      await shortTTLStore.add(createTestMemory({ id: 'mem-1' }));

      // 等待 TTL 过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 触发清理（通过任何操作）
      await shortTTLStore.stats();

      const retrieved = await shortTTLStore.get('mem-1');
      expect(retrieved).toBeNull();
    });

    it('应该保留未过期的记忆', async () => {
      const shortTTLStore = new InMemoryMapStore({ ttl: 500 });

      await shortTTLStore.add(createTestMemory({ id: 'mem-1' }));

      // 等待但未超过 TTL
      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = await shortTTLStore.get('mem-1');
      expect(retrieved).not.toBeNull();
    });
  });
});
