/**
 * ACKTracker 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ACKTracker } from '../src/message/ACKTracker.js';
import type { Message } from '../src/message/types.js';

describe('ACKTracker', () => {
  let tracker: ACKTracker;

  beforeEach(() => {
    tracker = new ACKTracker();
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('waitForACK', () => {
    it('应该在所有接收者确认后返回 true', async () => {
      const message: Message = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1', 'agent-2'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      const promise = tracker.waitForACK(message, async () => false);

      // 确认所有接收者
      tracker.confirm('msg-1', 'agent-1');
      tracker.confirm('msg-1', 'agent-2');

      const result = await promise;
      expect(result).toBe(true);
    });

    it('应该在超时后返回 false', async () => {
      const message: Message = {
        id: 'msg-2',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 100, retry: 0 },
      };

      const result = await tracker.waitForACK(message, async () => false);
      expect(result).toBe(false);
    });

    it('应该在超时时调用 onTimeout 回调', async () => {
      const message: Message = {
        id: 'msg-3',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 100, retry: 0 },
      };

      const onTimeout = vi.fn().mockResolvedValue(false);
      await tracker.waitForACK(message, onTimeout);

      expect(onTimeout).toHaveBeenCalledWith(message, 1);
    });

    it('应该在重试次数内重试', async () => {
      const message: Message = {
        id: 'msg-4',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 100, retry: 2 },
      };

      let retryCount = 0;
      const onTimeout = vi.fn().mockImplementation(async () => {
        retryCount++;
        return retryCount < 2; // 第一次返回 true 重试，第二次返回 false 放弃
      });

      await tracker.waitForACK(message, onTimeout);

      expect(onTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('confirm', () => {
    it('应该从待确认列表中移除接收者', async () => {
      const message: Message = {
        id: 'msg-5',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1', 'agent-2'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      tracker.waitForACK(message, async () => false);

      let status = tracker.getStatus('msg-5');
      expect(status?.recipients).toEqual(['agent-1', 'agent-2']);

      tracker.confirm('msg-5', 'agent-1');

      status = tracker.getStatus('msg-5');
      expect(status?.recipients).toEqual(['agent-2']);
    });

    it('应该标记所有接收者确认后为 confirmed', async () => {
      const message: Message = {
        id: 'msg-6',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1', 'agent-2'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      tracker.waitForACK(message, async () => false);

      tracker.confirm('msg-6', 'agent-1');
      tracker.confirm('msg-6', 'agent-2');

      const status = tracker.getStatus('msg-6');
      expect(status?.confirmed).toBe(true);
      expect(status?.confirmedAt).toBeDefined();
    });

    it('应该忽略不存在的消息 ID', () => {
      // 不应该抛出错误
      expect(() => tracker.confirm('non-existent', 'agent-1')).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('应该返回消息状态', async () => {
      const message: Message = {
        id: 'msg-7',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1', 'agent-2'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      tracker.waitForACK(message, async () => false);

      const status = tracker.getStatus('msg-7');
      expect(status).toBeDefined();
      expect(status?.messageId).toBe('msg-7');
      expect(status?.confirmed).toBe(false);
      expect(status?.recipients).toEqual(['agent-1', 'agent-2']);
    });

    it('应该返回 undefined 当消息不存在', () => {
      const status = tracker.getStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });

  describe('getPending', () => {
    it('应该返回所有待确认消息', async () => {
      const message1: Message = {
        id: 'msg-8',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      const message2: Message = {
        id: 'msg-9',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-2'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      tracker.waitForACK(message1, async () => false);
      tracker.waitForACK(message2, async () => false);

      const pending = tracker.getPending();
      expect(pending).toHaveLength(2);
      expect(pending[0].messageId).toBe('msg-8');
      expect(pending[1].messageId).toBe('msg-9');
    });

    it('应该返回空数组当没有待确认消息', () => {
      const pending = tracker.getPending();
      expect(pending).toEqual([]);
    });
  });

  describe('destroy', () => {
    it('应该清除所有定时器和缓存', async () => {
      const message: Message = {
        id: 'msg-10',
        timestamp: Date.now(),
        version: '1.0',
        from: 'sender',
        to: ['agent-1'],
        sessionId: 'test-session',
        type: 'request',
        payload: { data: 'test' },
        ack: { required: true, timeout: 5000, retry: 3 },
      };

      tracker.waitForACK(message, async () => false);

      tracker.destroy();

      const pending = tracker.getPending();
      expect(pending).toEqual([]);
    });
  });
});
