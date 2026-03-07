/**
 * AgentSidebar 组件测试
 *
 * 测试 Agent 列表侧边栏组件
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AgentSidebar } from '../../../../src/channel/cli/components/AgentSidebar.js';

describe('AgentSidebar', () => {
  let testAgentsPath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // 创建临时测试目录
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    testAgentsPath = join(tmpdir(), `agents-test-${timestamp}-${randomSuffix}`);

    // 创建测试目录结构
    await fs.mkdir(testAgentsPath, { recursive: true });

    cleanup = async () => {
      try {
        await fs.rm(testAgentsPath, { recursive: true, force: true });
      } catch {
        // 忽略清理错误
      }
    };
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('初始化', () => {
    it('应该能够创建组件实例', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      expect(sidebar).toBeDefined();
      expect(sidebar.getAgents()).toEqual([]);
    });

    it('应该支持设置当前 Agent', () => {
      const sidebar = new AgentSidebar(testAgentsPath, 'test-agent');
      expect(sidebar).toBeDefined();
    });

    it('空目录时应该返回空 Agent 列表', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      expect(sidebar.getAgents()).toEqual([]);
    });
  });

  describe('加载 Agent 列表', () => {
    it('应该从目录加载所有 Agents', async () => {
      // 创建测试 Agents
      const agent1Path = join(testAgentsPath, 'agent-1');
      const agent2Path = join(testAgentsPath, 'agent-2');

      await fs.mkdir(agent1Path, { recursive: true });
      await fs.mkdir(agent2Path, { recursive: true });

      // 创建 config.json
      const config1 = {
        id: 'agent-1',
        name: 'Agent 1',
        description: 'Test Agent 1',
      };
      const config2 = {
        id: 'agent-2',
        name: 'Agent 2',
        description: 'Test Agent 2',
      };

      await fs.writeFile(join(agent1Path, 'config.json'), JSON.stringify(config1, null, 2));
      await fs.writeFile(join(agent2Path, 'config.json'), JSON.stringify(config2, null, 2));

      // 创建 Sidebar 并等待加载
      const sidebar = new AgentSidebar(testAgentsPath);

      // 等待异步加载完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      const agents = sidebar.getAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0]).toHaveProperty('id', 'agent-1');
      expect(agents[1]).toHaveProperty('id', 'agent-2');
    });

    it('应该跳过隐藏目录', async () => {
      // 创建隐藏目录
      const hiddenPath = join(testAgentsPath, '.hidden');
      await fs.mkdir(hiddenPath, { recursive: true });

      const sidebar = new AgentSidebar(testAgentsPath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sidebar.getAgents()).toHaveLength(0);
    });

    it('应该跳过非目录文件', async () => {
      // 创建文件而非目录
      await fs.writeFile(join(testAgentsPath, 'not-a-dir'), 'content');

      const sidebar = new AgentSidebar(testAgentsPath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sidebar.getAgents()).toHaveLength(0);
    });

    it('应该处理缺少 config.json 的 Agent', async () => {
      const agentPath = join(testAgentsPath, 'incomplete-agent');
      await fs.mkdir(agentPath, { recursive: true });

      const sidebar = new AgentSidebar(testAgentsPath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const agents = sidebar.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0]).toHaveProperty('id', 'incomplete-agent');
      expect(agents[0]).toHaveProperty('valid', false);
    });

    it('应该处理格式错误的 config.json', async () => {
      const agentPath = join(testAgentsPath, 'invalid-agent');
      await fs.mkdir(agentPath, { recursive: true });

      // 写入无效的 JSON
      await fs.writeFile(join(agentPath, 'config.json'), '{ invalid json');

      const sidebar = new AgentSidebar(testAgentsPath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const agents = sidebar.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0]).toHaveProperty('id', 'invalid-agent');
      expect(agents[0]).toHaveProperty('valid', false);
    });
  });

  describe('渲染', () => {
    it('空列表时应该显示标题', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      const output = sidebar.render(80);
      expect(output).toContain('Agents');
    });

    it('空列表时不应该显示 Agent', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      const output = sidebar.render(80);
      expect(output.filter((line) => line.includes('■') || line.includes('□'))).toHaveLength(0);
    });

    it('应该显示所有 Agents', async () => {
      // 创建测试 Agent
      const agentPath = join(testAgentsPath, 'test-agent');
      await fs.mkdir(agentPath, { recursive: true });
      await fs.writeFile(
        join(agentPath, 'config.json'),
        JSON.stringify({ id: 'test-agent', name: 'Test Agent' }, null, 2)
      );

      const sidebar = new AgentSidebar(testAgentsPath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const output = sidebar.render(80);
      expect(output.some((line) => line.includes('test-agent'))).toBe(true);
    });

    it('应该标记当前选中的 Agent', () => {
      const sidebar = new AgentSidebar(testAgentsPath, 'test-agent');
      sidebar['agents'] = [{ id: 'test-agent' }];

      const output = sidebar.render(80);
      expect(output.some((line) => line.includes('■ test-agent'))).toBe(true);
    });

    it('未选中的 Agent 应该显示空心方框', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      sidebar['agents'] = [{ id: 'test-agent' }];

      const output = sidebar.render(80);
      expect(output.some((line) => line.includes('□ test-agent'))).toBe(true);
    });

    it('应该显示快捷键提示', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      const output = sidebar.render(80);
      expect(output.some((line) => line.includes('Alt+A'))).toBe(true);
      expect(output.some((line) => line.includes('切换'))).toBe(true);
    });
  });

  describe('设置当前 Agent', () => {
    it('应该能够切换当前 Agent', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      sidebar.setCurrentAgent('new-agent');

      const output = sidebar.render(80);
      // 需要先添加 agents
      sidebar['agents'] = [{ id: 'new-agent' }];
      const outputWithAgent = sidebar.render(80);
      expect(outputWithAgent.some((line) => line.includes('■ new-agent'))).toBe(true);
    });

    it('未选中时不应该有实心方框', () => {
      const sidebar = new AgentSidebar(testAgentsPath);
      sidebar['agents'] = [{ id: 'test-agent' }];

      const output = sidebar.render(80);
      expect(output.some((line) => line.includes('■'))).toBe(false);
    });
  });
});
