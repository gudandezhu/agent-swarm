/**
 * swarm list 命令测试
 * 测试 Agent 列出命令
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { listCommand } from '../../src/cli/commands/list.js';
import { TestWorkspace } from './helpers/testWorkspace.js';

describe('swarm list 命令', () => {
  let workspace: TestWorkspace;

  beforeEach(async () => {
    workspace = new TestWorkspace('list');
    await workspace.initialize();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  describe('listCommand 函数', () => {
    it('应该返回空列表（无 Agent）', async () => {
      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      expect(result.agents).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('应该列出所有 Agents', async () => {
      // 创建测试 Agents
      await workspace.createAgent('agent-1', 'Agent One', '第一个 Agent');
      await workspace.createAgent('agent-2', 'Agent Two', '第二个 Agent');
      await workspace.createAgent('translator', '翻译助手');

      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(result.agents).toHaveLength(3);

      // 验证 Agent 信息
      const agentIds = result.agents?.map((a) => a.id);
      expect(agentIds).toContain('agent-1');
      expect(agentIds).toContain('agent-2');
      expect(agentIds).toContain('translator');
    });

    it('应该正确读取 Agent 配置', async () => {
      await workspace.createAgent('test-agent', '测试 Agent', '这是一个测试');

      const result = await listCommand(workspace.getPath(), {});
      const agent = result.agents?.find((a) => a.id === 'test-agent');

      expect(agent).toBeDefined();
      expect(agent?.id).toBe('test-agent');
      expect(agent?.description).toBe('这是一个测试');
      expect(agent?.model).toBeDefined();
      expect(agent?.createdAt).toBeDefined();
    });

    it('应该支持 --verbose 选项显示详细信息', async () => {
      await workspace.createAgent('verbose-agent', '详细 Agent', '详细描述信息');

      const result = await listCommand(workspace.getPath(), { verbose: true });
      const agent = result.agents?.find((a) => a.id === 'verbose-agent');

      expect(result.success).toBe(true);
      expect(agent?.channels).toBeDefined();
      expect(agent?.model).toBeDefined();
    });

    it('应该支持 --json 选项输出 JSON 格式', async () => {
      await workspace.createAgent('json-agent', 'JSON Agent');

      const result = await listCommand(workspace.getPath(), { json: true });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(() => JSON.parse(result.output || '')).not.toThrow();
    });

    it('应该忽略非目录文件', async () => {
      await workspace.createAgent('valid-agent', 'Valid Agent');

      // 创建一些非目录文件
      const { promises: fs } = await import('fs');
      await fs.writeFile(join(workspace.getAgentsPath(), 'not-a-dir.txt'), 'test');
      await fs.writeFile(join(workspace.getAgentsPath(), '.hidden'), 'test');

      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.agents?.[0]?.id).toBe('valid-agent');
    });

    it('应该处理配置文件损坏的 Agent', async () => {
      // 创建一个有效的 Agent
      await workspace.createAgent('valid-agent', 'Valid Agent');

      // 创建一个配置文件损坏的 Agent
      const { promises: fs } = await import('fs');
      const badAgentPath = join(workspace.getAgentsPath(), 'bad-agent');
      await fs.mkdir(badAgentPath, { recursive: true });
      await fs.writeFile(join(badAgentPath, 'config.json'), '{ invalid json }');
      await fs.writeFile(join(badAgentPath, 'prompt.md'), '# Bad Agent');

      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      // 应该忽略损坏的 Agent 或标记为错误
      const badAgent = result.agents?.find((a) => a.id === 'bad-agent');
      expect(badAgent?.error).toBeDefined();
    });

    it('应该处理缺少配置文件的 Agent', async () => {
      await workspace.createAgent('valid-agent', 'Valid Agent');

      // 创建一个只有 prompt 的 Agent
      const { promises: fs } = await import('fs');
      const partialAgentPath = join(workspace.getAgentsPath(), 'partial-agent');
      await fs.mkdir(partialAgentPath, { recursive: true });
      await fs.writeFile(join(partialAgentPath, 'prompt.md'), '# Partial Agent');

      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      const partialAgent = result.agents?.find((a) => a.id === 'partial-agent');
      expect(partialAgent?.error).toBeDefined();
    });

    it('应该返回格式化的表格输出', async () => {
      await workspace.createAgent('agent-1', 'Agent One', '第一个');
      await workspace.createAgent('agent-2', 'Agent Two', '第二个');

      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output).toContain('agent-1');
      expect(result.output).toContain('agent-2');
    });

    it('应该按创建时间排序（最新的在前）', async () => {
      await workspace.createAgent('agent-1', 'Agent One');
      // 等待确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 2));
      await workspace.createAgent('agent-2', 'Agent Two');
      await new Promise((resolve) => setTimeout(resolve, 2));
      await workspace.createAgent('agent-3', 'Agent Three');

      const result = await listCommand(workspace.getPath(), {});

      expect(result.success).toBe(true);
      expect(result.agents?.[0]?.id).toBe('agent-3');
      expect(result.agents?.[1]?.id).toBe('agent-2');
      expect(result.agents?.[2]?.id).toBe('agent-1');
    });
  });
});
