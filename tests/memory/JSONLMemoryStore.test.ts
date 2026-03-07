/**
 * JSONLMemoryStore 单元测试
 * 测试 L2 持久化层功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JSONLMemoryStore } from '../../src/memory/store/JSONLMemoryStore.js';
import type { Memory } from '../../src/memory/types.js';

describe('JSONLMemoryStore', () => {
  const testMemoryPath = join(tmpdir(), `memory-test-${Date.now()}`);
  let store: JSONLMemoryStore;

  beforeEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testMemoryPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
    store = new JSONLMemoryStore(testMemoryPath);
    await store.init();
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testMemoryPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  const createTestMemory = (overrides: Partial<Memory> = {}): Memory => ({
    id: `test-id-${Date.now()}-${Math.random()}`,
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

  describe('init', () => {
    it('应该创建目录结构', async () => {
      await store.init();

      const sessionsPath = join(testMemoryPath, 'sessions');

      // 目录应该存在
      await fs.access(sessionsPath);

      // index.jsonl 在添加第一个记忆时才会创建
      const indexPath = join(testMemoryPath, 'index.jsonl');
      const indexExists = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);
      expect(indexExists).toBe(false); // 初始时不存在
    });

    it('应该在目录已存在时不报错', async () => {
      await fs.mkdir(testMemoryPath, { recursive: true });
      await fs.mkdir(join(testMemoryPath, 'sessions'), { recursive: true });

      await expect(store.init()).resolves.toBeUndefined();
    });
  });

  describe('add', () => {
    it('应该添加记忆并返回 ID', async () => {
      const memory = createTestMemory({ id: 'mem-1' });
      const id = await store.add(memory);

      expect(id).toBe('mem-1');
    });

    it('应该追加到会话文件', async () => {
      const memory = createTestMemory({ id: 'mem-1', sessionId: 'session-1' });
      await store.add(memory);

      const sessionPath = join(testMemoryPath, 'sessions', 'session-1.jsonl');
      const content = await fs.readFile(sessionPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);
      const saved = JSON.parse(lines[0]);
      expect(saved.id).toBe('mem-1');
    });

    it('应该更新索引', async () => {
      const memory = createTestMemory({ id: 'mem-1', sessionId: 'session-1' });
      await store.add(memory);

      const indexPath = join(testMemoryPath, 'index.jsonl');
      const content = await fs.readFile(indexPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBeGreaterThan(0);
      const indexEntry = JSON.parse(lines[0]);
      expect(indexEntry.id).toBe('mem-1');
      expect(indexEntry.sessionId).toBe('session-1');
    });

    it('应该支持同一会话添加多个记忆', async () => {
      await store.add(createTestMemory({ id: 'mem-1', sessionId: 'session-1' }));
      await store.add(createTestMemory({ id: 'mem-2', sessionId: 'session-1' }));

      const sessionPath = join(testMemoryPath, 'sessions', 'session-1.jsonl');
      const content = await fs.readFile(sessionPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('应该获取已添加的记忆', async () => {
      const memory = createTestMemory({ id: 'mem-1', content: 'Test content' });
      await store.add(memory);

      const retrieved = await store.get('mem-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('mem-1');
      expect(retrieved?.content).toBe('Test content');
    });

    it('应该返回 null 当记忆不存在时', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('应该更新记忆字段', async () => {
      const memory = createTestMemory({ id: 'mem-1', importance: 0.5 });
      await store.add(memory);

      await store.update('mem-1', { importance: 0.8 });

      const retrieved = await store.get('mem-1');
      expect(retrieved?.importance).toBe(0.8);
    });

    it('应该保持不可变性', async () => {
      const memory = createTestMemory({ id: 'mem-1', importance: 0.5 });
      await store.add(memory);

      await store.update('mem-1', { importance: 0.8 });

      const retrieved = await store.get('mem-1');
      expect(retrieved).not.toBe(memory);
    });
  });

  describe('delete', () => {
    it('应该删除记忆', async () => {
      const memory = createTestMemory({ id: 'mem-1' });
      await store.add(memory);

      await store.delete('mem-1');

      const retrieved = await store.get('mem-1');
      expect(retrieved).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.add(
        createTestMemory({ id: 'mem-1', sessionId: 'session-1', type: 'fact', importance: 0.8 })
      );
      await store.add(
        createTestMemory({
          id: 'mem-2',
          sessionId: 'session-1',
          type: 'preference',
          importance: 0.6,
        })
      );
      await store.add(
        createTestMemory({ id: 'mem-3', sessionId: 'session-2', type: 'fact', importance: 0.4 })
      );
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
  });

  describe('getBySession', () => {
    it('应该返回会话的所有记忆', async () => {
      await store.add(createTestMemory({ id: 'mem-1', sessionId: 'session-1' }));
      await store.add(createTestMemory({ id: 'mem-2', sessionId: 'session-1' }));
      await store.add(createTestMemory({ id: 'mem-3', sessionId: 'session-2' }));

      const memories = await store.getBySession('session-1');
      expect(memories).toHaveLength(2);
      expect(memories.every((m) => m.sessionId === 'session-1')).toBe(true);
    });
  });

  describe('getByAgent', () => {
    it('应该返回 Agent 的所有记忆', async () => {
      await store.add(createTestMemory({ id: 'mem-1', agentId: 'agent-1' }));
      await store.add(createTestMemory({ id: 'mem-2', agentId: 'agent-1' }));
      await store.add(createTestMemory({ id: 'mem-3', agentId: 'agent-2' }));

      const memories = await store.getByAgent('agent-1');
      expect(memories).toHaveLength(2);
      expect(memories.every((m) => m.agentId === 'agent-1')).toBe(true);
    });
  });

  describe('stats', () => {
    it('应该返回正确的统计信息', async () => {
      await store.add(createTestMemory({ id: 'mem-1', sessionId: 'session-1', type: 'fact' }));
      await store.add(
        createTestMemory({ id: 'mem-2', sessionId: 'session-1', type: 'preference' })
      );
      await store.add(createTestMemory({ id: 'mem-3', sessionId: 'session-2', type: 'fact' }));

      const stats = await store.stats();

      expect(stats.totalMemories).toBe(3);
      expect(stats.byType.fact).toBe(2);
      expect(stats.byType.preference).toBe(1);
      expect(stats.bySession['session-1']).toBe(2);
      expect(stats.bySession['session-2']).toBe(1);
    });
  });
});
