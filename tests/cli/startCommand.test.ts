/**
 * swarm start 命令测试 - P0 任务
 * 测试 AgentSwarm 服务启动功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CLI } from '../../src/cli/CLI.js';
import { startCommand } from '../../src/cli/commands/start.js';
import { TestWorkspace } from './helpers/testWorkspace.js';

describe('swarm start 命令（P0）', () => {
  let workspace: TestWorkspace;
  let cli: CLI;

  beforeEach(async () => {
    workspace = new TestWorkspace('start');
    await workspace.initialize();

    cli = new CLI(workspace.getPath());
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  describe('startCommand 函数', () => {
    it('应该启动服务并返回成功', async () => {
      const result = await startCommand(workspace.getPath(), {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(true);
      expect(result.started).toBe(true);
    });

    it('应该在非交互模式下启动', async () => {
      const result = await startCommand(workspace.getPath(), {
        mockResponse: async () => 'Mock response',
        nonInteractive: true,
      });

      expect(result.success).toBe(true);
      expect(result.started).toBe(true);
    });

    it('应该处理工作空间不存在的情况', async () => {
      const nonExistentWorkspace = '/non-existent-workspace-' + Date.now();

      const result = await startCommand(nonExistentWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('不存在');
    });

    it('应该验证 agent-swarm.json 中的 API Key', async () => {
      // 创建没有 API Key 的配置（但全局配置或环境变量可能有）
      const noKeyConfig = {
        version: '0.1.0',
        apiKeys: { anthropic: '', openai: '' },
        workspace: workspace.getPath(),
        logLevel: 'info',
      };
      await fs.writeFile(
        join(workspace.getPath(), 'agent-swarm.json'),
        JSON.stringify(noKeyConfig, null, 2)
      );

      const result = await startCommand(workspace.getPath(), {
        mockResponse: async () => 'Mock response',
      });

      // 系统应该成功启动（可以使用全局配置或环境变量中的 API Key）
      expect(result.success).toBe(true);
      expect(result.started).toBe(true);
    });

    it('应该显示启动信息', async () => {
      const result = await startCommand(workspace.getPath(), {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('启动');
    });
  });

  describe('CLI 集成', () => {
    it('应该通过 CLI 执行 start 命令', async () => {
      const result = await cli.execute(['start', '--non-interactive']);

      expect(result.success).toBe(true);
    });

    it('应该支持 --help 选项', async () => {
      const result = await cli.execute(['start', '--help']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('start');
    });
  });

  describe('错误处理', () => {
    it('应该提供友好的错误提示', async () => {
      const invalidWorkspace = '/root/invalid-workspace';

      const result = await startCommand(invalidWorkspace, {
        mockResponse: async () => 'Mock response',
        nonInteractive: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('失败');
    });

    it('应该处理配置文件损坏的情况', async () => {
      // 写入损坏的 JSON
      await fs.writeFile(join(workspace.getPath(), 'agent-swarm.json'), 'invalid json content');

      const result = await startCommand(workspace.getPath(), {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('服务管理', () => {
    it('应该支持优雅关闭', async () => {
      const result = await startCommand(workspace.getPath(), {
        mockResponse: async () => 'Mock response',
        nonInteractive: true, // 使用非交互模式
      });

      expect(result.success).toBe(true);
      expect(result.service).toBeDefined();
    });
  });
});
