/**
 * DingTalkMessageStore 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  DingTalkMessageStore,
  DingTalkMessageStatus,
  type QueuedMessage,
  type DeadLetterMessage,
} from '../src/channel/DingTalkMessageStore.js';
import type { OutgoingMessage } from '../src/channel/types.js';

describe('DingTalkMessageStore', () => {
  let store: DingTalkMessageStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `dingtalk-store-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    store = new DingTalkMessageStore({ basePath: tempDir });
    await store.init();

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await store.destroy();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应创建存储目录', async () => {
      const stat = await fs.stat(tempDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('应在使用时创建存储文件', async () => {
      // 文件在首次写入时创建
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');

      const files = await fs.readdir(tempDir);
      expect(files).toContain('pending_queue.jsonl');
    });
  });

  describe('enqueue()', () => {
    it('应将消息加入队列', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const item = await store.enqueue(message, 'msg-001');

      expect(item.messageId).toBe('msg-001');
      expect(item.status).toBe(DingTalkMessageStatus.PENDING);
      expect(item.retryCount).toBe(0);
      expect(item.message).toEqual(message);

      const pending = store.getPending();
      expect(pending.length).toBe(1);
      expect(pending[0].messageId).toBe('msg-001');
    });

    it('应自动生成消息 ID', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const item = await store.enqueue(message);

      expect(item.messageId).toMatch(/^dt_\d+_[a-z0-9]+$/);
    });

    it('应支持群聊消息', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        conversationId: 'conv456',
        threadId: 'thread789',
        content: 'Group message',
      };

      const item = await store.enqueue(message, 'msg-002');

      expect(item.sessionId).toBe('dingtalk:conv456:thread789:user123');
    });
  });

  describe('dequeue()', () => {
    it('应从队列中移除消息', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.dequeue('msg-001');

      const pending = store.getPending();
      expect(pending.length).toBe(0);
    });

    it('移除不存在的消息应无副作用', async () => {
      await expect(store.dequeue('non-existent')).resolves.not.toThrow();
    });
  });

  describe('updateStatus()', () => {
    it('应更新消息状态为 RETRYING', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.RETRYING, 'Network error');

      const item = store.get('msg-001');
      expect(item?.status).toBe(DingTalkMessageStatus.RETRYING);
      expect(item?.lastError).toBe('Network error');
    });

    it('应更新消息状态为 COMPLETED', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.COMPLETED);

      const item = store.get('msg-001');
      expect(item).toBeUndefined();

      const stats = store.getStats();
      expect(stats.totalSent).toBe(1);
    });

    it('应将消息移到死信队列', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus(
        'msg-001',
        DingTalkMessageStatus.DEAD_LETTER,
        'Max retries exceeded'
      );

      const item = store.get('msg-001');
      expect(item).toBeUndefined();

      const deadLetters = store.getDeadLetters();
      expect(deadLetters.length).toBe(1);
      expect(deadLetters[0].messageId).toBe('msg-001');
      expect(deadLetters[0].reason).toBe('Max retries exceeded');

      const stats = store.getStats();
      expect(stats.totalFailed).toBe(1);
    });
  });

  describe('incrementRetry()', () => {
    it('应增加重试次数', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.RETRYING);

      const item = await store.incrementRetry('msg-001');
      expect(item?.retryCount).toBe(1);

      const item2 = await store.incrementRetry('msg-001');
      expect(item2?.retryCount).toBe(2);
    });

    it('不存在的消息应返回 null', async () => {
      const item = await store.incrementRetry('non-existent');
      expect(item).toBeNull();
    });
  });

  describe('getRetryable()', () => {
    it('应返回可重试的消息', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.RETRYING);

      const retryable = store.getRetryable(3);
      expect(retryable.length).toBe(1);
      expect(retryable[0].messageId).toBe('msg-001');
    });

    it('应排除超过最大重试次数的消息', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.RETRYING);
      await store.incrementRetry('msg-001');
      await store.incrementRetry('msg-001');
      await store.incrementRetry('msg-001');

      const retryable = store.getRetryable(3);
      expect(retryable.length).toBe(0);
    });
  });

  describe('幂等性', () => {
    it('checkIdempotency() 应返回 false 对于新消息', async () => {
      expect(store.checkIdempotency('msg-001')).toBe(false);
    });

    it('markSent() 后 checkIdempotency() 应返回 true', async () => {
      await store.markSent('msg-001');
      expect(store.checkIdempotency('msg-001')).toBe(true);
    });

    it('应持久化幂等性缓存', async () => {
      await store.markSent('msg-001');

      // 创建新实例加载持久化数据
      const newStore = new DingTalkMessageStore({ basePath: tempDir });
      await newStore.init();

      expect(newStore.checkIdempotency('msg-001')).toBe(true);

      await newStore.destroy();
    });
  });

  describe('getStats()', () => {
    it('应返回正确的统计信息', async () => {
      const stats = store.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(0);
      expect(stats.deadLetter).toBe(0);
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });

    it('应更新统计信息', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');

      let stats = store.getStats();
      expect(stats.pending).toBe(1);

      await store.updateStatus('msg-001', DingTalkMessageStatus.RETRYING);

      stats = store.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(1);
    });
  });

  describe('cleanup()', () => {
    it('应清理过期的幂等性缓存', async () => {
      // 创建短期 TTL 的 store
      const shortTtlStore = new DingTalkMessageStore({
        basePath: tempDir,
        idempotencyTtlMs: 100, // 100ms
      });
      await shortTtlStore.init();

      await shortTtlStore.markSent('msg-001');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleaned = await shortTtlStore.cleanup(new Date());
      expect(cleaned).toBe(1);

      expect(shortTtlStore.checkIdempotency('msg-001')).toBe(false);

      await shortTtlStore.destroy();
    });
  });

  describe('持久化', () => {
    it('应持久化待发送队列', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');

      // 创建新实例加载持久化数据
      const newStore = new DingTalkMessageStore({ basePath: tempDir });
      await newStore.init();

      const pending = newStore.getPending();
      expect(pending.length).toBe(1);
      expect(pending[0].messageId).toBe('msg-001');

      await newStore.destroy();
    });

    it('应持久化死信队列', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.DEAD_LETTER, 'Test error');

      // 创建新实例加载持久化数据
      const newStore = new DingTalkMessageStore({ basePath: tempDir });
      await newStore.init();

      const deadLetters = newStore.getDeadLetters();
      expect(deadLetters.length).toBe(1);
      expect(deadLetters[0].messageId).toBe('msg-001');
      expect(deadLetters[0].reason).toBe('Test error');

      await newStore.destroy();
    });
  });

  describe('setNextRetryTime()', () => {
    it('应设置下次重试时间', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await store.enqueue(message, 'msg-001');
      await store.updateStatus('msg-001', DingTalkMessageStatus.RETRYING);

      const nextRetryAt = Date.now() + 5000;
      await store.setNextRetryTime('msg-001', nextRetryAt);

      const item = store.get('msg-001');
      expect(item?.nextRetryAt).toBe(nextRetryAt);
    });
  });
});
