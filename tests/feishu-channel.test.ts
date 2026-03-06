/**
 * FeishuChannel 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeishuChannel, type FeishuConfig } from '../src/channel/FeishuChannel.js';
import type { IncomingMessage, OutgoingMessage } from '../src/channel/types.js';

describe('FeishuChannel', () => {
  let channel: FeishuChannel;
  const defaultConfig: FeishuConfig = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
  };

  beforeEach(() => {
    channel = new FeishuChannel(defaultConfig);
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await channel.stop();
    vi.restoreAllMocks();
  });

  describe('基础属性', () => {
    it('应有正确的 id', () => {
      expect(channel.id).toBe('feishu');
    });

    it('应有正确的 name', () => {
      expect(channel.name).toBe('Feishu');
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
      const webhookChannel = new FeishuChannel({
        ...defaultConfig,
        webhookUrl: 'https://example.com/webhook',
      });
      const logSpy = vi.spyOn(console, 'log');

      await webhookChannel.start();

      expect(logSpy).toHaveBeenCalledWith('✓ Feishu webhook server ready');
      expect(logSpy).toHaveBeenCalledWith('✓ Feishu channel started');

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
        channelId: 'feishu',
        userId: 'user123',
        content: 'Hello Feishu',
      };

      await channel.send(message);

      expect(logSpy).toHaveBeenCalledWith('[Feishu] Send to user123: Hello Feishu');
    });

    it('应支持群聊消息', async () => {
      await channel.start();
      const logSpy = vi.spyOn(console, 'log');

      const message: OutgoingMessage = {
        channelId: 'feishu',
        userId: 'user456',
        conversationId: 'conv789',
        content: 'Group message',
      };

      await channel.send(message);

      expect(logSpy).toHaveBeenCalledWith('[Feishu] Send to user456: Group message');
    });
  });

  describe('handleEvent()', () => {
    it('应正确处理消息事件', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);
      await channel.start();

      const eventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user123',
              union_id: 'on_user123',
              user_id: 'user123',
            },
            sender_type: 'app',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg456',
            chat_type: 'p2p',
            chat_id: 'chat789',
            content: JSON.stringify({ text: 'Hello from Feishu' }),
            create_time: String(Date.now()),
          },
        },
      };

      await channel.handleEvent(eventData);

      expect(handler).toHaveBeenCalled();
      const receivedMessage = handler.mock.calls[0][0] as IncomingMessage;
      expect(receivedMessage.channelId).toBe('feishu');
      expect(receivedMessage.userId).toBe('ou_user123');
      expect(receivedMessage.conversationId).toBe('chat789');
      expect(receivedMessage.content).toBe('Hello from Feishu');
    });

    it('应忽略非消息事件', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);
      await channel.start();

      const eventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'other.event.type',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: undefined,
      };

      await channel.handleEvent(eventData);

      expect(handler).not.toHaveBeenCalled();
    });

    it('应处理空 content 的情况', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);
      await channel.start();

      const eventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user123',
              union_id: 'on_user123',
              user_id: 'user123',
            },
            sender_type: 'app',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg456',
            chat_type: 'p2p',
            chat_id: 'chat789',
            content: '',
            create_time: String(Date.now()),
          },
        },
      };

      await channel.handleEvent(eventData);

      expect(handler).toHaveBeenCalled();
      const receivedMessage = handler.mock.calls[0][0] as IncomingMessage;
      expect(receivedMessage.content).toBe('');
    });

    it('应正确设置 threadId', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);
      await channel.start();

      const eventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user123',
              union_id: 'on_user123',
              user_id: 'user123',
            },
            sender_type: 'app',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg456',
            chat_type: 'p2p',
            chat_id: 'chat789',
            content: JSON.stringify({ text: 'Reply message' }),
            create_time: String(Date.now()),
          },
        },
      };

      await channel.handleEvent(eventData);

      const receivedMessage = handler.mock.calls[0][0] as IncomingMessage;
      expect(receivedMessage.threadId).toBe('msg456');
    });
  });

  describe('getEventHandler()', () => {
    it('应返回可用的处理函数', async () => {
      await channel.start();

      const handler = channel.getEventHandler();
      expect(typeof handler).toBe('function');

      const eventData = {
        schema: '2.0',
        header: {
          event_id: 'event123',
          event_type: 'im.message.receive_v1',
          create_time: String(Date.now()),
          token: 'token123',
          app_id: 'app123',
          tenant_key: 'tenant123',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_user123',
              union_id: 'on_user123',
              user_id: 'user123',
            },
            sender_type: 'app',
            tenant_key: 'tenant123',
          },
          message: {
            message_id: 'msg456',
            chat_type: 'p2p',
            chat_id: 'chat789',
            content: JSON.stringify({ text: 'Test message' }),
            create_time: String(Date.now()),
          },
        },
      };

      // 调用返回的处理函数
      await handler(eventData);
    });
  });

  describe('makeSessionId()', () => {
    it('应为单聊生成正确的 Session ID', async () => {
      await channel.start();

      const message: IncomingMessage = {
        channelId: 'feishu',
        userId: 'user123',
        content: 'test',
      };

      const sessionId = channel.makeSessionId(message);
      expect(sessionId).toBe('feishu:user123');
    });

    it('应为群聊生成正确的 Session ID', async () => {
      await channel.start();

      const message: IncomingMessage = {
        channelId: 'feishu',
        userId: 'user123',
        conversationId: 'conv456',
        threadId: 'thread789',
        content: 'test',
      };

      const sessionId = channel.makeSessionId(message);
      expect(sessionId).toBe('feishu:conv456:thread789:user123');
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
        sessionId: 'feishu:conv123:user456',
        type: 'response' as const,
        payload: { data: 'Hello' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(internalMessage);

      expect(outgoing.channelId).toBe('feishu');
      expect(outgoing.conversationId).toBe('conv123');
      expect(outgoing.userId).toBe('user456');
      expect(outgoing.content).toBe('Hello');
    });
  });
});
