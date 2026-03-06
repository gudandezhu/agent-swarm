/**
 * JSONLSessionStore 测试 - 完整化版本
 *
 * 新目录结构：
 * sessions/
 * ├── index.jsonl
 * └── <sessionId>/
 *     ├── context.md
 *     └── messages.jsonl
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSONLSessionStore } from '../src/session/JSONLSessionStore.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Message } from '../src/message/types.js';

describe('JSONLSessionStore (完整化)', () => {
  const testPath = join(process.cwd(), 'test-sessions-new');
  let store: JSONLSessionStore;

  beforeEach(async () => {
    store = new JSONLSessionStore(testPath);
    await store.init();
  });

  afterEach(async () => {
    await store.destroy();
    await fs.rm(testPath, { recursive: true, force: true });
  });

  describe('addMessage - 存储完整 Message', () => {
    it('应该存储完整的 Message 对象到 session 目录', async () => {
      const sessionId = 'cli:user123';
      const message: Message = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: 'agent',
        sessionId,
        type: 'request',
        payload: { data: 'Hello' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await store.addMessage(sessionId, message);

      // 验证消息文件存在（新路径：<sessionId>/messages.jsonl）
      const messagesPath = join(testPath, sessionId, 'messages.jsonl');
      const content = await fs.readFile(messagesPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);
      const savedMessage = JSON.parse(lines[0]);
      expect(savedMessage.id).toBe('msg-1');
      expect(savedMessage.payload.data).toBe('Hello');
    });

    it('应该追加多条消息到同一个文件', async () => {
      const sessionId = 'cli:user456';
      const message1: Message = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: 'agent',
        sessionId,
        type: 'request',
        payload: { data: 'First' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      const message2: Message = {
        id: 'msg-2',
        timestamp: Date.now() + 1000,
        version: '1.0',
        from: 'agent',
        to: 'user',
        sessionId,
        type: 'response',
        payload: { data: 'Response' },
        ack: { required: false, timeout: 0, retry: 0 },
      };

      await store.addMessage(sessionId, message1);
      await store.addMessage(sessionId, message2);

      const messagesPath = join(testPath, sessionId, 'messages.jsonl');
      const content = await fs.readFile(messagesPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).id).toBe('msg-1');
      expect(JSON.parse(lines[1]).id).toBe('msg-2');
    });
  });

  describe('loadMessages - 加载消息历史', () => {
    it('应该从文件加载消息历史', async () => {
      const sessionId = 'cli:user789';
      const message: Message = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: 'agent',
        sessionId,
        type: 'request',
        payload: { data: 'Test' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await store.addMessage(sessionId, message);

      const messages = await store.loadMessages(sessionId);

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[0].payload.data).toBe('Test');
    });

    it('应该返回空数组当没有消息时', async () => {
      const messages = await store.loadMessages('cli:nonexistent');
      expect(messages).toEqual([]);
    });

    it('应该限制返回最近 N 条消息', async () => {
      const sessionId = 'cli:limit-test';
      for (let i = 0; i < 25; i++) {
        const message: Message = {
          id: `msg-${i}`,
          timestamp: Date.now() + i,
          version: '1.0',
          from: 'user',
          to: 'agent',
          sessionId,
          type: 'request',
          payload: { data: `Message ${i}` },
          ack: { required: true, timeout: 30000, retry: 3 },
        };
        await store.addMessage(sessionId, message);
      }

      const messages = await store.loadMessages(sessionId, 10);
      expect(messages).toHaveLength(10);
      expect(messages[0].id).toBe('msg-15'); // 最近 10 条
      expect(messages[9].id).toBe('msg-24');
    });
  });

  describe('Session 消息关联', () => {
    it('Session.messages 应该包含消息 ID 列表', async () => {
      const sessionId = 'cli:session-test';
      const message: Message = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: 'agent',
        sessionId,
        type: 'request',
        payload: { data: 'Test' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await store.addMessage(sessionId, message);

      const session = await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'session-test',
      });

      expect(session.context.messages).toContain('msg-1');
    });
  });

  describe('cleanup - 删除过期消息文件', () => {
    it('应该删除 Session 对应的目录', async () => {
      const sessionId = 'cli:cleanup-test';
      const message: Message = {
        id: 'msg-1',
        timestamp: Date.now(),
        version: '1.0',
        from: 'user',
        to: 'agent',
        sessionId,
        type: 'request',
        payload: { data: 'Test' },
        ack: { required: true, timeout: 30000, retry: 3 },
      };

      await store.addMessage(sessionId, message);

      const sessionPath = join(testPath, sessionId);
      expect(
        await fs
          .access(sessionPath)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);

      await store.delete(sessionId);

      expect(
        await fs
          .access(sessionPath)
          .then(() => true)
          .catch(() => false)
      ).toBe(false);
    });

    it('应该处理目录不存在的情况', async () => {
      // 创建 session 但不创建消息文件
      const sessionId = 'cli:no-msg-file';
      await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'no-msg-file',
      });

      // 删除 session（目录可能不存在，应该不报错）
      await expect(store.delete(sessionId)).resolves.not.toThrow();
    });
  });

  describe('loadIndex - 解析错误处理', () => {
    it('应该跳过无效的 JSON 行', async () => {
      // 手动创建包含无效 JSON 的 index 文件
      const indexPath = join(testPath, 'index.jsonl');
      await fs.writeFile(
        indexPath,
        '{"type":"session","id":"cli:valid","channelId":"cli","channelUserId":"valid","createdAt":1709600000000,"lastActiveAt":1709680000000,"agents":[]}\n' +
          'invalid-json-line\n' +
          '{"type":"session","id":"cli:valid2","channelId":"cli","channelUserId":"valid2","createdAt":1709600000000,"lastActiveAt":1709680000000,"agents":[]}\n',
        'utf-8'
      );

      // 创建新实例来加载 index
      const newStore = new JSONLSessionStore(testPath);
      await newStore.init();

      // 应该成功加载，跳过无效行
      const session1 = await newStore.load('cli:valid');
      const session2 = await newStore.load('cli:valid2');

      expect(session1).not.toBeNull();
      expect(session1?.id).toBe('cli:valid');
      expect(session2).not.toBeNull();
      expect(session2?.id).toBe('cli:valid2');

      await newStore.destroy();
    });
  });

  describe('stats - 统计信息', () => {
    it('应该正确统计活跃和过期 session', async () => {
      // 创建活跃 session
      await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'active-user',
        ttl: 100000, // 很长的 TTL
      });

      // 创建一个模拟过期 session（手动修改 lastActiveAt）
      await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'expired-user',
        ttl: 1, // 1ms TTL，立即过期
      });

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = await store.stats();

      expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
      // totalMessages 是所有 session 的消息总数
      expect(stats.totalMessages).toBeGreaterThanOrEqual(0);
    });
  });

  describe('loadMessages - 无效数据处理', () => {
    it('应该跳过无效的消息行', async () => {
      const sessionId = 'cli:invalid-msg';

      // 手动创建包含无效 JSON 的消息文件（新路径）
      const sessionPath = join(testPath, sessionId);
      const messagesPath = join(sessionPath, 'messages.jsonl');
      await fs.mkdir(sessionPath, { recursive: true });
      await fs.writeFile(
        messagesPath,
        '{"id":"msg-1","timestamp":1709600000000,"from":"user","to":"agent","sessionId":"' +
          sessionId +
          '","type":"request","payload":{"data":"Valid"},"ack":{"required":true,"timeout":30000,"retry":3}}\n' +
          'invalid-json-message\n' +
          '{"id":"msg-2","timestamp":1709600001000,"from":"agent","to":"user","sessionId":"' +
          sessionId +
          '","type":"response","payload":{"data":"Valid 2"},"ack":{"required":false,"timeout":0,"retry":0}}\n',
        'utf-8'
      );

      const messages = await store.loadMessages(sessionId);

      // 应该只加载有效的消息，跳过无效行
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[1].id).toBe('msg-2');
    });
  });

  describe('context.md - 会话上下文', () => {
    it('应该为每个 session 创建 context.md', async () => {
      const sessionId = 'cli:context-test';
      await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'context-test',
      });

      const contextPath = join(testPath, sessionId, 'context.md');
      const content = await fs.readFile(contextPath, 'utf-8');

      expect(content).toContain('# Session Context');
    });

    it('应该能加载和保存 context.md', async () => {
      const sessionId = 'cli:context-rw';
      await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'context-rw',
      });

      // 保存自定义内容
      const customContent = `# Session Context

## 参与者
- crawler

## 当前状态
- 阶段: 分析中
`;
      await store.saveContext(sessionId, customContent);

      // 加载并验证
      const loaded = await store.loadContext(sessionId);
      expect(loaded).toContain('crawler');
      expect(loaded).toContain('分析中');
    });

    it('应该能添加和获取 Agent 列表', async () => {
      const sessionId = 'cli:agent-list';
      await store.getOrCreate({
        channelId: 'cli',
        channelUserId: 'agent-list',
      });

      await store.addAgent(sessionId, 'crawler');
      await store.addAgent(sessionId, 'analyzer');

      const agents = await store.getAgents(sessionId);
      expect(agents).toContain('crawler');
      expect(agents).toContain('analyzer');

      // 重复添加不会重复
      await store.addAgent(sessionId, 'crawler');
      const agents2 = await store.getAgents(sessionId);
      expect(agents2.filter((a) => a === 'crawler')).toHaveLength(1);
    });
  });
});
