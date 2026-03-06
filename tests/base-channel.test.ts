/**
 * BaseChannel 测试 - ��充覆盖率
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseChannel } from '../src/channel/BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from '../src/channel/types.js';
import type { Message } from '../src/message/types.js';

// 创建一个测试用的 Channel 实现
class TestChannel extends BaseChannel {
  readonly id = 'test';
  readonly name = 'Test Channel';

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async send(_message: OutgoingMessage): Promise<void> {
    // 测试实现
  }
}

describe('BaseChannel (补充测试)', () => {
  let channel: TestChannel;

  beforeEach(() => {
    channel = new TestChannel();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('启动前应返回 false', () => {
      expect(channel.isAvailable()).toBe(false);
    });

    it('启动后应返回 true', async () => {
      await channel.start();
      expect(channel.isAvailable()).toBe(true);
    });

    it('停止后应返回 false', async () => {
      await channel.start();
      await channel.stop();
      expect(channel.isAvailable()).toBe(false);
    });
  });

  describe('onMessage', () => {
    it('应注册消息处理器', async () => {
      const handler = vi.fn();
      channel.onMessage(handler);

      await channel.start();

      const incomingMessage: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        content: 'test message',
      };

      await channel['handleMessage'](incomingMessage);

      expect(handler).toHaveBeenCalledWith(incomingMessage);
    });

    it('应支持多个处理器', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      channel.onMessage(handler1);
      channel.onMessage(handler2);

      await channel.start();

      const incomingMessage: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        content: 'test message',
      };

      await channel['handleMessage'](incomingMessage);

      expect(handler1).toHaveBeenCalledWith(incomingMessage);
      expect(handler2).toHaveBeenCalledWith(incomingMessage);
    });

    it('应捕获处理器中的错误', async () => {
      const errorSpy = vi.spyOn(console, 'error');
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      channel.onMessage(handler);
      await channel.start();

      const incomingMessage: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        content: 'test message',
      };

      await channel['handleMessage'](incomingMessage);

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain('[test]');
    });

    it('应继续处理后续处理器即使前面的处理器失败', async () => {
      const errorSpy = vi.spyOn(console, 'error');
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler 1 error'));
      const handler2 = vi.fn().mockResolvedValue(undefined);

      channel.onMessage(handler1);
      channel.onMessage(handler2);
      await channel.start();

      const incomingMessage: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        content: 'test message',
      };

      await channel['handleMessage'](incomingMessage);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('makeSessionId', () => {
    it('应生成基础 sessionId', () => {
      const message: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        content: 'test',
      };
      expect(channel.makeSessionId(message)).toBe('test:user1');
    });

    it('应包含 conversationId', () => {
      const message: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        conversationId: 'conv123',
        content: 'test',
      };
      expect(channel.makeSessionId(message)).toBe('test:conv123:user1');
    });

    it('应包含 threadId', () => {
      const message: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        conversationId: 'conv123',
        threadId: 'thread456',
        content: 'test',
      };
      expect(channel.makeSessionId(message)).toBe('test:conv123:thread456:user1');
    });

    it('应有 threadId 时必须有 conversationId', () => {
      const message: IncomingMessage = {
        channelId: 'test',
        userId: 'user1',
        threadId: 'thread456',
        content: 'test',
      };
      // threadId 单独存在时的行为
      expect(channel.makeSessionId(message)).toBe('test:thread456:user1');
    });
  });

  describe('toOutgoing', () => {
    it('应转换简单 Message', () => {
      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent1',
        to: 'user1',
        sessionId: 'test:user1',
        type: 'response',
        payload: { data: 'Hello' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(message);

      expect(outgoing).toEqual({
        channelId: 'test',
        userId: 'user1',
        conversationId: undefined,
        threadId: undefined,
        content: 'Hello',
      });
    });

    it('应转换带 conversationId 的 Message', () => {
      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent1',
        to: 'user1',
        sessionId: 'test:conv123:user1',
        type: 'response',
        payload: { data: 'Hello' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(message);

      expect(outgoing.conversationId).toBe('conv123');
    });

    it('应转换带 threadId 的 Message', () => {
      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent1',
        to: 'user1',
        sessionId: 'test:conv123:thread456:user1',
        type: 'response',
        payload: { data: 'Hello' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(message);

      expect(outgoing.conversationId).toBe('conv123');
      expect(outgoing.threadId).toBe('thread456');
    });

    it('应转换带对象数据的 Message', () => {
      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent1',
        to: 'user1',
        sessionId: 'test:user1',
        type: 'response',
        payload: { data: { key: 'value', number: 123 } },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(message);

      expect(outgoing.content).toBe('{"key":"value","number":123}');
    });

    it('应处理嵌套的对象数据', () => {
      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent1',
        to: 'user1',
        sessionId: 'test:user1',
        type: 'response',
        payload: {
          data: {
            nested: { deeply: { value: 'test' } },
            array: [1, 2, 3],
          },
        },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      const outgoing = channel.toOutgoing(message);

      expect(outgoing.content).toBe('{"nested":{"deeply":{"value":"test"}},"array":[1,2,3]}');
    });
  });
});
