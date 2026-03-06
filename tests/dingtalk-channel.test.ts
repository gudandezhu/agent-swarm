/**
 * DingTalkChannel 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DingTalkChannel, type DingTalkConfig, type DingTalkSendMessage } from '../src/channel/DingTalkChannel.js';
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
});
