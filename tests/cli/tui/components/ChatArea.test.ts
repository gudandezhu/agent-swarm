/**
 * ChatArea 组件测试
 */

import { describe, it, expect } from 'vitest';
import { ChatArea } from '../../../../src/channel/cli/components/ChatArea.js';

describe('ChatArea', () => {
  describe('初始化', () => {
    it('应该能够创建 ChatArea 实例', () => {
      const chatArea = new ChatArea();
      expect(chatArea).toBeDefined();
    });

    it('初始状态应该为失效状态', () => {
      const chatArea = new ChatArea();
      expect(chatArea.invalidated).toBe(true);
    });

    it('初始消息列表应该为空', () => {
      const chatArea = new ChatArea();
      chatArea['messages'] = [];
      const output = chatArea.render(80);
      expect(output).toHaveLength(0);
    });
  });

  describe('添加消息', () => {
    it('应该能够添加用户消息', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Hello',
        timestamp: new Date(),
      });

      const agents = chatArea['messages'];
      expect(agents).toHaveLength(1);
      expect(agents[0].role).toBe('user');
      expect(agents[0].content).toBe('Hello');
    });

    it('应该能够添加助手消息', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'assistant',
        userId: 'agent-1',
        content: 'Hi there!',
        timestamp: new Date(),
      });

      const messages = chatArea['messages'];
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Hi there!');
    });

    it('添加消息后应该标记为失效', () => {
      const chatArea = new ChatArea();
      // 先重置失效状态
      chatArea.render(80);
      expect(chatArea.invalidated).toBe(false);

      // 添加消息
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date(),
      });

      expect(chatArea.invalidated).toBe(true);
    });

    it('应该能够添加多条消息', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'First',
        timestamp: new Date(),
      });
      chatArea.addMessage({
        role: 'assistant',
        userId: 'agent-1',
        content: 'Second',
        timestamp: new Date(),
      });

      const messages = chatArea['messages'];
      expect(messages).toHaveLength(2);
    });
  });

  describe('清空消息', () => {
    it('应该能够清空所有消息', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date(),
      });

      chatArea.clear();
      const messages = chatArea['messages'];
      expect(messages).toHaveLength(0);
    });

    it('清空消息后应该重置滚动偏移', () => {
      const chatArea = new ChatArea();
      // 添加超过 maxVisible 的消息以触发滚动
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }
      chatArea.scrollUp();

      expect(chatArea['scrollOffset']).toBeGreaterThan(0);

      chatArea.clear();
      expect(chatArea['scrollOffset']).toBe(0);
    });

    it('清空消息后应该标记为失效', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date(),
      });
      chatArea.render(80);
      expect(chatArea.invalidated).toBe(false);

      chatArea.clear();
      expect(chatArea.invalidated).toBe(true);
    });
  });

  describe('滚动功能', () => {
    it('应该能够向上滚动', () => {
      const chatArea = new ChatArea();
      // 添加足够多的消息
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const beforeOffset = chatArea['scrollOffset'];
      chatArea.scrollUp();
      const afterOffset = chatArea['scrollOffset'];

      expect(afterOffset).toBeGreaterThan(beforeOffset);
    });

    it('应该能够向下滚动', () => {
      const chatArea = new ChatArea();
      // 添加足够多的消息并向上滚动
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }
      chatArea.scrollUp();

      const beforeOffset = chatArea['scrollOffset'];
      chatArea.scrollDown();
      const afterOffset = chatArea['scrollOffset'];

      expect(afterOffset).toBeLessThan(beforeOffset);
    });

    it('滚动后应该标记为失效', () => {
      const chatArea = new ChatArea();
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }
      chatArea.render(80);
      expect(chatArea.invalidated).toBe(false);

      chatArea.scrollUp();
      expect(chatArea.invalidated).toBe(true);
    });

    it('向上滚动到顶部时应该停止', () => {
      const chatArea = new ChatArea();
      // 添加消息并滚动到顶部
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      // 尝试滚动超过限制
      for (let i = 0; i < 100; i++) {
        chatArea.scrollUp();
      }

      // 应该停止在某个点而不是无限增长
      expect(chatArea['scrollOffset']).toBeLessThan(100);
    });

    it('向下滚动到底部时应该停止', () => {
      const chatArea = new ChatArea();
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }
      chatArea.scrollUp();

      // 尝试滚动超过限制
      for (let i = 0; i < 100; i++) {
        chatArea.scrollDown();
      }

      expect(chatArea['scrollOffset']).toBe(0);
    });
  });

  describe('渲染', () => {
    it('空消息时应该返回空数组', () => {
      const chatArea = new ChatArea();
      const output = chatArea.render(80);

      expect(output).toHaveLength(0);
    });

    it('应该渲染用户消息', () => {
      const chatArea = new ChatArea();
      const testTime = new Date('2026-03-07T12:00:00');
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Hello World',
        timestamp: testTime,
      });

      const output = chatArea.render(80);
      expect(output.length).toBeGreaterThan(0);
      expect(output.some((line) => line.includes('Hello World'))).toBe(true);
      expect(output.some((line) => line.includes('你:'))).toBe(true);
    });

    it('应该渲染助手消息', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'assistant',
        userId: 'test-agent',
        content: 'Response',
        timestamp: new Date(),
      });

      const output = chatArea.render(80);
      expect(output.some((line) => line.includes('test-agent:'))).toBe(true);
    });

    it('应该渲染时间戳', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date('2026-03-07T12:30:00'),
      });

      const output = chatArea.render(80);
      // 时间戳格式为 HH:MM
      expect(output.some((line) => line.includes('12:30'))).toBe(true);
    });

    it('应该截断过长的内容', () => {
      const chatArea = new ChatArea();
      const longContent = 'A'.repeat(200);
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: longContent,
        timestamp: new Date(),
      });

      const output = chatArea.render(80);
      // 应该被截断并包含省略号
      expect(output.some((line) => line.includes('...'))).toBe(true);
    });

    it('应该限制可见消息数量', () => {
      const chatArea = new ChatArea();
      // 添加超过 maxVisible (20) 的消息
      for (let i = 0; i < 30; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const output = chatArea.render(80);
      // 应该只显示最后 20 条消息
      expect(output.length).toBeLessThanOrEqual(20);
    });

    it('渲染后应该重置失效状态', () => {
      const chatArea = new ChatArea();
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date(),
      });

      expect(chatArea.invalidated).toBe(true);
      chatArea.render(80);
      expect(chatArea.invalidated).toBe(false);
    });
  });

  describe('invalidate 方法', () => {
    it('应该有 invalidate 方法', () => {
      const chatArea = new ChatArea();
      expect(typeof chatArea.invalidate).toBe('function');
    });

    it('调用 invalidate 不应该抛出错误', () => {
      const chatArea = new ChatArea();
      expect(() => chatArea.invalidate()).not.toThrow();
    });

    it('调用 invalidate 后应该标记为失效', () => {
      const chatArea = new ChatArea();
      chatArea.render(80);
      expect(chatArea.invalidated).toBe(false);

      chatArea.invalidate();
      expect(chatArea.invalidated).toBe(true);
    });
  });
});
