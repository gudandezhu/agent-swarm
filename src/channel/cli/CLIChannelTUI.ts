/**
 * CLIChannelTUI - CLI 通道 TUI 界面
 *
 * 使用 pi-tui 实现美观的终端用户界面
 */

import { TUI, Editor, ProcessTerminal, Container } from '@mariozechner/pi-tui';
import { Header } from './components/Header.js';
import { AgentSidebar } from './components/AgentSidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { StatusLine } from './components/StatusLine.js';
import { defaultTheme } from './themes/default.js';

export interface CLIChannelTUIOptions {
  /** Agent 目录路径 */
  agentsPath: string;
  /** 当前 Agent ID */
  currentAgent?: string;
  /** 工作空间路径 */
  workspacePath?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  userId: string;
  content: string;
  timestamp: Date;
}

/**
 * CLIChannelTUI 主类
 */
export class CLIChannelTUI extends Container {
  private terminal: ProcessTerminal;
  private tui: TUI;
  private editor: Editor;
  private header: Header;
  private sidebar: AgentSidebar;
  private chatArea: ChatArea;
  private statusLine: StatusLine;

  // 回调
  onMessage?: (content: string) => Promise<void>;
  onAgentChange?: (agentId: string) => void;
  onExit?: () => void;

  constructor(options: CLIChannelTUIOptions) {
    super();

    // 初始化 TUI
    this.terminal = new ProcessTerminal();
    this.tui = new TUI(this.terminal);

    // 创建组件
    this.header = new Header(options.workspacePath || process.cwd());
    this.sidebar = new AgentSidebar(options.agentsPath, options.currentAgent);
    this.chatArea = new ChatArea();
    this.statusLine = new StatusLine();
    this.editor = new Editor(this.tui, defaultTheme.editor);

    // 配置编辑器
    this.editor.onSubmit = async (text) => {
      await this.handleSubmit(text);
    };

    // 添加子组件到 TUI
    this.tui.addChild(this.header);
    this.tui.addChild(this.sidebar);
    this.tui.addChild(this.chatArea);
    this.tui.addChild(this.statusLine);
    this.tui.addChild(this.editor);
  }

  /**
   * 启动 TUI
   */
  async start(): Promise<void> {
    this.tui.start();
  }

  /**
   * 停止 TUI
   */
  async stop(): Promise<void> {
    this.tui.stop();
  }

  /**
   * 接收 Agent 消息并显示
   */
  async receiveMessage(userId: string, content: string): Promise<void> {
    this.chatArea.addMessage({
      role: 'assistant',
      userId,
      content,
      timestamp: new Date(),
    });
    this.tui.requestRender();
  }

  /**
   * 显示 Agent 思考状态
   */
  setThinking(thinking: boolean): void {
    this.statusLine.setThinking(thinking);
    this.tui.requestRender();
  }

  /**
   * 切换当前 Agent
   */
  setCurrentAgent(agentId: string): void {
    this.sidebar.setCurrentAgent(agentId);
    this.tui.requestRender();
  }

  /**
   * 处理用户输入提交
   */
  private async handleSubmit(text: string): Promise<void> {
    // 显示用户消息
    this.chatArea.addMessage({
      role: 'user',
      userId: 'cli-user',
      content: text,
      timestamp: new Date(),
    });

    // 触发回调
    if (this.onMessage) {
      await this.onMessage(text);
    }
  }

  /**
   * 渲染 TUI（由 pi-tui 调用）
   */
  // render(_width: number): string[] {
  //   // 容器组件由 pi-tui 自动渲染子组件
  //   return [];
  // }
}
