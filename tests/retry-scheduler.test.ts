/**
 * RetryScheduler 测试
 * 测试消息重试调度器
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetryScheduler } from '../src/reliability/RetryScheduler.js';
import { MessageStatus } from '../src/core/IMessageStore.js';
import type { IMessageStore, PersistentMessage } from '../src/core/IMessageStore.js';
import type { IMessageBus } from '../src/core/IMessageBus.js';
import type { Message } from '../src/message/types.js';

// Mock implementations
class MockMessageStore implements IMessageStore {
  private messages = new Map<string, PersistentMessage>();

  async save(message: PersistentMessage): Promise<void> {
    this.messages.set(message.id, message);
  }

  async get(messageId: string): Promise<PersistentMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  async updateStatus(messageId: string, status: MessageStatus, error?: string): Promise<void> {
    const msg = this.messages.get(messageId);
    if (msg) {
      msg.status = status;
      msg.updatedAt = Date.now();
      if (error) msg.error = error;
    }
  }

  async incrementRetry(messageId: string): Promise<void> {
    const msg = this.messages.get(messageId);
    if (msg) {
      msg.retryCount++;
      msg.updatedAt = Date.now();
    }
  }

  async getTimeoutMessages(before: Date): Promise<PersistentMessage[]> {
    const beforeTime = before.getTime();
    const result = Array.from(this.messages.values()).filter(
      (m) =>
        (m.status === MessageStatus.PENDING || m.status === MessageStatus.PROCESSING) &&
        m.updatedAt < beforeTime
    );
    return result;
  }

  async getRetryableMessages(maxRetries: number): Promise<PersistentMessage[]> {
    return Array.from(this.messages.values()).filter(
      (m) => m.status === MessageStatus.FAILED && m.retryCount < maxRetries
    );
  }

  async deleteCompleted(before: Date): Promise<number> {
    let count = 0;
    for (const [id, msg] of this.messages) {
      if (msg.status === MessageStatus.COMPLETED && msg.updatedAt < before.getTime()) {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  // Helper method for tests
  addMessage(message: PersistentMessage): void {
    this.messages.set(message.id, message);
  }

  clear(): void {
    this.messages.clear();
  }
}

class MockMessageBus implements IMessageBus {
  private sentMessages: Message[] = [];
  private started = false;

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async send(message: Message): Promise<void> {
    this.sentMessages.push(message);
  }

  getSentMessages(): Message[] {
    return this.sentMessages;
  }

  clear(): void {
    this.sentMessages = [];
  }

  subscribe(agentId: string, handler: (msg: Message) => void): () => void {
    return () => {};
  }

  // Other methods not needed for tests
  stats = { messagesSent: 0, messagesReceived: 0, messagesProcessing: 0, errors: 0 };
  getStats() {
    return this.stats;
  }

  health() {
    return { status: 'healthy' as const, details: {} };
  }

  confirmACK() {}
  destroy() {}
}

describe('RetryScheduler', () => {
  let messageStore: MockMessageStore;
  let messageBus: MockMessageBus;
  let scheduler: RetryScheduler;

  beforeEach(() => {
    messageStore = new MockMessageStore();
    messageBus = new MockMessageBus();
    scheduler = new RetryScheduler(messageStore, messageBus, {
      interval: 100, // 短间隔用于测试
      timeoutMs: 500,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    scheduler.stop();
    messageStore.clear();
    messageBus.clear();
  });

  const createMockMessage = (
    id: string,
    sessionId: string,
    status: MessageStatus = MessageStatus.PENDING,
    updatedAt?: number
  ): PersistentMessage => ({
    id,
    timestamp: Date.now(),
    version: '1.0',
    from: 'sender',
    to: 'receiver',
    sessionId,
    type: 'request',
    payload: { task: 'test' },
    ack: { required: false, timeout: 0, retry: 0 },
    status,
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: updatedAt ?? Date.now(),
  });

  describe('start 和 stop', () => {
    it('应启动调度器', () => {
      scheduler.start();

      expect(scheduler.isRunning()).toBe(true);
    });

    it('应停止调度器', () => {
      scheduler.start();
      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });

    it('应忽略重复启动', () => {
      scheduler.start();
      scheduler.start();

      expect(scheduler.isRunning()).toBe(true);
    });

    it('应忽略重复停止', () => {
      scheduler.start();
      scheduler.stop();
      scheduler.stop();

      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('processTimeoutMessages', () => {
    it('应重新发送超时消息', async () => {
      const oldTime = Date.now() - 1000;
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.PENDING, oldTime);
      messageStore.addMessage(message);

      scheduler.start();

      // 等待扫描（间隔是 100ms）
      await new Promise((resolve) => setTimeout(resolve, 250));

      const sentMessages = messageBus.getSentMessages();
      expect(sentMessages.length).toBeGreaterThan(0);
      expect(sentMessages[0].id).toBe('msg-1');
    });

    it('应增加超时消息的重试次数', async () => {
      const oldTime = Date.now() - 1000;
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.PENDING, oldTime);
      messageStore.addMessage(message);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const updated = await messageStore.get('msg-1');
      expect(updated?.retryCount).toBeGreaterThan(0);
    });

    it('应将超过最大重试次数的消息标记为死信', async () => {
      const oldTime = Date.now() - 1000;
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.PENDING, oldTime);
      message.retryCount = 2; // 已达到最大重试次数
      messageStore.addMessage(message);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const updated = await messageStore.get('msg-1');
      expect(updated?.status).toBe(MessageStatus.DEAD_LETTER);
      expect(updated?.error).toBe('Max retries exceeded');
    });
  });

  describe('processFailedMessages', () => {
    it('应重新发送失败的消息', async () => {
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.FAILED);
      messageStore.addMessage(message);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const sentMessages = messageBus.getSentMessages();
      expect(sentMessages.length).toBeGreaterThan(0);
      expect(sentMessages[0].id).toBe('msg-1');
    });

    it('应更新重试消息的状态为处理中', async () => {
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.FAILED);
      messageStore.addMessage(message);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const updated = await messageStore.get('msg-1');
      expect(updated?.status).toBe(MessageStatus.PROCESSING);
    });

    it('应忽略超过最大重试次数的失败消息', async () => {
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.FAILED);
      message.retryCount = 2; // 已达到最大重试次数
      messageStore.addMessage(message);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const sentMessages = messageBus.getSentMessages();
      expect(sentMessages.length).toBe(0);
    });
  });

  describe('deleteCompleted', () => {
    it('应清理旧的成功消息', async () => {
      const oldTime = Date.now() - 25 * 60 * 60 * 1000; // 25小时前
      const message = createMockMessage('msg-1', 'session-1', MessageStatus.COMPLETED, oldTime);
      messageStore.addMessage(message);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const deleted = await messageStore.get('msg-1');
      expect(deleted).toBeNull();
    });
  });

  describe('配置', () => {
    it('应使用默认配置', () => {
      const defaultScheduler = new RetryScheduler(messageStore, messageBus);

      defaultScheduler.start();
      expect(defaultScheduler.isRunning()).toBe(true);
      defaultScheduler.stop();
    });

    it('应使用自定义配置', () => {
      const customScheduler = new RetryScheduler(messageStore, messageBus, {
        interval: 1000,
        timeoutMs: 10000,
        maxRetries: 5,
      });

      customScheduler.start();
      expect(customScheduler.isRunning()).toBe(true);
      customScheduler.stop();
    });
  });

  describe('错误处理', () => {
    it('应捕获并记录扫描错误', async () => {
      // 创建一个会抛出错误的 messageStore
      class FailingMessageStore extends MockMessageStore {
        async getTimeoutMessages() {
          throw new Error('Test error');
        }
      }

      const failingStore = new FailingMessageStore();
      const failingScheduler = new RetryScheduler(failingStore, messageBus, {
        interval: 50,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      failingScheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(consoleSpy).toHaveBeenCalled();

      failingScheduler.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('定期扫描', () => {
    it('应定期执行扫描', async () => {
      let scanCount = 0;

      // 创建一个会在每次扫描时更新的 messageStore
      class CountingMessageStore extends MockMessageStore {
        constructor(private callback: () => void) {
          super();
        }

        override async getTimeoutMessages(before?: Date): Promise<PersistentMessage[]> {
          this.callback();
          return before ? await super.getTimeoutMessages(before) : [];
        }
      }

      const countingStore = new CountingMessageStore(() => scanCount++);
      const countingScheduler = new RetryScheduler(countingStore, messageBus, {
        interval: 50,
      });

      countingScheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 200));

      countingScheduler.stop();

      expect(scanCount).toBeGreaterThan(1);
    });

    it('应在停止后不再扫描', async () => {
      let scanCount = 0;

      class CountingMessageStore extends MockMessageStore {
        constructor(private callback: () => void) {
          super();
        }

        override async getTimeoutMessages(before?: Date): Promise<PersistentMessage[]> {
          this.callback();
          return before ? await super.getTimeoutMessages(before) : [];
        }
      }

      const countingStore = new CountingMessageStore(() => scanCount++);
      const countingScheduler = new RetryScheduler(countingStore, messageBus, {
        interval: 50,
      });

      countingScheduler.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      countingScheduler.stop();

      const countAfterStop = scanCount;
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(scanCount).toBe(countAfterStop);
    });
  });
});
