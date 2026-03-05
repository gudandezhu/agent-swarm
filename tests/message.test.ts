/**
 * MessageBus 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageBus } from '../src/message/MessageBus.js';
import type { Message, MessageHandler } from '../src/message/types.js';

describe('MessageBus', () => {
  let bus: MessageBus;
  let receivedMessages: Message[] = [];

  beforeEach(() => {
    bus = new MessageBus();
    receivedMessages = [];
  });

  describe('subscribe / unsubscribe', () => {
    it('应该能订阅和接收消息', async () => {
      const handler: MessageHandler = (msg) => {
        receivedMessages.push(msg);
      };

      bus.subscribe('agent-1', handler);

      await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test-session',
        payload: { data: 'hello' },
      });

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload.data).toBe('hello');
    });

    it('应该能取消订阅', async () => {
      const handler: MessageHandler = () => {
        receivedMessages.push({} as Message);
      };

      const unsubscribe = bus.subscribe('agent-1', handler);
      unsubscribe();

      await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test-session',
        payload: {},
      });

      expect(receivedMessages).toHaveLength(0);
    });

    it('应该支持多个订阅者', async () => {
      const handler1: MessageHandler = (msg) => {
        receivedMessages.push({ ...msg, handler: 1 });
      };
      const handler2: MessageHandler = (msg) => {
        receivedMessages.push({ ...msg, handler: 2 });
      };

      bus.subscribe('agent-1', handler1);
      bus.subscribe('agent-1', handler2);

      await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test-session',
        payload: {},
      });

      expect(receivedMessages).toHaveLength(2);
    });
  });

  describe('send', () => {
    it('应该生成唯一 ID', async () => {
      const msg1 = await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test',
        payload: {},
      });
      const msg2 = await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test',
        payload: {},
      });

      expect(msg1.id).not.toBe(msg2.id);
    });

    it('应该设置时间戳', async () => {
      const before = Date.now();
      const msg = await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test',
        payload: {},
      });
      const after = Date.now();

      expect(msg.timestamp).toBeGreaterThanOrEqual(before);
      expect(msg.timestamp).toBeLessThanOrEqual(after);
    });

    it('应该支持多目标', async () => {
      let count = 0;
      const handler: MessageHandler = () => {
        count++;
      };

      bus.subscribe('agent-1', handler);
      bus.subscribe('agent-2', handler);

      await bus.send({
        from: 'user',
        to: ['agent-1', 'agent-2'],
        sessionId: 'test',
        payload: {},
      });

      expect(count).toBe(2);
    });
  });

  describe('events', () => {
    it('应该触发 sent 事件', async () => {
      let sentMessage: Message | undefined;

      bus.on('sent', (msg) => {
        sentMessage = msg;
      });

      const msg = await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test',
        payload: { data: 'test' },
      });

      expect(sentMessage).toEqual(msg);
    });

    it('应该触发 error 事件', async () => {
      let caughtError: Error | undefined;

      const errorHandler: MessageHandler = () => {
        throw new Error('Handler error');
      };

      bus.on('error', ({ error }) => {
        caughtError = error as Error;
      });

      bus.subscribe('agent-1', errorHandler);

      await bus.send({
        from: 'user',
        to: 'agent-1',
        sessionId: 'test',
        payload: {},
      });

      expect(caughtError).toBeDefined();
      expect(caughtError?.message).toBe('Handler error');
    });
  });

  describe('getSubscriberCount', () => {
    it('应该返回正确的订阅者数量', () => {
      const handler1: MessageHandler = () => {};
      const handler2: MessageHandler = () => {};
      const handler3: MessageHandler = () => {};

      expect(bus.getSubscriberCount()).toBe(0);
      expect(bus.getSubscriberCount('agent-1')).toBe(0);

      bus.subscribe('agent-1', handler1);
      expect(bus.getSubscriberCount('agent-1')).toBe(1);

      bus.subscribe('agent-1', handler2);
      expect(bus.getSubscriberCount('agent-1')).toBe(2);

      bus.subscribe('agent-2', handler3);
      expect(bus.getSubscriberCount()).toBe(3);
    });

    it('应该对同一handler去重', () => {
      const handler: MessageHandler = () => {};

      bus.subscribe('agent-1', handler);
      bus.subscribe('agent-1', handler);

      expect(bus.getSubscriberCount('agent-1')).toBe(1);
    });
  });
});
