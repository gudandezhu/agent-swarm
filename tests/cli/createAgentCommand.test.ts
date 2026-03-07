/**
 * swarm create-agent 命令测试
 * 测试 Agent 创建命令
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { createAgentCommand } from '../../src/cli/commands/createAgent.js';
import { TestWorkspace } from './helpers/testWorkspace.js';

describe('swarm create-agent 命令', () => {
  let workspace: TestWorkspace;

  beforeEach(async () => {
    workspace = new TestWorkspace('create-agent');
    await workspace.initialize();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  describe('createAgentCommand 函数', () => {
    it('应该创建新的 Agent', async () => {
      const result = await createAgentCommand(
        workspace.getPath(),
        'test-agent',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(result.agentId).toBe('test-agent');

      // 验证 Agent 目录存在
      const exists = await workspace.agentExists('test-agent');
      expect(exists).toBe(true);
    });

    it('应该生成有效的 config.json', async () => {
      await createAgentCommand(workspace.getPath(), 'test-agent', {});

      const config = await workspace.readAgentConfig('test-agent');
      expect(config).not.toBeNull();
      expect(config?.id).toBe('test-agent');
      expect(config?.name).toBe('test-agent');
      expect(config?.model).toBeDefined();
      expect(config?.channels).toEqual([]);
      expect(config?.createdAt).toBeDefined();
    });

    it('应该生成有效的 prompt.md', async () => {
      await createAgentCommand(workspace.getPath(), 'translator', {});

      const prompt = await workspace.readAgentPrompt('translator');
      expect(prompt).not.toBeNull();
      expect(prompt).toContain('translator');
      expect(prompt).toContain('#');
    });

    it('应该支持 --description 选项', async () => {
      const description = '这是一个翻译助手';
      await createAgentCommand(
        workspace.getPath(),
        'translator',
        { description }
      );

      const config = await workspace.readAgentConfig('translator');
      expect(config?.description).toBe(description);

      const prompt = await workspace.readAgentPrompt('translator');
      expect(prompt).toContain(description);
    });

    it('应该验证 Agent 名称格式 - 有效名称', async () => {
      const validNames = [
        'agent',
        'my-agent',
        'test-agent-123',
        'Agent',
        'a-b-c',
      ];

      for (const name of validNames) {
        const result = await createAgentCommand(
          workspace.getPath(),
          name,
          {}
        );
        expect(result.success).toBe(true);
      }
    });

    it('应该验证 Agent 名称格式 - 无效名称（过短）', async () => {
      const result = await createAgentCommand(
        workspace.getPath(),
        'a',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('名称');
    });

    it('应该验证 Agent 名称格式 - 无效字符', async () => {
      const invalidNames = [
        'agent_123',  // 下划线
        'agent.name', // 点
        'agent space', // 空格
        'agent@123',  // @ 符号
        'agent/123',  // 斜杠
      ];

      for (const name of invalidNames) {
        const result = await createAgentCommand(
          workspace.getPath(),
          name,
          {}
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('名称');
      }
    });

    it('应该检查 Agent 是否已存在', async () => {
      // 创建第一个 Agent
      await createAgentCommand(
        workspace.getPath(),
        'existing-agent',
        {}
      );

      // 尝试创建同名 Agent
      const result = await createAgentCommand(
        workspace.getPath(),
        'existing-agent',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('已存在');
    });

    it('应该支持 --template 选项（预留）', async () => {
      // 当前模板功能预留，测试不应报错
      const result = await createAgentCommand(
        workspace.getPath(),
        'templated-agent',
        { template: 'basic' }
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
    });

    it('应该处理名称过长的情况', async () => {
      const longName = 'a'.repeat(31);
      const result = await createAgentCommand(
        workspace.getPath(),
        longName,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('名称');
    });

    it('应该生成唯一的 createdAt 时间戳', async () => {
      const agent1 = await createAgentCommand(
        workspace.getPath(),
        'agent-1',
        {}
      );

      // 等待至少 1ms
      await new Promise((resolve) => setTimeout(resolve, 2));

      const agent2 = await createAgentCommand(
        workspace.getPath(),
        'agent-2',
        {}
      );

      const config1 = await workspace.readAgentConfig('agent-1');
      const config2 = await workspace.readAgentConfig('agent-2');

      expect(config1?.createdAt).toBeDefined();
      expect(config2?.createdAt).toBeDefined();
      expect(config1?.createdAt).not.toBe(config2?.createdAt);
    });

    it('应该返回友好的成功消息', async () => {
      const result = await createAgentCommand(
        workspace.getPath(),
        'test-agent',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('test-agent');
      expect(result.message).toContain('创建');
    });
  });
});
