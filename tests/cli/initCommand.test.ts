/**
 * swarm init 命令测试 - P0 任务
 * 测试工作空间初始化命令
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CLI } from '../../src/cli/CLI.js';
import { initCommand } from '../../src/cli/commands/init.js';

describe('swarm init 命令（P0）', () => {
  const testWorkspace = join(tmpdir(), `swarm-init-test-${Date.now()}`);
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
    await fs.writeFile(join(projectSkillsPath, 'configure-agent.md'), '# Configure Agent');
    await fs.writeFile(join(projectSkillsPath, 'add-channel.md'), '# Add Channel');

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

  describe('initCommand 函数', () => {
    it('应该初始化新的工作空间', async () => {
      const result = await initCommand(testWorkspace, projectSkillsPath, {});

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // 验证目录创建
      await fs.access(testWorkspace);
      await fs.access(join(testWorkspace, 'agents'));
      await fs.access(join(testWorkspace, 'sessions'));
      await fs.access(join(testWorkspace, 'memory'));
      await fs.access(join(testWorkspace, '.claude', 'skills'));
    });

    it('应该复制 skills 文件', async () => {
      await initCommand(testWorkspace, projectSkillsPath, {});

      const skills = ['create-agent.md', 'configure-agent.md', 'add-channel.md'];

      for (const skill of skills) {
        const skillPath = join(testWorkspace, '.claude', 'skills', skill);
        await fs.access(skillPath);

        // 验证文件存在且有内容
        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('应该生成配置文件', async () => {
      await initCommand(testWorkspace, projectSkillsPath, {});

      const configPath = join(testWorkspace, 'config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('apiKeys');
      expect(config).toHaveProperty('workspace');
    });

    it('应该在已存在时跳过（不覆盖）', async () => {
      // 先初始化
      await initCommand(testWorkspace, projectSkillsPath, {});

      // 修改配置文件
      const configPath = join(testWorkspace, 'config.json');
      const customConfig = {
        version: '0.0.1',
        custom: 'value',
        apiKeys: { anthropic: 'sk-test' },
      };
      await fs.writeFile(configPath, JSON.stringify(customConfig));

      // 再次初始化
      const result = await initCommand(testWorkspace, projectSkillsPath, {});

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
      await initCommand(testWorkspace, projectSkillsPath, {});

      // 修改配置文件
      const configPath = join(testWorkspace, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({ custom: 'old' }));

      // 强制重新初始化
      const result = await initCommand(testWorkspace, projectSkillsPath, { force: true });

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // 验证配置已重新生成
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.custom).toBeUndefined();
      expect(config.version).toBe('0.1.0');
    });

    it('应该处理部分目录存在的情况', async () => {
      // 创建部分目录结构（缺少 config.json）
      await fs.mkdir(join(testWorkspace, 'agents'), { recursive: true });
      await fs.mkdir(join(testWorkspace, 'sessions'), { recursive: true });
      await fs.mkdir(join(testWorkspace, 'memory'), { recursive: true });
      await fs.mkdir(join(testWorkspace, '.claude', 'skills'), { recursive: true });

      const result = await initCommand(testWorkspace, projectSkillsPath, {});

      expect(result.success).toBe(true);
      // 由于缺少 config.json，会被重新初始化
      expect(result.created).toBe(true);
    });

    it('应该返回友好的错误信息', async () => {
      // 使用无效路径模拟权限问题
      const invalidPath = '/root/invalid-path-test';

      const result = await initCommand(invalidPath, projectSkillsPath, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('失败');
    });

    it('应该处理源 skills 目录不存在的情况', async () => {
      const noSkillsPath = '/non-existent-skills';

      const result = await initCommand(testWorkspace, noSkillsPath, {});

      // 不应该抛出错误，只是没有 skills 文件
      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
    });

    it('应该显示欢迎信息', async () => {
      const result = await initCommand(testWorkspace, projectSkillsPath, {});

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
