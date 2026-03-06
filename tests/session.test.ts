/**
 * JSONLSessionStore 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSONLSessionStore } from '../src/session/JSONLSessionStore.js';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import type { Message } from '../src/message/types.js';

describe('JSONLSessionStore', () => {
  const testPath = join(process.cwd(), 'test-sessions');
  let store: JSONLSessionStore;

  beforeEach(async () => {
    await mkdir(testPath, { recursive: true });
    store = new JSONLSessionStore(testPath);
    await store.init();
  });

  afterEach(async () => {
    await store.destroy();
    // 使用 rm -f 命令强制删除
    try {
      execSync(`rm -rf "${testPath}"`, { stdio: 'ignore' });
    } catch {
      // 忽略错误
    }
  });

  describe('getOrCreate', () => {
    it('应该创建新 Session', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      expect(session.id).toBe('test:user1');
      expect(session.channelId).toBe('test');
      expect(session.channelUserId).toBe('user1');
      expect(session.context.messages).toEqual([]);
      expect(session.context.variables).toEqual({});
    });

    it('应该复用已存在的 Session', async () => {
      const session1 = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      const session2 = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      expect(session1.id).toBe(session2.id);
    });

    it('应该支持群聊 Session', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
        conversationId: 'conv1',
        threadId: 'thread1',
      });

      expect(session.id).toBe('test:conv1:thread1:user1');
      expect(session.conversationId).toBe('conv1');
      expect(session.threadId).toBe('thread1');
    });
  });

  describe('addMessage', () => {
    const createMessage = (id: string, sessionId: string): Message => ({
      id,
      timestamp: Date.now(),
      version: '1.0',
      from: 'user',
      to: 'agent',
      sessionId,
      type: 'request',
      payload: { data: `Message ${id}` },
      ack: { required: true, timeout: 30000, retry: 3 },
    });

    it('应该添加消息到上下文', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      await store.addMessage(session.id, createMessage('msg1', session.id));
      await store.addMessage(session.id, createMessage('msg2', session.id));

      const updated = await store.load(session.id);
      expect(updated?.context.messages).toEqual(['msg1', 'msg2']);
    });

    it('应该限制上下文消息数量', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      // 添加超过限制的消息
      for (let i = 0; i < 25; i++) {
        await store.addMessage(session.id, createMessage(`msg${i}`, session.id));
      }

      const updated = await store.load(session.id);
      expect(updated?.context.messages.length).toBe(20);
      expect(updated?.context.messages[0]).toBe('msg5'); // 最早的消息被移除
    });
  });

  describe('variables', () => {
    it('应该能设置和获取变量', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      await store.setVariable(session.id, 'key1', 'value1');
      const value = await store.getVariable(session.id, 'key1');

      expect(value).toBe('value1');
    });

    it('应该能存储复杂对象', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      const obj = { foo: 'bar', num: 42 };
      await store.setVariable(session.id, 'complex', obj);

      const value = await store.getVariable(session.id, 'complex');
      expect(value).toEqual(obj);
    });
  });

  describe('agentStates', () => {
    it('应该能保存 Agent 状态', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      await store.saveAgentState(session.id, 'agent-1', { count: 5 });
      const state = await store.getAgentState(session.id, 'agent-1');

      expect(state).toEqual({ count: 5 });
    });

    it('应该支持多个 Agent 状态', async () => {
      const session = await store.getOrCreate({
        channelId: 'test',
        channelUserId: 'user1',
      });

      await store.saveAgentState(session.id, 'agent-1', { count: 5 });
      await store.saveAgentState(session.id, 'agent-2', { count: 10 });

      const state1 = await store.getAgentState(session.id, 'agent-1');
      const state2 = await store.getAgentState(session.id, 'agent-2');

      expect(state1).toEqual({ count: 5 });
      expect(state2).toEqual({ count: 10 });
    });
  });
});
