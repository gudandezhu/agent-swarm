/**
 * MessageBus 测试 - 补充覆盖率
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageBus } from '../src/message/MessageBus.js';
import type { Message, MessageHandler } from '../src/message/types.js';

describe('MessageBus (补充测试)', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  afterEach(() => {
    bus.destroy();
  });

  describe('构造函数选项', () => {
    it('应使用默认选项', () => {
      const defaultBus = new MessageBus();
      expect(defaultBus['options']).toEqual({
        maxRetries: 3,
        defaultTimeout: 30000,
      });
      defaultBus.destroy();
    });

    it('应使用自定义选项', () => {
      const customBus = new MessageBus({
        maxRetries: 5,
        defaultTimeout: 60000,
      });
      expect(customBus['options']).toEqual({
        maxRetries: 5,
        defaultTimeout: 60000,
      });
      customBus.destroy();
    });

    it('应设置最大监听器数', () => {
      const maxListeners = (bus as any).getMaxListeners();
      expect(maxListeners).toBe(1000);
    });
  });

  describe('unsubscribe', () => {
    it('应取消订阅处理器', () => {
      const handler: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler);

      expect(bus.getSubscriberCount('agent1')).toBe(1);

      bus.unsubscribe('agent1', handler);
      expect(bus.getSubscriberCount('agent1')).toBe(0);
    });

    it('应只取消指定的处理器', () => {
      const handler1: MessageHandler = vi.fn();
      const handler2: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler1);
      bus.subscribe('agent1', handler2);

      bus.unsubscribe('agent1', handler1);

      expect(bus.getSubscriberCount('agent1')).toBe(1);
    });

    it('应优雅处理不存在的 agent', () => {
      const handler: MessageHandler = vi.fn();
      expect(() => bus.unsubscribe('non-existent', handler)).not.toThrow();
    });

    it('应删除没有处理器的 agent', () => {
      const handler: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler);
      expect(bus['handlers'].has('agent1')).toBe(true);

      bus.unsubscribe('agent1', handler);
      expect(bus['handlers'].has('agent1')).toBe(false);
    });
  });

  describe('getSubscriberCount', () => {
    it('应返回特定 agent 的订阅数', () => {
      const handler1: MessageHandler = vi.fn();
      const handler2: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler1);
      bus.subscribe('agent1', handler2);

      expect(bus.getSubscriberCount('agent1')).toBe(2);
    });

    it('应返回 0 对于不存在的 agent', () => {
      expect(bus.getSubscriberCount('non-existent')).toBe(0);
    });

    it('应返回所有 agent 的总订阅数', () => {
      const handler1: MessageHandler = vi.fn();
      const handler2: MessageHandler = vi.fn();
      const handler3: MessageHandler = vi.fn();

      bus.subscribe('agent1', handler1);
      bus.subscribe('agent1', handler2);
      bus.subscribe('agent2', handler3);

      expect(bus.getSubscriberCount()).toBe(3);
    });

    it('应返回 0 当没有订阅时', () => {
      expect(bus.getSubscriberCount()).toBe(0);
    });
  });

  describe('sendAndWait', () => {
    it('应在超时时返回 null', async () => {
      const response = await bus.sendAndWait(
        {
          from: 'agent1',
          to: 'agent2',
          sessionId: 'test',
          payload: { data: 'request' },
        },
        50
      );

      expect(response).toBeNull();
    }, 100);

    it('应使用自定义超时时间', async () => {
      const startTime = Date.now();
      await bus.sendAndWait(
        {
          from: 'agent1',
          to: 'agent2',
          sessionId: 'test',
          payload: { data: 'request' },
        },
        100
      );
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });

    it('应使用默认超时时间当未指定', async () => {
      // 创建一个短超时的 bus
      const shortBus = new MessageBus({ defaultTimeout: 50 });
      const startTime = Date.now();

      const response = await shortBus.sendAndWait({
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        payload: { data: 'request' },
      });

      const elapsed = Date.now() - startTime;

      expect(response).toBeNull();
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);

      shortBus.destroy();
    });

    it('应监听 message 事件以获取响应', async () => {
      // 验证 sendAndWait 会设置监听器
      let listenerAdded = false;

      const originalOn = bus.on.bind(bus);
      bus.on = function (event, _listener) {
        if (event === 'message') {
          listenerAdded = true;
        }
        return originalOn(event, _listener);
      };

      await bus.sendAndWait(
        {
          from: 'agent1',
          to: 'agent2',
          sessionId: 'test',
          payload: { data: 'request' },
        },
        10
      );

      expect(listenerAdded).toBe(true);
    });

    it('应支持并发调用 sendAndWait', async () => {
      // 验证多个 sendAndWait 调用不会互相干扰
      const promises = [
        bus.sendAndWait(
          {
            from: 'agent1',
            to: 'agent2',
            sessionId: 'test',
            payload: { data: 'request1' },
          },
          20
        ),
        bus.sendAndWait(
          {
            from: 'agent1',
            to: 'agent2',
            sessionId: 'test',
            payload: { data: 'request2' },
          },
          20
        ),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r === null)).toBe(true);
    });
  });

  describe('deliverTo - 私有方法测试', () => {
    it('应发出错误当没有处理器时', async () => {
      const errorHandler = vi.fn();
      bus.on('error', errorHandler);

      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await bus['deliverTo']('agent2', message);

      expect(errorHandler).toHaveBeenCalledWith({
        message,
        error: expect.any(Error),
      });
    });

    it('应调用所有处理器', async () => {
      const handler1: MessageHandler = vi.fn();
      const handler2: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler1);
      bus.subscribe('agent1', handler2);

      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent2',
        to: 'agent1',
        sessionId: 'test',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await bus['deliverTo']('agent1', message);

      expect(handler1).toHaveBeenCalledWith(message);
      expect(handler2).toHaveBeenCalledWith(message);
    });
  });

  describe('safeExecute - 私有方法测试', () => {
    it('应发出 message 事件当成功时', async () => {
      const messageHandler = vi.fn();
      bus.on('message', messageHandler);

      const handler: MessageHandler = vi.fn().mockResolvedValue(undefined);
      bus.subscribe('agent1', handler);

      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent2',
        to: 'agent1',
        sessionId: 'test',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await bus['safeExecute']('agent1', handler, message);

      expect(messageHandler).toHaveBeenCalledWith({
        agentId: 'agent1',
        message,
      });
    });

    it('应发出 error 事件当处理器失败时', async () => {
      const errorHandler = vi.fn();
      bus.on('error', errorHandler);

      const handler: MessageHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      bus.subscribe('agent1', handler);

      const message: Message = {
        id: 'msg1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'agent2',
        to: 'agent1',
        sessionId: 'test',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await bus['safeExecute']('agent1', handler, message);

      expect(errorHandler).toHaveBeenCalledWith({
        agentId: 'agent1',
        message,
        error: expect.any(Error),
      });
    });
  });

  describe('destroy', () => {
    it('应清理所有处理器', () => {
      const handler: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler);
      bus.subscribe('agent2', handler);

      expect(bus.getSubscriberCount()).toBe(2);

      bus.destroy();

      expect(bus.getSubscriberCount()).toBe(0);
    });

    it('应清理所有监听器', () => {
      const listener = vi.fn();
      bus.on('message', listener);
      bus.on('error', listener);
      bus.on('sent', listener);

      bus.destroy();

      expect(bus.listenerCount('message')).toBe(0);
      expect(bus.listenerCount('error')).toBe(0);
      expect(bus.listenerCount('sent')).toBe(0);
    });

    it('应清理 handlers Map', () => {
      const handler: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler);

      expect(bus['handlers'].size).toBe(1);

      bus.destroy();

      expect(bus['handlers'].size).toBe(0);
    });

    it('应可以安全地多次调用', () => {
      const handler: MessageHandler = vi.fn();
      bus.subscribe('agent1', handler);

      expect(() => {
        bus.destroy();
        bus.destroy();
        bus.destroy();
      }).not.toThrow();

      expect(bus.getSubscriberCount()).toBe(0);
    });
  });

  describe('generateId - 私有方法测试', () => {
    it('应生成唯一的 ID', () => {
      const id1 = bus['generateId']();
      const id2 = bus['generateId']();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it('应包含时间戳', () => {
      const before = Date.now();
      const id = bus['generateId']();
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('应包含随机部分', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(bus['generateId']());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('事件发出', () => {
    it('应在发送消息时发出 sent 事件', async () => {
      const sentHandler = vi.fn();
      bus.on('sent', sentHandler);

      await bus.send({
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        payload: { data: 'test' },
      });

      expect(sentHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'agent1',
          to: 'agent2',
        })
      );
    });

    it('应在消息传递时发出 message 事件', async () => {
      const messageHandler = vi.fn();
      bus.on('message', messageHandler);

      const handler: MessageHandler = vi.fn();
      bus.subscribe('agent2', handler);

      await bus.send({
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        payload: { data: 'test' },
      });

      expect(messageHandler).toHaveBeenCalled();
    });
  });

  describe('send - ACK 配置', () => {
    it('应使用默认 ACK 配置', async () => {
      const message = await bus.sendWithOptions({
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        payload: { data: 'test' },
      });

      expect(message.ack).toEqual({
        required: false, // 兼容旧 API，默认不需要 ACK
        timeout: 0,
        retry: 0,
      });
    });

    it('应合并自定义 ACK 配置', async () => {
      const message = await bus.sendWithOptions({
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        payload: { data: 'test' },
        ack: {
          required: true,
          timeout: 5000,
        },
      });

      expect(message.ack).toEqual({
        required: true,
        timeout: 5000,
        retry: 0, // 保留默认值
      });
    });

    it('应完全覆盖 ACK 配置', async () => {
      const message = await bus.sendWithOptions({
        from: 'agent1',
        to: 'agent2',
        sessionId: 'test',
        payload: { data: 'test' },
        ack: {
          required: true,
          timeout: 30000,
          retry: 3,
        },
      });

      expect(message.ack).toEqual({
        required: true,
        timeout: 30000,
        retry: 3,
      });
    });
  });
});
