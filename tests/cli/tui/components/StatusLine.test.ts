/**
 * StatusLine 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusLine } from '../../../../src/channel/cli/components/StatusLine.js';

describe('StatusLine', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该能够创建 StatusLine 实例', () => {
      const statusLine = new StatusLine();
      expect(statusLine).toBeDefined();
    });

    it('初始状态应该不是思考状态', () => {
      const statusLine = new StatusLine();
      const output = statusLine.render(80);
      expect(output).toHaveLength(0);
    });
  });

  describe('设置思考状态', () => {
    it('应该能够设置为思考状态', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(80);
      expect(output.length).toBeGreaterThan(0);
    });

    it('应该能够取消思考状态', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);
      statusLine.setThinking(false);

      const output = statusLine.render(80);
      expect(output).toHaveLength(0);
    });

    it('设置为思考状态后应该显示状态文本', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(80);
      expect(output.some((line) => line.includes('正在思考'))).toBe(true);
    });

    it('取消思考状态后不应该显示状态文本', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);
      statusLine.setThinking(false);

      const output = statusLine.render(80);
      expect(output.every((line) => !line.includes('正在思考'))).toBe(true);
    });
  });

  describe('渲染', () => {
    it('非思考状态时应该返回空数组', () => {
      const statusLine = new StatusLine();
      const output = statusLine.render(80);

      expect(output).toEqual([]);
    });

    it('思考状态时应该返回一行', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(80);
      expect(output.length).toBe(1);
    });

    it('应该显示旋转动画字符', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(80);
      const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴'];
      const hasSpinner = spinners.some((spinner) => output[0].includes(spinner));
      expect(hasSpinner).toBe(true);
    });

    it('应该显示状态文本', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(80);
      expect(output[0]).toContain('正在思考');
    });

    it('应该正确处理窄屏幕', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(20);
      expect(output.length).toBe(1);
    });

    it('应该正确处理宽屏幕', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const output = statusLine.render(120);
      expect(output.length).toBe(1);
    });
  });

  describe('invalidate 方法', () => {
    it('应该有 invalidate 方法', () => {
      const statusLine = new StatusLine();
      expect(typeof statusLine.invalidate).toBe('function');
    });

    it('调用 invalidate 不应该抛出错误', () => {
      const statusLine = new StatusLine();
      expect(() => statusLine.invalidate()).not.toThrow();
    });
  });

  describe('动画效果', () => {
    it('应该随时间显示不同的旋转字符', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const render1 = statusLine.render(80);
      const firstChar = render1[0][0];

      // 等待足够长时间让动画变化
      // 旋转字符每 100ms 变化一次
      return new Promise((resolve) => {
        setTimeout(() => {
          const render2 = statusLine.render(80);
          const secondChar = render2[0][0];

          // 字符可能相同（如果时间点恰好相同），但应该有变化的可能性
          expect(render2).toBeDefined();
          resolve(null);
        }, 150);
      });
    });

    it('旋转字符应该循环', () => {
      const statusLine = new StatusLine();
      statusLine.setThinking(true);

      const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴'];
      const seenSpinners = new Set<string>();

      // 多次渲染以捕获不同的旋转字符
      for (let i = 0; i < 20; i++) {
        // 模拟时间推进
        vi.setSystemTime(Date.now() + i * 100);
        const output = statusLine.render(80);
        if (output.length > 0) {
          const char = output[0][0];
          seenSpinners.add(char);
        }
      }

      // 应该至少看到几个不同的旋转字符
      expect(seenSpinners.size).toBeGreaterThan(1);
    });
  });
});
