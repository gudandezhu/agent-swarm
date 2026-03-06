/**
 * SessionManager 测试 - 补充覆盖率
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../src/session/SessionManager.js';
import { JSONLSessionStore } from '../src/session/JSONLSessionStore.js';
import { createTempDir, cleanupTempDir } from './utils/index.js';

describe('SessionManager (补充测试)', () => {
  let manager: SessionManager;
  let store: JSONLSessionStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('session-manager-test');
    store = new JSONLSessionStore(tempDir);
    await store.init();
    manager = new SessionManager(store);
  });

  afterEach(async () => {
    await store.destroy();
    await cleanupTempDir(tempDir);
  });

  describe('reset', () => {
    it('应清空 Session 上下文', async () => {
      const session = await manager.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      // 添加一些上下文
      session.context.messages.push('msg1', 'msg2');
      session.context.variables.key1 = 'value1';

      await manager.reset(session.id);

      const resetSession = await manager.get(session.id);
      expect(resetSession?.context.messages).toEqual([]);
      expect(resetSession?.context.variables).toEqual({});
    });
  });

  describe('cleanup', () => {
    it('应清理过期 Session', async () => {
      // 创建一个 Session
      await manager.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      // cleanup 应该返回 0（没有过期 Session）
      const cleaned = await manager.cleanup();
      expect(cleaned).toBe(0);
    });
  });

  describe('stats', () => {
    it('应返回统计信息', async () => {
      // 创建多个 Session
      await manager.getOrCreate({ channelId: 'test', channelUserId: 'user1' });
      await manager.getOrCreate({ channelId: 'test', channelUserId: 'user2' });

      const stats = await manager.stats();

      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats.totalSessions).toBe(2); // 创建了 2 个 Session
    });
  });

  describe('touch', () => {
    it('应更新 Session 活跃时间', async () => {
      const session = await manager.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      const originalTime = session.lastActiveAt;

      // 等待确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.touch(session.id);

      const touchedSession = await manager.get(session.id);
      expect(touchedSession?.lastActiveAt).toBeGreaterThan(originalTime);
    });

    it('应优雅处理不存在的 Session', async () => {
      // 不应该抛出错误
      await manager.touch('non-existent-session');
    });
  });

  describe('get', () => {
    it('应返回 null 当 Session 不存在', async () => {
      const session = await manager.get('non-existent');
      expect(session).toBeNull();
    });
  });
});
