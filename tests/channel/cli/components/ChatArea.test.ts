/**
 * ChatArea 组件测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChatArea } from '../../../../src/channel/cli/components/ChatArea.js';
import type { ChatMessage } from '../../../../src/channel/cli/CLIChannelTUI.js';

describe('ChatArea', () => {
  let chatArea: ChatArea;

  beforeEach(() => {
    chatArea = new ChatArea();
  });

  describe('基础功能', () => {
    it('应正确实现 Component 接口', () => {
      expect(chatArea.render).toBeDefined();
      expect(chatArea.invalidate).toBeDefined();
    });

    it('应正确初始化空状态', () => {
      const lines = chatArea.render(80);
      expect(lines).toEqual([]);
    });

    it('应实现 invalidate 方法', () => {
      expect(() => chatArea.invalidate()).not.toThrow();
    });
  });

  describe('addMessage', () => {
    it('应添加用户消息', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'Hello',
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('10:30');
      expect(lines[0]).toContain('你:');
      expect(lines[0]).toContain('Hello');
    });

    it('应添加 assistant 消息', () => {
      const message: ChatMessage = {
        role: 'assistant',
        userId: 'agent-1',
        content: 'Hi there!',
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('10:30');
      expect(lines[0]).toContain('agent-1:');
      expect(lines[0]).toContain('Hi there!');
    });

    it('应按时间顺序显示消息', () => {
      const msg1: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'First',
        timestamp: new Date('2024-01-01T10:00:00'),
      };

      const msg2: ChatMessage = {
        role: 'assistant',
        userId: 'agent-1',
        content: 'Second',
        timestamp: new Date('2024-01-01T10:05:00'),
      };

      chatArea.addMessage(msg1);
      chatArea.addMessage(msg2);

      const lines = chatArea.render(80);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('First');
      expect(lines[1]).toContain('Second');
    });

    it('应截断过长的消息内容', () => {
      const longContent = 'A'.repeat(100);
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: longContent,
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines[0]).toContain('...');
    });
  });

  describe('clear', () => {
    it('应清空所有消息', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      expect(chatArea.render(80)).toHaveLength(1);

      chatArea.clear();
      expect(chatArea.render(80)).toEqual([]);
    });
  });

  describe('scrollUp', () => {
    it('应向上滚动查看历史消息', () => {
      // 添加超过最大显示数量的消息
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(`2024-01-01T10:${i.toString().padStart(2, '0')}:00`),
        });
      }

      // 默认显示最后 20 条
      let lines = chatArea.render(80);
      expect(lines).toHaveLength(20);
      expect(lines[0]).toContain('Message 5'); // 第 5 条消息（0-24，显示 5-24）

      // 向上滚动
      chatArea.scrollUp();
      lines = chatArea.render(80);
      expect(lines).toHaveLength(20);
      expect(lines[0]).toContain('Message 4'); // 向上滚动一条
    });

    it('不应滚动到超过顶部', () => {
      for (let i = 0; i < 5; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(`2024-01-01T10:${i.toString().padStart(2, '0')}:00`),
        });
      }

      // 多次向上滚动
      for (let i = 0; i < 10; i++) {
        chatArea.scrollUp();
      }

      const lines = chatArea.render(80);
      // 应该能显示所有消息，但不应该崩溃
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('scrollDown', () => {
    it('应向下滚动回到最新消息', () => {
      // 添加 25 条消息
      for (let i = 0; i < 25; i++) {
        chatArea.addMessage({
          role: 'user',
          userId: 'cli-user',
          content: `Message ${i}`,
          timestamp: new Date(`2024-01-01T10:${i.toString().padStart(2, '0')}:00`),
        });
      }

      // 向上滚动
      chatArea.scrollUp();
      let lines = chatArea.render(80);
      expect(lines[0]).toContain('Message 4');

      // 向下滚动
      chatArea.scrollDown();
      lines = chatArea.render(80);
      expect(lines[0]).toContain('Message 5'); // 回到最后 20 条的起始位置
    });

    it('不应超过最新消息位置', () => {
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date('2024-01-01T10:30:00'),
      });

      // 多次向下滚动
      for (let i = 0; i < 10; i++) {
        chatArea.scrollDown();
      }

      const lines = chatArea.render(80);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Test');
    });
  });

  describe('时间戳格式', () => {
    it('应使用 HH:MM 格式显示时间', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date('2024-01-01T14:07:30'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines[0]).toContain('14:07');
    });

    it('应正确处理午夜时间', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'Midnight test',
        timestamp: new Date('2024-01-01T00:05:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines[0]).toContain('00:05');
    });

    it('应正确处理单数字小时和分钟', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date('2024-01-01T09:05:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines[0]).toContain('09:05');
    });
  });

  describe('render', () => {
    it('应根据宽度调整渲染', () => {
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test message',
        timestamp: new Date('2024-01-01T10:30:00'),
      });

      const narrowLines = chatArea.render(40);
      const wideLines = chatArea.render(100);

      expect(narrowLines[0].length).toBeLessThanOrEqual(40);
      expect(wideLines[0].length).toBeLessThanOrEqual(100);
    });

    it('应处理空宽度', () => {
      chatArea.addMessage({
        role: 'user',
        userId: 'cli-user',
        content: 'Test',
        timestamp: new Date('2024-01-01T10:30:00'),
      });

      const lines = chatArea.render(0);
      expect(Array.isArray(lines)).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应处理空内容消息', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: '',
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines).toHaveLength(1);
    });

    it('应处理特殊字符', () => {
      const message: ChatMessage = {
        role: 'user',
        userId: 'cli-user',
        content: 'Test with 中文 and émoji 🎉',
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      expect(lines[0]).toContain('中文');
      expect(lines[0]).toContain('🎉');
    });

    it('应处理多行内容', () => {
      const message: ChatMessage = {
        role: 'assistant',
        userId: 'agent-1',
        content: 'Line 1\nLine 2\nLine 3',
        timestamp: new Date('2024-01-01T10:30:00'),
      };

      chatArea.addMessage(message);
      const lines = chatArea.render(80);

      // 当前实现将多行内容合并为一行
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });
  });
});
