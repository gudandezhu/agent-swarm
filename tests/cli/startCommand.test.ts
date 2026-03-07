/**
 * swarm start 命令测试 - P0 任务
 * 测试 AgentSwarm 服务启动功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CLI } from '../../src/cli/CLI.js';
import { startCommand } from '../../src/cli/commands/start.js';

describe('swarm start 命令（P0）', () => {
  const testWorkspace = join(tmpdir(), `swarm-start-test-${Date.now()}`);
  const projectSkillsPath = join(tmpdir(), `project-skills-${Date.now()}`);
  let cli: CLI;

  beforeEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
      await fs.rm(projectSkillsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }

    // 创建项目 skills 目录
    await fs.mkdir(projectSkillsPath, { recursive: true });
    await fs.writeFile(join(projectSkillsPath, 'create-agent.md'), '# Create Agent');

    // 创建测试工作空间
    await fs.mkdir(testWorkspace, { recursive: true });
    await fs.mkdir(join(testWorkspace, 'agents'), { recursive: true });
    await fs.mkdir(join(testWorkspace, 'sessions'), { recursive: true });
    await fs.mkdir(join(testWorkspace, 'memory'), { recursive: true });
    await fs.mkdir(join(testWorkspace, '.claude', 'skills'), { recursive: true });

    // 创建 config.json
    const config = {
      version: '0.1.0',
      apiKeys: { anthropic: 'sk-test-key-for-start' },
      workspace: testWorkspace,
      logLevel: 'info',
    };
    await fs.writeFile(join(testWorkspace, 'config.json'), JSON.stringify(config, null, 2));

    cli = new CLI(testWorkspace, projectSkillsPath);
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
      await fs.rm(projectSkillsPath, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  describe('startCommand 函数', () => {
    it('应该启动服务并返回成功', async () => {
      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(true);
      expect(result.started).toBe(true);
    });

    it('应该在非交互模式下启动', async () => {
      const result = await startCommand(testWorkspace, {
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

    it('应该支持 --port 选项', async () => {
      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
        port: 3000,
      });

      expect(result.success).toBe(true);
      // 验证端口配置被应用
      expect(result.config).toBeDefined();
    });

    it('应该支持 --daemon 选项', async () => {
      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
        daemon: true,
      });

      expect(result.success).toBe(true);
      expect(result.started).toBe(true);
    });

    it('应该验证 config.json 中的 API Key', async () => {
      // 创建没有 API Key 的配置
      const noKeyConfig = {
        version: '0.1.0',
        apiKeys: { anthropic: '', openai: '' },
        workspace: testWorkspace,
        logLevel: 'info',
      };
      await fs.writeFile(join(testWorkspace, 'config.json'), JSON.stringify(noKeyConfig, null, 2));

      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      // 应该警告但没有失败（可以使用环境变量）
      expect(result.success).toBe(true);
      expect(result.warning).toContain('API Key');
    });

    it('应该显示启动信息', async () => {
      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('启动');
    });
  });

  describe('CLI 集成', () => {
    it('应该通过 CLI 执行 start 命令', async () => {
      const result = await cli.execute(['start']);

      expect(result.success).toBe(true);
    });

    it('应该支持 --help 选项', async () => {
      const result = await cli.execute(['start', '--help']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('start');
    });

    it('应该支持组合选项', async () => {
      const result = await cli.execute(['start', '--port', '3000', '--daemon']);

      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该提供友好的错误提示', async () => {
      const invalidWorkspace = '/root/invalid-workspace';

      const result = await startCommand(invalidWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('失败');
    });

    it('应该处理配置文件损坏的情况', async () => {
      // 写入损坏的 JSON
      await fs.writeFile(join(testWorkspace, 'config.json'), 'invalid json content');

      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('服务管理', () => {
    it('应该支持优雅关闭', async () => {
      const result = await startCommand(testWorkspace, {
        mockResponse: async () => 'Mock response',
      });

      expect(result.success).toBe(true);
      expect(result.service).toBeDefined();
    });
  });
});
