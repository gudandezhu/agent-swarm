/**
 * 测试工具函数测试
 */

import { describe, it, expect } from 'vitest';
import { sleep, createTempDir, cleanupTempDir, waitFor, createMockMessage } from './utils/index.js';
import { promises as fs } from 'fs';

describe('测试工具函数', () => {
  describe('sleep', () => {
    it('应等待指定时间', async () => {
      const start = performance.now();
      await sleep(50);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('createTempDir', () => {
    it('应创建临时目录', async () => {
      const tmpDir = await createTempDir('test');
      expect(tmpDir).toContain('agent-swarm-test-test-');

      // 验证目录存在
      const stat = await fs.stat(tmpDir);
      expect(stat.isDirectory()).toBe(true);

      // 清理
      await cleanupTempDir(tmpDir);
    });
  });

  describe('cleanupTempDir', () => {
    it('应删除目录', async () => {
      const tmpDir = await createTempDir('cleanup-test');

      await cleanupTempDir(tmpDir);

      // 验证目录已删除
      const exists = await fs
        .access(tmpDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('应优雅处理不存在的目录', async () => {
      // 不应该抛出错误
      await cleanupTempDir('/non-existent/path');
    });
  });

  describe('waitFor', () => {
    it('应等待条件满足', async () => {
      let value = false;
      setTimeout(() => {
        value = true;
      }, 50);

      await waitFor(() => value);
      expect(value).toBe(true);
    });

    it('应在超时时抛出错误', async () => {
      await expect(waitFor(() => false, 100, 10)).rejects.toThrow('条件未在 100ms 内满足');
    });
  });

  describe('createMockMessage', () => {
    it('应创建包含默认字段的 Mock Message', () => {
      const msg = createMockMessage();

      expect(msg.id).toMatch(/^msg-[a-f0-9]{16}$/);
      expect(msg.version).toBe('1.0');
      expect(msg.from).toBe('test-sender');
      expect(msg.to).toBe('test-receiver');
      expect(msg.sessionId).toBe('test-session');
      expect(msg.type).toBe('request');
      expect(msg.payload).toEqual({ data: 'test' });
      expect(msg.ack).toEqual({ required: false, timeout: 0, retry: 0 });
    });

    it('应支持覆盖字段', () => {
      const msg = createMockMessage({
        from: 'custom-sender',
        to: 'custom-receiver',
        type: 'response',
      });

      expect(msg.from).toBe('custom-sender');
      expect(msg.to).toBe('custom-receiver');
      expect(msg.type).toBe('response');
    });

    it('应生成唯一 ID', () => {
      const msg1 = createMockMessage();
      const msg2 = createMockMessage();

      expect(msg1.id).not.toBe(msg2.id);
    });
  });
});
