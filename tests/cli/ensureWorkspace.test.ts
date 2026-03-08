/**
 * 运行时工作空间检查测试 - P0 任务
 * 测试 CLI 启动时的工作空间验证
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ensureWorkspace, checkWorkspace } from '../../src/cli/ensureWorkspace.js';
import { TestWorkspace } from './helpers/testWorkspace.js';

const REQUIRED_DIRS = ['agents', 'sessions', 'memory', '.claude', '.claude/skills'];

describe('运行时工作空间检查（P0）', () => {
  let workspace: TestWorkspace;

  beforeEach(async () => {
    workspace = new TestWorkspace('ensure-workspace');
    await workspace.initialize({ skipConfig: true }); // 跳过配置，让测试创建
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  describe('ensureWorkspace', () => {
    it('应该在不存在时创建工作空间', async () => {
      const result = await ensureWorkspace(workspace.getPath(), workspace.getProjectSkillsPath());

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);

      // 验证目录创建
      await fs.access(workspace.getPath());
      await fs.access(join(workspace.getPath(), 'agents'));
      await fs.access(join(workspace.getPath(), '.claude', 'skills'));
    });

    it('应该在已存在时跳过', async () => {
      // 先创建完整的工作空间（包括配置文件）
      await fs.mkdir(join(workspace.getPath(), 'agents'), { recursive: true });
      await fs.mkdir(join(workspace.getPath(), 'sessions'), { recursive: true });
      await fs.mkdir(join(workspace.getPath(), 'memory'), { recursive: true });
      await fs.mkdir(join(workspace.getPath(), '.claude', 'skills'), { recursive: true });
      await fs.writeFile(
        join(workspace.getPath(), 'agent-swarm.json'),
        JSON.stringify({ version: '0.1.0' })
      );

      const result = await ensureWorkspace(workspace.getPath(), workspace.getProjectSkillsPath());

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('应该复制 skills 文件', async () => {
      await ensureWorkspace(workspace.getPath(), workspace.getProjectSkillsPath());

      const skillPath = join(workspace.getPath(), '.claude', 'skills', 'create-agent.md');
      await fs.access(skillPath);
    });

    it('应该生成配置文件', async () => {
      await ensureWorkspace(workspace.getPath(), workspace.getProjectSkillsPath());

      const configPath = join(workspace.getPath(), 'agent-swarm.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('apiKeys');
    });

    it('应该处理部分目录存在的情况', async () => {
      // 创建部分目录
      await fs.mkdir(join(workspace.getPath(), 'agents'), { recursive: true });

      const result = await ensureWorkspace(workspace.getPath(), workspace.getProjectSkillsPath());

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
    });

    it('应该返回错误信息当初始化失败', async () => {
      // 使用无效路径（模拟权限问题）
      const invalidPath = '/root/invalid-path-test';

      const result = await ensureWorkspace(invalidPath, workspace.getProjectSkillsPath());

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('checkWorkspace', () => {
    it('应该检测工作空间存在', async () => {
      // 创建完整的工作空间（包括配置文件）
      for (const dir of REQUIRED_DIRS) {
        await fs.mkdir(join(workspace.getPath(), dir), { recursive: true });
      }
      await fs.writeFile(
        join(workspace.getPath(), 'agent-swarm.json'),
        JSON.stringify({ version: '0.1.0' })
      );

      const result = await checkWorkspace(workspace.getPath());

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('应该检测工作空间不存在', async () => {
      // 清理工作空间，模拟不存在的情况
      await workspace.cleanup();

      const result = await checkWorkspace(workspace.getPath());

      expect(result.exists).toBe(false);
      expect(result.valid).toBe(false);
    });

    it('应该检测工作空间完整性', async () => {
      // 创建配置文件和完整的目录结构，然后删除 sessions 模拟不完整
      for (const dir of REQUIRED_DIRS) {
        await fs.mkdir(join(workspace.getPath(), dir), { recursive: true });
      }
      await fs.writeFile(
        join(workspace.getPath(), 'agent-swarm.json'),
        JSON.stringify({ version: '0.1.0' })
      );
      // 删除 sessions 目录模拟不完整
      await fs.rm(join(workspace.getPath(), 'sessions'), { recursive: true });

      const result = await checkWorkspace(workspace.getPath());

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.missingDirs).toBeDefined();
      if (result.missingDirs) {
        expect(result.missingDirs.length).toBeGreaterThan(0);
        expect(result.missingDirs).toContain('sessions');
      }
    });
  });
});
