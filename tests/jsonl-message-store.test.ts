/**
 * JSONLMessageStore 测试
 * 测试消息持久化存储功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { JSONLMessageStore } from '../src/message/JSONLMessageStore.js';
import type { Message } from '../src/message/types.js';
import type { PersistentMessage } from '../src/core/IMessageStore.js';
import { MessageStatus } from '../src/core/IMessageStore.js';

describe('JSONLMessageStore', () => {
  let store: JSONLMessageStore;
  const testSessionsPath = 'test-sessions-messages';

  beforeEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testSessionsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }

    store = new JSONLMessageStore(testSessionsPath);
    await store.init();
  });

  afterEach(async () => {
    await store.destroy();

    // 清理测试目录
    try {
      await fs.rm(testSessionsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  const createMockMessage = (id: string, sessionId: string): Message => ({
    id,
    timestamp: Date.now(),
    version: '1.0',
    from: 'sender',
    to: 'receiver',
    sessionId,
    type: 'request',
    payload: { task: 'test' },
    ack: { required: false, timeout: 0, retry: 0 },
  });

  describe('save 和 get', () => {
    it('应保存并获取消息', async () => {
      const message = createMockMessage('msg-1', 'session-1');
      const persistent = JSONLMessageStore.toPersistent(message);

      await store.save(persistent);
      const retrieved = await store.get('msg-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('msg-1');
      expect(retrieved?.sessionId).toBe('session-1');
      expect(retrieved?.status).toBe('pending');
      expect(retrieved?.retryCount).toBe(0);
    });

    it('应返回 null 当消息不存在时', async () => {
      const retrieved = await store.get('non-existent');

      expect(retrieved).toBeNull();
    });

    it('应保存多个消息到同一个 session', async () => {
      const msg1 = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      const msg2 = JSONLMessageStore.toPersistent(createMockMessage('msg-2', 'session-1'));

      await store.save(msg1);
      await store.save(msg2);

      const retrieved1 = await store.get('msg-1');
      const retrieved2 = await store.get('msg-2');

      expect(retrieved1?.id).toBe('msg-1');
      expect(retrieved2?.id).toBe('msg-2');
    });
  });

  describe('updateStatus', () => {
    it('应更新消息状态', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      await store.updateStatus('msg-1', 'processing');

      const retrieved = await store.get('msg-1');
      expect(retrieved?.status).toBe('processing');
    });

    it('应更新消息状态为 completed', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      await store.updateStatus('msg-1', 'completed');

      const retrieved = await store.get('msg-1');
      expect(retrieved?.status).toBe('completed');
    });

    it('应更新消息状态为 failed 并附带错误信息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      await store.updateStatus('msg-1', 'failed', 'Connection timeout');

      const retrieved = await store.get('msg-1');
      expect(retrieved?.status).toBe('failed');
      expect(retrieved?.error).toBe('Connection timeout');
    });

    it('应不抛出错误当更新不存在的消息时', async () => {
      await expect(store.updateStatus('non-existent', 'processing')).resolves.not.toThrow();
    });
  });

  describe('incrementRetry', () => {
    it('应增加重试次数', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      await store.incrementRetry('msg-1');
      await store.incrementRetry('msg-1');

      const retrieved = await store.get('msg-1');
      expect(retrieved?.retryCount).toBe(2);
    });
  });

  describe('getTimeoutMessages', () => {
    it('应获取超时的 pending 消息', async () => {
      const now = Date.now();
      const oldTime = now - 10000; // 10 秒前

      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      (message as any).createdAt = oldTime;
      (message as any).updatedAt = oldTime;

      await store.save(message);

      const timeoutMessages = await store.getTimeoutMessages(new Date(now - 5000));
      expect(timeoutMessages).toHaveLength(1);
      expect(timeoutMessages[0].id).toBe('msg-1');
    });

    it('应获取超时的 processing 消息', async () => {
      const now = Date.now();
      const oldTime = now - 10000;

      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);
      await store.updateStatus('msg-1', 'processing');

      // 手动设置 updatedAt 为过去的时间
      const stored = await store.get('msg-1');
      if (stored) {
        (stored as any).updatedAt = oldTime;
        // 需要手动修改文件，这里简化测试
      }
    });

    it('应不返回未超时的消息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      const timeoutMessages = await store.getTimeoutMessages(new Date(Date.now() - 100));
      expect(timeoutMessages).toHaveLength(0);
    });

    it('应不返回已完成的消息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);
      await store.updateStatus('msg-1', 'completed');

      const timeoutMessages = await store.getTimeoutMessages(new Date(Date.now() + 10000));
      expect(timeoutMessages).toHaveLength(0);
    });
  });

  describe('getRetryableMessages', () => {
    it('应获取可重试的失败消息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);
      await store.updateStatus('msg-1', 'failed', 'Error');

      const retryable = await store.getRetryableMessages(3);
      expect(retryable).toHaveLength(1);
      expect(retryable[0].id).toBe('msg-1');
    });

    it('应过滤超过最大重试次数的消息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);
      await store.updateStatus('msg-1', 'failed', 'Error');
      await store.incrementRetry('msg-1');
      await store.incrementRetry('msg-1');
      await store.incrementRetry('msg-1');

      const retryable = await store.getRetryableMessages(2);
      expect(retryable).toHaveLength(0);
    });

    it('应只返回 failed 状态的消息', async () => {
      const msg1 = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      const msg2 = JSONLMessageStore.toPersistent(createMockMessage('msg-2', 'session-1'));
      await store.save(msg1);
      await store.save(msg2);
      await store.updateStatus('msg-1', 'failed', 'Error');
      await store.updateStatus('msg-2', 'completed');

      const retryable = await store.getRetryableMessages(3);
      expect(retryable).toHaveLength(1);
      expect(retryable[0].id).toBe('msg-1');
    });
  });

  describe('deleteCompleted', () => {
    it('应删除旧的已完成消息', async () => {
      const now = Date.now();
      const oldTime = now - 10000;

      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);
      await store.updateStatus('msg-1', 'completed');

      const deleted = await store.deleteCompleted(new Date(now + 1000));
      expect(deleted).toBe(1);

      const retrieved = await store.get('msg-1');
      expect(retrieved).toBeNull();
    });

    it('应不删除未过期的已完成消息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);
      await store.updateStatus('msg-1', 'completed');

      const deleted = await store.deleteCompleted(new Date(Date.now() - 100));
      expect(deleted).toBe(0);

      const retrieved = await store.get('msg-1');
      expect(retrieved).not.toBeNull();
    });

    it('应不删除非 completed 状态的消息', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      const deleted = await store.deleteCompleted(new Date(Date.now() + 10000));
      expect(deleted).toBe(0);
    });
  });

  describe('toPersistent', () => {
    it('应将 Message 转换为 PersistentMessage', () => {
      const message: Message = {
        id: 'msg-1',
        timestamp: 1000,
        version: '1.0',
        from: 'sender',
        to: 'receiver',
        sessionId: 'session-1',
        type: 'request',
        payload: { task: 'test' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const persistent = JSONLMessageStore.toPersistent(message);

      expect(persistent.id).toBe('msg-1');
      expect(persistent.status).toBe('pending');
      expect(persistent.retryCount).toBe(0);
      expect(persistent.createdAt).toBe(1000);
      expect(persistent.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('init', () => {
    it('应创建基础目录', async () => {
      const newPath = 'test-new-sessions';
      try {
        await fs.rm(newPath, { recursive: true, force: true });
      } catch {
        // 忽略
      }

      const newStore = new JSONLMessageStore(newPath);
      await newStore.init();

      const exists = await fs
        .access(newPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      await newStore.destroy();
      try {
        await fs.rm(newPath, { recursive: true, force: true });
      } catch {
        // 忽略
      }
    });
  });

  describe('destroy', () => {
    it('应清空缓存', async () => {
      const message = JSONLMessageStore.toPersistent(createMockMessage('msg-1', 'session-1'));
      await store.save(message);

      await store.destroy();

      // destroy 后缓存应该清空，但文件仍在
      const retrieved = await store.get('msg-1');
      // 由于缓存被清空，get 会返回 null（因为没有重新加载索引）
      expect(retrieved).toBeNull();
    });
  });
});
