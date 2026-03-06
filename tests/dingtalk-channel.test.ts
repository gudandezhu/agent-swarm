/**
 * DingTalkChannel 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DingTalkChannel,
  type DingTalkConfig,
  type DingTalkSendMessage,
} from '../src/channel/DingTalkChannel.js';
import type { IncomingMessage, OutgoingMessage } from '../src/channel/types.js';

describe('DingTalkChannel', () => {
  let channel: DingTalkChannel;
  const defaultConfig: DingTalkConfig = {
    appKey: 'test-app-key',
    appSecret: 'test-app-secret',
  };

  beforeEach(() => {
    channel = new DingTalkChannel(defaultConfig);
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await channel.stop();
    vi.restoreAllMocks();
  });

  describe('基础属性', () => {
    it('应有正确的 id', () => {
      expect(channel.id).toBe('dingtalk');
    });

    it('应有正确的 name', () => {
      expect(channel.name).toBe('DingTalk');
    });
  });

  describe('start()', () => {
    it('应成功启动', async () => {
      await channel.start();
      expect(channel.isAvailable()).toBe(true);
    });

    it('重复启动应无副作用', async () => {
      await channel.start();
      await channel.start();
      expect(channel.isAvailable()).toBe(true);
    });

    it('配置 webhookUrl 时应打印 webhook 就绪消息', async () => {
      const webhookChannel = new DingTalkChannel({
        ...defaultConfig,
        webhookUrl: 'https://example.com/webhook',
      });
      const logSpy = vi.spyOn(console, 'log');

      await webhookChannel.start();

      expect(logSpy).toHaveBeenCalledWith('✓ DingTalk webhook server ready');
      expect(logSpy).toHaveBeenCalledWith('✓ DingTalk channel started');

      await webhookChannel.stop();
    });
  });

  describe('stop()', () => {
    it('应成功停止', async () => {
      await channel.start();
      await channel.stop();
      expect(channel.isAvailable()).toBe(false);
    });

    it('未启动时停止应无副作用', async () => {
      await channel.stop();
      expect(channel.isAvailable()).toBe(false);
    });
  });

  describe('send()', () => {
    it('应打印发送日志', async () => {
      await channel.start();
      const logSpy = vi.spyOn(console, 'log');

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello DingTalk',
      };

      await channel.send(message);

      expect(logSpy).toHaveBeenCalledWith('[DingTalk] Send to user123: Hello DingTalk');
    });

    it('应支持群聊消息', async () => {
      await channel.start();
      const logSpy = vi.spyOn(console, 'log');

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user456',
        conversationId: 'conv789',
        content: 'Group message',
      };

      await channel.send(message);

      expect(logSpy).toHaveBeenCalledWith('[DingTalk] Send to user456: Group message');
    });
  });

  describe('handleWebhook()', () => {
    it('应正确处理 Webhook 消息', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);
      await channel.start();

      const webhookData = {
        conversationId: 'conv123',
        conversationType: '1',
        userId: {
          staffId: 'staff456',
        },
        content: {
          contentType: 'text',
          text: 'Hello from DingTalk',
        },
        msgId: 'msg789',
        msgType: 'text',
        senderId: {
          staffId: 'staff456',
        },
        senderNick: 'Test User',
        createAt: Date.now(),
      };

      await channel.handleWebhook(webhookData);

      expect(handler).toHaveBeenCalled();
      const receivedMessage = handler.mock.calls[0][0] as IncomingMessage;
      expect(receivedMessage.channelId).toBe('dingtalk');
      expect(receivedMessage.userId).toBe('staff456');
      expect(receivedMessage.conversationId).toBe('conv123');
      expect(receivedMessage.content).toBe('Hello from DingTalk');
    });

    it('应正确处理带 thread 的消息', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);
      await channel.start();

      const webhookData = {
        conversationId: 'conv123',
        conversationType: 'group',
        userId: {
          staffId: 'staff456',
        },
        content: {
          contentType: 'text',
          text: 'Reply in thread',
        },
        msgId: 'msg789',
        msgType: 'text',
        senderId: {
          staffId: 'staff456',
        },
        senderNick: 'Test User',
        createAt: Date.now(),
      };

      await channel.handleWebhook(webhookData);

      const receivedMessage = handler.mock.calls[0][0] as IncomingMessage;
      expect(receivedMessage.threadId).toBeUndefined();
    });
  });

  describe('getWebhookHandler()', () => {
    it('应返回可用的处理函数', async () => {
      await channel.start();

      const handler = channel.getWebhookHandler();
      expect(typeof handler).toBe('function');

      const webhookData = {
        conversationId: 'conv123',
        conversationType: '1',
        userId: {
          staffId: 'staff456',
        },
        content: {
          contentType: 'text',
          text: 'Test message',
        },
        msgId: 'msg789',
        msgType: 'text',
        senderId: {
          staffId: 'staff456',
        },
        senderNick: 'Test User',
        createAt: Date.now(),
      };

      // 调用返回的处理函数
      await handler(webhookData);
    });
  });

  describe('makeSessionId()', () => {
    it('应为单聊生成正确的 Session ID', async () => {
      await channel.start();

      const message: IncomingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'test',
      };

      const sessionId = channel.makeSessionId(message);
      expect(sessionId).toBe('dingtalk:user123');
    });

    it('应为群聊生成正确的 Session ID', async () => {
      await channel.start();

      const message: IncomingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        conversationId: 'conv456',
        threadId: 'thread789',
        content: 'test',
      };

      const sessionId = channel.makeSessionId(message);
      expect(sessionId).toBe('dingtalk:conv456:thread789:user123');
    });
  });

  describe('toOutgoing()', () => {
    it('应正确转换 Message 到 OutgoingMessage', async () => {
      await channel.start();

      const internalMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0' as const,
        from: 'agent',
        to: 'user',
        sessionId: 'dingtalk:conv123:user456',
        type: 'response' as const,
        payload: { data: 'Hello' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(internalMessage);

      expect(outgoing.channelId).toBe('dingtalk');
      expect(outgoing.conversationId).toBe('conv123');
      expect(outgoing.userId).toBe('user456');
      expect(outgoing.content).toBe('Hello');
    });
  });

  describe('消息发送失败重试机制', () => {
    it('TC-DT-001: 发送失败后应自动重试', async () => {
      // 创建带重试配置的 Channel，禁用持久化重试
      const retryChannel = new DingTalkChannel({
        ...defaultConfig,
        maxRetries: 3,
        retryDelay: 100, // 100ms 便于测试
        enablePersistentRetry: false,
      });

      await retryChannel.start();

      // Mock sendToDingTalkAPI - 第一次失败，第二次成功
      let callCount = 0;
      const sendSpy = vi
        .spyOn(
          retryChannel as unknown as { sendToDingTalkAPI: () => Promise<void> },
          'sendToDingTalkAPI'
        )
        .mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Network error');
          }
        });

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Test retry',
      };

      // 发送应最终成功（第二次尝试）
      await retryChannel.send(message);

      // 验证被调用了两次（第一次失败，第二次成功）
      expect(sendSpy).toHaveBeenCalledTimes(2);

      await retryChannel.stop();
    });

    it('TC-DT-002: 超过最大重试次数应抛出错误', async () => {
      const retryChannel = new DingTalkChannel({
        ...defaultConfig,
        maxRetries: 2,
        retryDelay: 50,
        enablePersistentRetry: false,
      });

      await retryChannel.start();

      // Mock 始终失败
      vi.spyOn(
        retryChannel as unknown as { sendToDingTalkAPI: () => Promise<void> },
        'sendToDingTalkAPI'
      ).mockRejectedValue(new Error('Permanent failure'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Test max retries',
      };

      // 应抛出错误
      await expect(retryChannel.send(message)).rejects.toThrow('Permanent failure');

      await retryChannel.stop();
    });

    it('TC-DT-003: 应使用指数退避延迟重试', async () => {
      const retryChannel = new DingTalkChannel({
        ...defaultConfig,
        maxRetries: 3,
        retryDelay: 100,
        retryBackoffFactor: 2, // 指数退避因子
        enablePersistentRetry: false,
      });

      await retryChannel.start();

      const delays: number[] = [];
      let lastCallTime = 0;

      vi.spyOn(
        retryChannel as unknown as { sendToDingTalkAPI: () => Promise<void> },
        'sendToDingTalkAPI'
      ).mockImplementation(async () => {
        const now = Date.now();
        if (lastCallTime > 0) {
          delays.push(now - lastCallTime);
        }
        lastCallTime = now;

        // 前两次失败，第三次成功
        if (delays.length < 2) {
          throw new Error('Temporary failure');
        }
      });

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Test backoff',
      };

      await retryChannel.send(message);

      // 验证延迟是递增的（100ms, 200ms）
      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(90); // 允许 10ms 误差
      expect(delays[1]).toBeGreaterThanOrEqual(delays[0] * 1.8); // 第二次延迟约为第一次的 2 倍

      await retryChannel.stop();
    });

    it('TC-DT-004: 发送成功后不应重试', async () => {
      const retryChannel = new DingTalkChannel({
        ...defaultConfig,
        maxRetries: 3,
        retryDelay: 100,
        enablePersistentRetry: false,
      });

      await retryChannel.start();

      const sendSpy = vi
        .spyOn(
          retryChannel as unknown as { sendToDingTalkAPI: () => Promise<void> },
          'sendToDingTalkAPI'
        )
        .mockResolvedValue(undefined);

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Test no retry',
      };

      await retryChannel.send(message);

      // 只应调用一次
      expect(sendSpy).toHaveBeenCalledTimes(1);

      await retryChannel.stop();
    });
  });

  describe('持久化重试机制', () => {
    let tempDir: string;

    beforeEach(async () => {
      const { tmpdir } = await import('os');
      const { join } = await import('path');
      tempDir = join(tmpdir(), `dingtalk-channel-${Date.now()}`);
    });

    afterEach(async () => {
      const { promises: fs } = await import('fs');
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // 忽略清理错误
      }
    });

    it('应启用持久化重试', async () => {
      const persistentChannel = new DingTalkChannel({
        ...defaultConfig,
        storagePath: tempDir,
        enablePersistentRetry: true,
      });

      await persistentChannel.start();

      expect(persistentChannel.isPersistentRetryEnabled()).toBe(true);

      const stats = persistentChannel.getQueueStats();
      expect(stats).not.toBeNull();

      await persistentChannel.stop();
    });

    it('默认应禁用持久化重试', async () => {
      await channel.start();

      expect(channel.isPersistentRetryEnabled()).toBe(false);

      const stats = channel.getQueueStats();
      expect(stats).toBeNull();
    });

    it('应能获取死信队列', async () => {
      const persistentChannel = new DingTalkChannel({
        ...defaultConfig,
        storagePath: tempDir,
        enablePersistentRetry: true,
      });

      await persistentChannel.start();

      const deadLetters = persistentChannel.getDeadLetters();
      expect(deadLetters).toEqual([]);

      await persistentChannel.stop();
    });
  });
});
