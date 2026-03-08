/**
 * swarm init 命令测试 - P0 任务
 * 测试工作空间初始化命令
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CLI } from '../../src/cli/CLI.js';
import { initCommand } from '../../src/cli/commands/init.js';
import { TestWorkspace } from './helpers/testWorkspace.js';

describe('swarm init 命令（P0）', () => {
  let workspace: TestWorkspace;
  let cli: CLI;

  beforeEach(async () => {
    workspace = new TestWorkspace('init');
    await workspace.initialize({ skipConfig: true }); // 跳过配置，让 initCommand 创建

    cli = new CLI(workspace.getPath());
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  describe('initCommand 函数', () => {
    it('应该初始化新的工作空间', async () => {
      const result = await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // 验证目录创建
      await fs.access(workspace.getPath());
      await fs.access(join(workspace.getPath(), 'agents'));
      await fs.access(join(workspace.getPath(), 'sessions'));
      await fs.access(join(workspace.getPath(), 'memory'));
      await fs.access(join(workspace.getPath(), '.claude', 'skills'));
    });

    it('应该复制 skills 文件', async () => {
      await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      const skills = ['create-agent.md', 'configure-agent.md', 'add-channel.md'];

      for (const skill of skills) {
        const skillPath = join(workspace.getPath(), '.claude', 'skills', skill);
        await fs.access(skillPath);

        // 验证文件存在且有内容
        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('应该生成配置文件', async () => {
      const result = await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      // 验证 initCommand 成功
      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      const configPath = join(workspace.getPath(), 'agent-swarm.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('apiKeys');
      expect(config).toHaveProperty('workspace');
    });

    it('应该在已存在时跳过（不覆盖）', async () => {
      // 先初始化
      await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      // 修改配置文件
      const configPath = join(workspace.getPath(), 'agent-swarm.json');
      const customConfig = {
        version: '0.0.1',
        custom: 'value',
        apiKeys: { anthropic: 'sk-test' },
      };
      await fs.writeFile(configPath, JSON.stringify(customConfig));

      // 再次初始化
      const result = await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);

      // 验证配置未被覆盖
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.custom).toBe('value');
      expect(config.version).toBe('0.0.1');
    });

    it('应该支持 --force 强制重新初始化', async () => {
      // 先初始化
      await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      // 修改配置文件
      const configPath = join(workspace.getPath(), 'agent-swarm.json');
      await fs.writeFile(configPath, JSON.stringify({ custom: 'old' }));

      // 强制重新初始化
      const result = await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // 验证配置已重新生成
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.custom).toBeUndefined();
      expect(config.version).toBe('0.1.0');
    });

    it('应该处理部分目录存在的情况', async () => {
      // 创建部分目录结构（缺少 agent-swarm.json）
      await fs.mkdir(join(workspace.getPath(), 'agents'), { recursive: true });
      await fs.mkdir(join(workspace.getPath(), 'sessions'), { recursive: true });
      await fs.mkdir(join(workspace.getPath(), 'memory'), { recursive: true });
      await fs.mkdir(join(workspace.getPath(), '.claude', 'skills'), { recursive: true });

      const result = await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      expect(result.success).toBe(true);
      // 由于缺少 agent-swarm.json，会被重新初始化
      expect(result.created).toBe(true);
    });

    it('应该返回友好的错误信息', async () => {
      // 使用无效路径模拟权限问题
      const invalidPath = '/root/invalid-path-test';

      const result = await initCommand(invalidPath, workspace.getProjectSkillsPath(), {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('失败');
    });

    it('应该处理源 skills 目录不存在的情况', async () => {
      const noSkillsPath = '/non-existent-skills';

      const result = await initCommand(workspace.getPath(), noSkillsPath, {});

      // 不应该抛出错误，只是没有 skills 文件
      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
    });

    it('应该显示欢迎信息', async () => {
      const result = await initCommand(workspace.getPath(), workspace.getProjectSkillsPath(), {});

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('工作空间');
      expect(result.message).toContain('完成');
      expect(result.message).toContain('快速开始');
    });
  });

  describe('CLI 集成', () => {
    it('应该通过 CLI 执行 init 命令', async () => {
      const result = await cli.execute(['init']);

      expect(result.success).toBe(true);
    });

    it('应该支持 --help 选项', async () => {
      const result = await cli.execute(['init', '--help']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('init');
    });
  });
});
