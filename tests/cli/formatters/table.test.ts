/**
 * TableFormatter 测试
 *
 * 测试统一的表格输出格式化工具
 */

import { describe, it, expect } from 'vitest';
import { TableFormatter } from '../../../src/channel/cli/formatters/table.js';

// 导入类型定义
export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  model?: string;
  channels?: Array<{ type: string; config: Record<string, unknown> }>;
  createdAt?: string;
  valid: boolean;
  error?: string;
}

export interface SessionInfo {
  id: string;
  agentId: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface StatusInfo {
  running: boolean;
  workspacePath: string;
  agentCount: number;
  activeSessionCount: number;
  version: string;
  mode?: 'interactive' | 'daemon';
  port?: number;
}

describe('TableFormatter', () => {
  describe('renderAgents - Agent 列表格式化', () => {
    describe('空列表', () => {
      it('应该显示空列表提示信息', () => {
        const result = TableFormatter.renderAgents([]);
        expect(result).toContain('没有找到任何 Agent');
      });

      it('应该包含快速开始命令提示', () => {
        const result = TableFormatter.renderAgents([]);
        expect(result).toContain('swarm create-agent');
      });

      it('应该有正确的格式边框', () => {
        const result = TableFormatter.renderAgents([]);
        expect(result).toContain('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        expect(result).toContain('Agent 列表');
      });
    });

    describe('有数据列表', () => {
      const mockAgents: AgentInfo[] = [
        {
          id: 'test-agent',
          name: 'Test Agent',
          description: 'A test agent',
          valid: true,
        },
        {
          id: 'invalid-agent',
          name: 'Invalid Agent',
          valid: false,
          error: '配置文件格式错误',
        },
      ];

      it('应该显示表格头部', () => {
        const result = TableFormatter.renderAgents(mockAgents);
        expect(result).toContain('Agent 列表');
        expect(result).toContain('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

      it('应该显示所有 Agent', () => {
        const result = TableFormatter.renderAgents(mockAgents);
        expect(result).toContain('test-agent');
        expect(result).toContain('invalid-agent');
      });

      it('应该显示状态图标（有效/无效）', () => {
        const result = TableFormatter.renderAgents(mockAgents);
        expect(result).toContain('✓ test-agent'); // 有效
        expect(result).toContain('✗ invalid-agent'); // 无效
      });

      it('应该显示 Agent 描述', () => {
        const result = TableFormatter.renderAgents(mockAgents);
        expect(result).toContain('A test agent');
      });

      it('应该显示错误信息（如果存在）', () => {
        const result = TableFormatter.renderAgents(mockAgents);
        expect(result).toContain('⚠️');
        expect(result).toContain('配置文件格式错误');
      });

      it('应该显示统计信息（总数）', () => {
        const result = TableFormatter.renderAgents(mockAgents);
        expect(result).toContain('总计: 2 个 Agent');
      });
    });

    describe('详细模式', () => {
      const mockAgentWithDetails: AgentInfo[] = [
        {
          id: 'detailed-agent',
          name: 'Detailed Agent',
          model: 'claude-sonnet-4-6',
          channels: [
            { type: 'dingtalk', config: {} },
            { type: 'feishu', config: {} },
          ],
          valid: true,
        },
      ];

      it('应该显示模型信息', () => {
        const result = TableFormatter.renderAgents(mockAgentWithDetails, { verbose: true });
        expect(result).toContain('模型: claude-sonnet-4-6');
      });

      it('应该显示渠道信息', () => {
        const result = TableFormatter.renderAgents(mockAgentWithDetails, { verbose: true });
        expect(result).toContain('渠道: dingtalk, feishu');
      });
    });
  });

  describe('renderSessions - Session 列表格式化', () => {
    describe('空列表', () => {
      it('应该显示空列表提示信息', () => {
        const result = TableFormatter.renderSessions([]);
        expect(result).toContain('没有找到任何 Session');
      });

      it('应该包含提示信息', () => {
        const result = TableFormatter.renderSessions([]);
        expect(result).toContain('Session 会在与 Agent 交互时自动创建');
      });
    });

    describe('有数据列表', () => {
      const mockSessions: SessionInfo[] = [
        {
          id: 'session-1',
          agentId: 'test-agent',
          status: 'active',
          createdAt: '2026-03-07T12:00:00Z',
          messageCount: 5,
        },
        {
          id: 'session-2',
          agentId: 'test-agent',
          status: 'completed',
          createdAt: '2026-03-07T11:00:00Z',
          updatedAt: '2026-03-07T11:30:00Z',
          messageCount: 10,
        },
        {
          id: 'session-3',
          agentId: 'test-agent',
          status: 'failed',
          createdAt: '2026-03-07T10:00:00Z',
          messageCount: 2,
        },
      ];

      it('应该显示表格头部', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('Session 列表');
      });

      it('应该显示所有 Session', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('session-1');
        expect(result).toContain('session-2');
        expect(result).toContain('session-3');
      });

      it('应该显示 Session ID', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('session-1');
      });

      it('应该显示关联的 Agent ID', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('Agent: test-agent');
      });

      it('应该显示状态（active/completed/failed）', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('●'); // active
        expect(result).toContain('✓'); // completed
        expect(result).toContain('✗'); // failed
      });

      it('应该显示消息数量', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('消息: 5');
        expect(result).toContain('消息: 10');
      });

      it('应该显示统计信息', () => {
        const result = TableFormatter.renderSessions(mockSessions);
        expect(result).toContain('总计: 3 个 Session');
      });
    });

    describe('详细模式', () => {
      const mockSessionWithUpdated: SessionInfo[] = [
        {
          id: 'session-1',
          agentId: 'test-agent',
          status: 'active',
          createdAt: '2026-03-07T12:00:00Z',
          updatedAt: '2026-03-07T12:30:00Z',
          messageCount: 5,
        },
      ];

      it('应该显示更新时间', () => {
        const result = TableFormatter.renderSessions(mockSessionWithUpdated, { verbose: true });
        expect(result).toContain('更新:');
      });
    });
  });

  describe('renderStatus - 状态信息格式化', () => {
    const mockStatusRunning: StatusInfo = {
      running: true,
      workspacePath: '/workspace',
      agentCount: 3,
      activeSessionCount: 2,
      version: '0.1.0',
      mode: 'interactive',
      port: 3000,
    };

    const mockStatusStopped: StatusInfo = {
      running: false,
      workspacePath: '/workspace',
      agentCount: 3,
      activeSessionCount: 0,
      version: '0.1.0',
    };

    it('应该显示服务运行状态', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('运行中');
    });

    it('应该显示工作空间路径', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('/workspace');
    });

    it('应该显示 Agent 数量', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('Agent 数量: 3');
    });

    it('应该显示活跃 Session 数量', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('活跃 Session: 2');
    });

    it('应该显示版本信息', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('0.1.0');
    });

    it('应该显示运行模式（如果提供）', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('交互模式');
    });

    it('应该显示端口（如果提供）', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('3000');
    });

    it('应该在交互模式显示可用命令提示', () => {
      const result = TableFormatter.renderStatus(mockStatusRunning);
      expect(result).toContain('可用命令');
      expect(result).toContain('/exit');
    });

    it('应该在后台模式显示进程管理提示', () => {
      const daemonStatus = { ...mockStatusRunning, mode: 'daemon' as const };
      const result = TableFormatter.renderStatus(daemonStatus);
      expect(result).toContain('后台模式');
      expect(result).toContain('进程管理器');
    });

    it('应该显示已停止状态', () => {
      const result = TableFormatter.renderStatus(mockStatusStopped);
      expect(result).toContain('已停止');
    });
  });

  describe('JSON 输出格式', () => {
    const mockAgents: AgentInfo[] = [
      {
        id: 'test-agent',
        name: 'Test Agent',
        valid: true,
      },
    ];

    const mockSessions: SessionInfo[] = [
      {
        id: 'session-1',
        agentId: 'test-agent',
        status: 'active',
        createdAt: '2026-03-07T12:00:00Z',
      },
    ];

    const mockStatus: StatusInfo = {
      running: true,
      workspacePath: '/workspace',
      agentCount: 1,
      activeSessionCount: 1,
      version: '0.1.0',
    };

    it('renderAgents 支持输出 JSON', () => {
      const result = TableFormatter.renderAgents(mockAgents, { json: true });
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('count', 1);
      expect(parsed).toHaveProperty('agents');
      expect(parsed.agents).toHaveLength(1);
      expect(parsed.agents[0]).toHaveProperty('id', 'test-agent');
    });

    it('renderSessions 支持输出 JSON', () => {
      const result = TableFormatter.renderSessions(mockSessions, { json: true });
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('count', 1);
      expect(parsed).toHaveProperty('sessions');
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0]).toHaveProperty('id', 'session-1');
    });

    it('renderStatus 支持输出 JSON', () => {
      const result = TableFormatter.renderStatus(mockStatus, { json: true });
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('running', true);
      expect(parsed).toHaveProperty('workspacePath', '/workspace');
      expect(parsed).toHaveProperty('agentCount', 1);
    });
  });
});
