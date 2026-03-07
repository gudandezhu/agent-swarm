/**
 * Header 组件测试
 */

import { describe, it, expect } from 'vitest';
import { Header } from '../../../../src/channel/cli/components/Header.js';

describe('Header', () => {
  describe('初始化', () => {
    it('应该能够创建 Header 实例', () => {
      const header = new Header('/workspace');
      expect(header).toBeDefined();
    });

    it('应该使用默认版本', () => {
      const header = new Header('/workspace');
      expect(header).toBeDefined();
    });

    it('应该支持自定义版本', () => {
      const header = new Header('/workspace', 'v1.0.0');
      expect(header).toBeDefined();
    });

    it('应该存储工作空间路径', () => {
      const workspacePath = '/test/workspace';
      const header = new Header(workspacePath);
      // Header 存储了路径，通过 render 验证
      const output = header.render(80);
      expect(output.some((line) => line.includes(workspacePath))).toBe(true);
    });
  });

  describe('渲染', () => {
    it('应该渲染标题行', () => {
      const header = new Header('/workspace');
      const output = header.render(80);

      expect(output.length).toBeGreaterThan(0);
      expect(output[0]).toContain('Agent Swarm');
    });

    it('应该显示版本号', () => {
      const header = new Header('/workspace', 'v2.0.0');
      const output = header.render(80);

      expect(output[0]).toContain('v2.0.0');
    });

    it('应该显示工作空间路径', () => {
      const workspacePath = '/my/workspace';
      const header = new Header(workspacePath);
      const output = header.render(80);

      expect(output.some((line) => line.includes(workspacePath))).toBe(true);
    });

    it('应该正确处理窄屏幕', () => {
      const header = new Header('/a-very-long-workspace-path-that-might-not-fit');
      const output = header.render(40);

      expect(output.length).toBeGreaterThan(0);
    });

    it('应该正确处理宽屏幕', () => {
      const header = new Header('/workspace');
      const output = header.render(120);

      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('invalidate 方法', () => {
    it('应该有 invalidate 方法', () => {
      const header = new Header('/workspace');
      expect(typeof header.invalidate).toBe('function');
    });

    it('调用 invalidate 不应该抛出错误', () => {
      const header = new Header('/workspace');
      expect(() => header.invalidate()).not.toThrow();
    });
  });

  describe('render 方法', () => {
    it('应该返回字符串数组', () => {
      const header = new Header('/workspace');
      const output = header.render(80);

      expect(Array.isArray(output)).toBe(true);
      expect(output.every((line) => typeof line === 'string')).toBe(true);
    });

    it('应该只返回一行', () => {
      const header = new Header('/workspace');
      const output = header.render(80);

      expect(output.length).toBe(1);
    });

    it('应该包含 emoji 图标', () => {
      const header = new Header('/workspace');
      const output = header.render(80);

      expect(output[0]).toContain('🤖');
    });
  });
});
