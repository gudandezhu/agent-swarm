/**
 * DingTalkRetryManager 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  DingTalkRetryManager,
  type RetryManagerConfig,
} from '../src/channel/DingTalkRetryManager.js';
import type { OutgoingMessage } from '../src/channel/types.js';

describe('DingTalkRetryManager', () => {
  let manager: DingTalkRetryManager;
  let tempDir: string;
  let sendMock: ReturnType<typeof vi.fn>;
  let config: RetryManagerConfig;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `dingtalk-retry-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    sendMock = vi.fn().mockResolvedValue(undefined);

    config = {
      basePath: tempDir,
      maxRetries: 3,
      initialRetryDelay: 100,
      backoffFactor: 2,
      sender: sendMock,
    };

    manager = new DingTalkRetryManager(config);
    await manager.init();

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await manager.destroy();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应成功初始化', async () => {
      const stats = manager.getStats();
      expect(stats.pending).toBe(0);
    });
  });

  describe('send()', () => {
    it('应成功发送消息', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const result = await manager.send(message);

      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('应在失败时加入重试队列', async () => {
      sendMock.mockRejectedValueOnce(new Error('Network error'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const result = await manager.send(message);

      expect(result.success).toBe(false);
      expect(result.status).toBe('queued');

      const stats = manager.getStats();
      expect(stats.retrying).toBe(1);
    });

    it('应在幂等性检查通过时直接返回成功', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      // 第一次发送
      await manager.send(message, 'msg-001');

      // 重置 mock
      sendMock.mockClear();

      // 第二次发送相同 ID
      const result = await manager.send(message, 'msg-001');

      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      // 不应再次调用 sender
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('重试调度', () => {
    it('应在启动后处理重试队列', async () => {
      sendMock.mockRejectedValueOnce(new Error('Network error'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      // 发送失败
      await manager.send(message, 'msg-001');

      // 启动调度器
      manager.start({ interval: 50 });

      // 等待重试处理
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 验证重试被调用
      expect(sendMock.mock.calls.length).toBeGreaterThan(1);

      manager.stop();
    });

    it('stop() 应停止调度器', async () => {
      manager.start({ interval: 50 });
      expect(manager.isRunning()).toBe(true);

      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });
  });

  describe('死信队列', () => {
    it('应在超过最大重试次数后移到死信队列', async () => {
      sendMock.mockRejectedValue(new Error('Permanent error'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      // 发送失败
      await manager.send(message, 'msg-001');

      // 启动调度器并等待足够长时间以触发最大重试
      manager.start({ interval: 50 });

      // 等待多次重试
      await new Promise((resolve) => setTimeout(resolve, 500));

      const deadLetters = manager.getDeadLetters();
      expect(deadLetters.length).toBe(1);
      expect(deadLetters[0].messageId).toBe('msg-001');

      manager.stop();
    });

    it('getDeadLetters() 应返回死信队列', async () => {
      const deadLetters = manager.getDeadLetters();
      expect(deadLetters).toEqual([]);
    });

    it('getDeadLetters(limit) 应限制返回数量', async () => {
      sendMock.mockRejectedValue(new Error('Permanent error'));

      // 发送多条消息
      for (let i = 0; i < 5; i++) {
        await manager.send(
          {
            channelId: 'dingtalk',
            userId: `user${i}`,
            content: `Message ${i}`,
          },
          `msg-${i}`
        );
      }

      // 启动调度器并等待
      manager.start({ interval: 50 });
      await new Promise((resolve) => setTimeout(resolve, 500));

      const deadLetters = manager.getDeadLetters(2);
      expect(deadLetters.length).toBe(2);

      manager.stop();
    });
  });

  describe('redeliver()', () => {
    it('应重新发送死信消息', async () => {
      sendMock.mockRejectedValue(new Error('Permanent error'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      // 发送失败
      await manager.send(message, 'msg-001');

      // 启动调度器触发死信
      manager.start({ interval: 50 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      manager.stop();

      // 确认死信队列有消息
      let deadLetters = manager.getDeadLetters();
      expect(deadLetters.length).toBeGreaterThanOrEqual(1);

      // 重置 mock 以便重发成功
      sendMock.mockClear();
      sendMock.mockResolvedValue(undefined);

      // 重新发送
      const result = await manager.redeliver('msg-001');

      expect(result.success).toBe(true);
    });

    it('不存在的消息应返回失败', async () => {
      const result = await manager.redeliver('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getStats()', () => {
    it('应返回正确的统计信息', async () => {
      const stats = manager.getStats();

      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(0);
      expect(stats.deadLetter).toBe(0);
      expect(stats.totalSent).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });

    it('应更新发送成功统计', async () => {
      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      await manager.send(message);

      const stats = manager.getStats();
      expect(stats.totalSent).toBe(1);
    });
  });

  describe('错误处理', () => {
    it('网络错误应可重试', async () => {
      sendMock.mockRejectedValueOnce(new Error('Network error'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const result = await manager.send(message);

      expect(result.status).toBe('queued');
    });

    it('超时错误应可重试', async () => {
      sendMock.mockRejectedValueOnce(new Error('Request timeout'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const result = await manager.send(message);

      expect(result.status).toBe('queued');
    });

    it('5xx 错误应可重试', async () => {
      sendMock.mockRejectedValueOnce(new Error('Server error: 503'));

      const message: OutgoingMessage = {
        channelId: 'dingtalk',
        userId: 'user123',
        content: 'Hello',
      };

      const result = await manager.send(message);

      expect(result.status).toBe('queued');
    });
  });
});
