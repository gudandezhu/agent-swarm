/**
 * CLI 框架测试 - P0 紧急任务
 * 测试全局 swarm 命令行工具
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CLI } from '../../src/cli/CLI.js';
import { WorkspaceInitializer } from '../../src/setup/WorkspaceInitializer.js';

describe('CLI Framework (P0)', () => {
  const testWorkspace = join(tmpdir(), `agent-swarm-cli-test-${Date.now()}`);
  let cli: CLI;

  beforeEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch {
      // 忽略
    }

    // 创建测试工作空间
    const initializer = new WorkspaceInitializer(testWorkspace);
    await initializer.initialize();

    cli = new CLI(testWorkspace);
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  });

  describe('基本功能', () => {
    it('应该创建 CLI 实例', () => {
      expect(cli).toBeDefined();
    });

    it('应该返回工作空间路径', () => {
      const path = cli.getWorkspacePath();
      expect(path).toBe(testWorkspace);
    });
  });

  describe('命令解析', () => {
    it('应该解析命令参数', () => {
      const args = ['start', '--port', '3000'];
      const parsed = cli.parseArgs(args);

      expect(parsed.command).toBe('start');
      expect(parsed.options).toEqual({ port: '3000' });
    });

    it('应该处理无参数命令', () => {
      const args = ['init'];
      const parsed = cli.parseArgs(args);

      expect(parsed.command).toBe('init');
      expect(parsed.options).toEqual({});
    });

    it('应该处理无命令情况', () => {
      const args = [];
      const parsed = cli.parseArgs(args);

      expect(parsed.command).toBe('');
      expect(parsed.options).toEqual({});
    });

    it('应该处理选项标志', () => {
      const args = ['start', '--verbose', '--daemon'];
      const parsed = cli.parseArgs(args);

      expect(parsed.options.verbose).toBe(true);
      expect(parsed.options.daemon).toBe(true);
    });
  });

  describe('命令执行', () => {
    it('应该执行 init 命令', async () => {
      const result = await cli.execute(['init']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('初始化');
    });

    it('应该执行 start 命令', async () => {
      // start 命令会尝试启动服务，我们只测试命令能被识别
      const result = await cli.execute(['start', '--help']);

      expect(result.success).toBe(true);
    });

    it('应该执行 create-agent 命令', async () => {
      const result = await cli.execute(['create-agent', 'test-agent']);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as { agentId?: string }).agentId).toBe('test-agent');

      // 验证 Agent 目录已创建
      const agentPath = join(testWorkspace, 'agents', 'test-agent');
      await fs.access(agentPath);
    });

    it('应该执行 list 命令', async () => {
      // 先创建一个 Agent
      await cli.execute(['create-agent', 'list-test-agent']);

      const result = await cli.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as { count?: number }).count).toBe(1);
    });

    it('应该处理缺少 Agent 名称的 create-agent 命令', async () => {
      const result = await cli.execute(['create-agent']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少 Agent 名称');
    });

    it('应该处理未知命令', async () => {
      const result = await cli.execute(['unknown-command']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('未知命令');
    });
  });

  describe('帮助信息', () => {
    it('应该显示主帮助', () => {
      const help = cli.showHelp();

      expect(help).toContain('swarm');
      expect(help).toContain('init');
      expect(help).toContain('start');
      expect(help).toContain('create-agent');
      expect(help).toContain('list');
    });

    it('应该显示命令帮助', () => {
      const help = cli.showCommandHelp('init');

      expect(help).toContain('init');
      expect(help).toContain('初始化');
    });

    it('应该显示 create-agent 命令帮助', () => {
      const help = cli.showCommandHelp('create-agent');

      expect(help).toContain('create-agent');
      expect(help).toContain('Agent 名称');
    });

    it('应该显示 list 命令帮助', () => {
      const help = cli.showCommandHelp('list');

      expect(help).toContain('list');
      expect(help).toContain('Agents');
    });
  });

  describe('版本信息', () => {
    it('应该显示版本', () => {
      const version = cli.showVersion();

      expect(version).toContain('0.1.0');
    });
  });

  describe('错误处理', () => {
    it('应该处理工作空间不存在', async () => {
      const invalidCli = new CLI('/non-existent-workspace');
      const result = await invalidCli.execute(['start']);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该提供友好的错误提示', async () => {
      const result = await cli.execute(['invalid-command']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('未知命令');
    });
  });
});
