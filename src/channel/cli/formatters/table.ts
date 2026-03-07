/**
 * TableFormatter - 统一的表格输出格式化工具
 *
 * 提供一致的 CLI 输出格式，包括 Agent 列表、Session 列表和状态信息
 */

/**
 * Agent 信息摘要
 */
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

/**
 * Session 信息摘要
 */
export interface SessionInfo {
  id: string;
  agentId: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  messageCount?: number;
}

/**
 * 状态信息摘要
 */
export interface StatusInfo {
  running: boolean;
  workspacePath: string;
  agentCount: number;
  activeSessionCount: number;
  version: string;
  mode?: 'interactive' | 'daemon';
  port?: number;
}

/**
 * 输出格式选项
 */
export interface FormatOptions {
  verbose?: boolean;
  json?: boolean;
}

/**
 * TableFormatter 类
 *
 * 提供统一的表格输出格式化功能
 */
export class TableFormatter {
  /**
   * 格式化 Agent 列表输出
   */
  static renderAgents(agents: AgentInfo[], options: FormatOptions = {}): string {
    if (options.json) {
      return this.renderAgentsJson(agents);
    }
    return this.renderAgentsTable(agents, options.verbose);
  }

  /**
   * 格式化 Agent 列表为表格
   */
  private static renderAgentsTable(agents: AgentInfo[], verbose = false): string {
    // 空列表
    if (agents.length === 0) {
      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent 列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

没有找到任何 Agent。

🚀 快速开始:
  swarm create-agent <name>    # 创建新 Agent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
    }

    const header = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent 列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    const footer = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总计: ${agents.length} 个 Agent

🚀 快速开始:
  swarm create-agent <name>    # 创建新 Agent
  swarm start                   # 启动 Agent Swarm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const agentLines = agents.map((agent) => {
      return this.formatAgentLine(agent, verbose);
    });

    return header + agentLines.join('\n') + '\n' + footer;
  }

  /**
   * 格式化单个 Agent 行
   */
  private static formatAgentLine(agent: AgentInfo, verbose: boolean): string {
    const statusIcon = agent.valid ? '✓' : '✗';
    const description = agent.description ? ` - ${agent.description}` : '';
    const errorLine = agent.error ? `\n  ⚠️  ${agent.error}` : '';

    let line = `  ${statusIcon} ${agent.id}${description}${errorLine}`;

    // 详细模式显示额外信息
    if (verbose && agent.valid) {
      const details: string[] = [];
      if (agent.model) {
        details.push(`模型: ${agent.model}`);
      }
      if (agent.channels && agent.channels.length > 0) {
        const channelTypes = agent.channels.map((c) => c.type).join(', ');
        details.push(`渠道: ${channelTypes}`);
      }
      if (details.length > 0) {
        line += `\n      ${details.join(' | ')}`;
      }
    }

    return line;
  }

  /**
   * 格式化 Agent 列表为 JSON
   */
  private static renderAgentsJson(agents: AgentInfo[]): string {
    return JSON.stringify(
      {
        count: agents.length,
        agents,
      },
      null,
      2
    );
  }

  /**
   * 格式化 Session 列表输出
   */
  static renderSessions(sessions: SessionInfo[], options: FormatOptions = {}): string {
    if (options.json) {
      return this.renderSessionsJson(sessions);
    }
    return this.renderSessionsTable(sessions, options.verbose);
  }

  /**
   * 格式化 Session 列表为表格
   */
  private static renderSessionsTable(sessions: SessionInfo[], verbose = false): string {
    if (sessions.length === 0) {
      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Session 列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

没有找到任何 Session。

💡 提示:
  Session 会在与 Agent 交互时自动创建。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
    }

    const header = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Session 列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    const footer = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总计: ${sessions.length} 个 Session

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const sessionLines = sessions.map((session) => {
      return this.formatSessionLine(session, verbose);
    });

    return header + sessionLines.join('\n') + '\n' + footer;
  }

  /**
   * 格式化单个 Session 行
   */
  private static formatSessionLine(session: SessionInfo, verbose: boolean): string {
    const statusIcon = this.getStatusIcon(session.status);
    const messageCount = session.messageCount ?? 0;

    let line = `  ${statusIcon} ${session.id}`;
    line += `\n      Agent: ${session.agentId}`;
    line += ` | 消息: ${messageCount}`;

    if (verbose && session.updatedAt) {
      const updatedTime = new Date(session.updatedAt).toLocaleString('zh-CN');
      line += ` | 更新: ${updatedTime}`;
    }

    return line;
  }

  /**
   * 获取状态图标
   */
  private static getStatusIcon(status: SessionInfo['status']): string {
    switch (status) {
      case 'active':
        return '●';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
    }
  }

  /**
   * 格式化 Session 列表为 JSON
   */
  private static renderSessionsJson(sessions: SessionInfo[]): string {
    return JSON.stringify(
      {
        count: sessions.length,
        sessions,
      },
      null,
      2
    );
  }

  /**
   * 格式化状态信息输出
   */
  static renderStatus(status: StatusInfo, options: FormatOptions = {}): string {
    if (options.json) {
      return this.renderStatusJson(status);
    }
    return this.renderStatusTable(status);
  }

  /**
   * 格式化状态信息为表格
   */
  private static renderStatusTable(status: StatusInfo): string {
    const statusText = status.running ? '运行中' : '已停止';
    const modeText = status.mode === 'daemon' ? '后台模式' : '交互模式';
    const portText = status.port ? String(status.port) : 'default';

    let output = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 服务${status.running ? '启动成功！' : '状态'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间: ${status.workspacePath}
✓ 服务状态: ${statusText}
✓ 配置版本: ${status.version}
✓ Agent 数量: ${status.agentCount}
✓ 活跃 Session: ${status.activeSessionCount}
`;

    if (status.mode) {
      output += `✓ 运行模式: ${modeText}\n`;
    }

    if (status.port) {
      output += `✓ 端口: ${portText}\n`;
    }

    output += `
🤖 服务状态:
  - AgentSwarm${status.running ? ' 已启动' : ' 已停止'}
  - 消息总线${status.running ? ' 已就绪' : ' 未就绪'}
  - 工作空间已加载
`;

    // 根据模式显示不同提示
    if (status.running) {
      if (status.mode === 'daemon') {
        output += `
💡 提示:
  - 使用进程管理器管理后台服务
  - 查看日志了解服务状态
`;
      } else {
        output += `
📝 可用命令:
  - 输入消息发送给 Agent
  - 输入 /exit 或 Ctrl+C 退出

💡 提示:
  - 使用 Ctrl+C 优雅退出
`;
      }
    }

    output += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return output.trim();
  }

  /**
   * 格式化状态信息为 JSON
   */
  private static renderStatusJson(status: StatusInfo): string {
    return JSON.stringify(status, null, 2);
  }
}
