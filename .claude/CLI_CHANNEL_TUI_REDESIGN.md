# CLIChannel TUI 改进设计

## 1. 当前实现分析

### 1.1 现有代码结构

```typescript
// src/channel/CLIChannel.ts
export class CLIChannel extends BaseChannel {
  private rl?: ReturnType<typeof createInterface>;

  async start(): Promise<void> {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n🤖 Agent Swarm CLI');
    console.log('输入消息发送给 Agent，输入 /exit 退出\n');

    this.rl.on('line', this.lineHandler);
  }

  async send(message: OutgoingMessage): Promise<void> {
    console.log(`\n📤 ${message.userId}: ${message.content}`);
  }
}
```

### 1.2 问题清单

| 问题 | 当前状态 | 期望状态 |
|------|----------|----------|
| 输入方式 | Node.js readline | pi-tui Editor（多行、历史） |
| 输出格式 | 纯文本 console.log | Markdown 渲染 |
| Agent 列表 | 无显示 | 侧边栏显示 |
| 会话历史 | 无显示 | 主区域显示 |
| 快捷键 | 无 | Alt+A/H/Q 等 |
| 状态指示 | 无 | 连接/思考状态 |

---

## 2. TUI 架构设计

### 2.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Agent Swarm v0.1.0                    [translator] ●     │ ← Header
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Agents  │  ┌────────────────────────────────────────────┐ │
│          │  │ 你: 请翻译这句话              14:32         │ │
│ □ trans  │  │ translator: Please translate this sentence │ │
│ ■ engl   │  │                                            │ │
│ □ code   │  │ 你: 翻译成英文                14:33         │ │
│          │  │ translator: Translate to English           │ │
│          │  │                                            │ │
│          │  └────────────────────────────────────────────┘ │
│ Alt+A    │                                                  │
│ 切换     │                    ↑↓ 滚动查看历史                │
├──────────┴──────────────────────────────────────────────────┤
│ > 输入消息...                              Alt+H 帮助       │ ← Editor
└─────────────────────────────────────────────────────────────┘
```

### 2.2 组件层次结构

```
TUI (ProcessTerminal)
├── Header (固定)
├── MainContainer
│   ├── AgentSidebar (左侧，固定宽度)
│   └── ChatAreaContainer
│       ├── MessageHistory (可滚动)
│       └── StatusLine (状态)
└── Editor (底部，固定高度)
```

---

## 3. 组件实现设计

### 3.1 CLIChannelTUI 主类

```typescript
// src/channel/cli/CLIChannelTUI.ts
import { TUI, Editor, ProcessTerminal, Container } from "@mariozechner/pi-tui";
import { Header } from "./components/Header.js";
import { AgentSidebar } from "./components/AgentSidebar.js";
import { ChatArea } from "./components/ChatArea.js";
import { StatusLine } from "./components/StatusLine.js";
import { defaultTheme } from "./themes/default.js";

export interface CLIChannelTUIOptions {
  agentsPath: string;
  currentAgent?: string;
}

export class CLIChannelTUI extends Container {
  private terminal: ProcessTerminal;
  private tui: TUI;
  private editor: Editor;
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
    const header = new Header(options.agentsPath);

    this.sidebar = new AgentSidebar(options.agentsPath, options.currentAgent);
    this.chatArea = new ChatArea();
    this.statusLine = new StatusLine();
    this.editor = new Editor(this.tui, defaultTheme.editor);

    // 配置编辑器
    this.editor.onSubmit = async (text) => {
      await this.handleSubmit(text);
    };

    // 添加子组件
    this.tui.addChild(header);
    this.addChild(this.mainContainer);
    this.tui.addChild(this.editor);

    // 注册快捷键
    this.setupKeybindings();
  }

  async start(): Promise<void> {
    this.tui.start();
  }

  async stop(): Promise<void> {
    this.tui.stop();
  }

  // 接收 Agent 消息并显示
  async receiveMessage(userId: string, content: string): Promise<void> {
    this.chatArea.addMessage({
      role: 'assistant',
      userId,
      content,
      timestamp: new Date(),
    });
    this.tui.requestRender();
  }

  // 显示 Agent 思考状态
  setThinking(thinking: boolean): void {
    this.statusLine.setThinking(thinking);
    this.tui.requestRender();
  }

  // 切换当前 Agent
  setCurrentAgent(agentId: string): void {
    this.sidebar.setCurrentAgent(agentId);
    this.tui.requestRender();
  }

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

  private setupKeybindings(): void {
    // 全局快捷键处理
    this.tui.addInputListener((data) => {
      if (matchesKey(data, "Alt+A")) {
        // 显示 Agent 选择器
        this.showAgentSelector();
        return { consume: true };
      }
      if (matchesKey(data, "Alt+H")) {
        // 显示帮助
        this.showHelp();
        return { consume: true };
      }
      if (matchesKey(data, "Alt+Q")) {
        // 退出
        this.onExit?.();
        return { consume: true };
      }
      return undefined;
    });
  }

  private showAgentSelector(): void {
    const agents = this.sidebar.getAgents();
    const selector = new AgentSelector(agents, (agentId) => {
      this.onAgentChange?.(agentId);
      this.tui.hideOverlay();
    });
    this.tui.showOverlay(selector, {
      width: 40,
      anchor: 'left-center',
      offsetX: 12, // sidebar width + padding
    });
  }

  private showHelp(): void {
    const help = new HelpOverlay();
    this.tui.showOverlay(help, { anchor: 'center' });
  }
}
```

### 3.2 AgentSidebar 组件

```typescript
// src/channel/cli/components/AgentSidebar.ts
import { Container, Text, Box, type Component } from "@mariozechner/pi-tui";
import type { AgentInfo } from "../../cli/commands/list.js";

export class AgentSidebar extends Container implements Component {
  private agents: AgentInfo[] = [];
  private currentAgentId?: string;

  constructor(agentsPath: string, currentAgent?: string) {
    super();
    this.loadAgents(agentsPath);
    this.currentAgentId = currentAgent;
  }

  async loadAgents(agentsPath: string): Promise<void> {
    // 扫描 agents 目录
    const { listCommand } = await import("../../cli/commands/list.js");
    const result = await listCommand(agentsPath, {});
    this.agents = result.agents || [];
    this.invalidate();
  }

  setCurrentAgent(agentId: string): void {
    this.currentAgentId = agentId;
    this.invalidate();
  }

  getAgents(): AgentInfo[] {
    return this.agents;
  }

  render(width: number): string[] {
    const lines: string[] = [];

    // 标题
    lines.push(chalk.bold(' Agents'));

    // Agent 列表
    for (const agent of this.agents) {
      const isSelected = agent.id === this.currentAgentId;
      const icon = isSelected ? '■' : '□';
      const color = isSelected ? chalk.cyan : chalk.gray;
      lines.push(` ${color(icon)} ${agent.id}`);
    }

    // 提示
    lines.push('');
    lines.push(chalk.dim(' Alt+A'));
    lines.push(chalk.dim(' 切换'));

    return lines;
  }
}
```

### 3.3 ChatArea 组件

```typescript
// src/channel/cli/components/ChatArea.ts
import { Container, Markdown, type Component } from "@mariozechner/pi-tui";

interface ChatMessage {
  role: 'user' | 'assistant';
  userId: string;
  content: string;
  timestamp: Date;
}

export class ChatArea extends Container implements Component {
  private messages: ChatMessage[] = [];
  private scrollOffset = 0;
  private maxVisible = 20;

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.invalidate();
  }

  clear(): void {
    this.messages = [];
    this.invalidate();
  }

  render(width: number): string[] {
    const lines: string[] = [];

    // 显示最近的消息（考虑滚动）
    const visibleMessages = this.messages.slice(-this.maxVisible - this.scrollOffset);

    for (const msg of visibleMessages) {
      const time = msg.timestamp.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const prefix = msg.role === 'user'
        ? chalk.green(`你: `)
        : chalk.cyan(`${msg.userId}: `);

      // Markdown 渲染
      const md = new Markdown(msg.content, 0, 0, markdownTheme);
      const rendered = md.render(width - 10);

      lines.push(`${chalk.dim(time)} ${prefix}${rendered[0]}`);
      lines.push(...rendered.slice(1).map(l => '          ' + l));
      lines.push('');
    }

    return lines;
  }
}
```

### 3.4 StatusLine 组件

```typescript
// src/channel/cli/components/StatusLine.ts
import { Text, type Component } from "@mariozechner/pi-tui";

export class StatusLine implements Component {
  private thinking = false;
  private statusText = '';

  setThinking(thinking: boolean): void {
    this.thinking = thinking;
    this.statusText = thinking ? '▶ 正在思考...' : '';
    this.invalidate();
  }

  render(width: number): string[] {
    if (!this.thinking) return [];

    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴'][Math.floor(Date.now() / 100) % 6];
    return [`${chalk.cyan(spinner)} ${this.statusText}`];
  }
}
```

### 3.5 主题定义

```typescript
// src/channel/cli/themes/default.ts
import chalk from 'chalk';

export const defaultTheme = {
  editor: {
    borderColor: (s: string) => chalk.gray(s),
    selectList: {
      selectedPrefix: (s: string) => chalk.cyan(s),
      selectedText: (s: string) => chalk.cyan(s),
      description: (s: string) => chalk.dim(s),
      scrollInfo: (s: string) => chalk.dim(s),
      noMatch: (s: string) => chalk.yellow(s),
    },
  },
  markdown: {
    heading: (s: string) => chalk.bold.cyan(s),
    link: (s: string) => chalk.blue.underline(s),
    linkUrl: (s: string) => chalk.dim.blue(s),
    code: (s: string) => chalk.yellow(s),
    codeBlock: (s: string) => s,
    codeBlockBorder: (s: string) => chalk.gray(s),
    quote: (s: string) => chalk.dim(s),
    quoteBorder: (s: string) => chalk.dim(s),
    hr: (s: string) => chalk.gray(s),
    listBullet: (s: string) => chalk.cyan(s),
    bold: (s: string) => chalk.bold(s),
    italic: (s: string) => chalk.italic(s),
    strikethrough: (s: string) => chalk.strikethrough(s),
    underline: (s: string) => chalk.underline(s),
  },
};
```

---

## 4. 集成到 CLIChannel

### 4.1 重构后的 CLIChannel

```typescript
// src/channel/CLIChannel.ts
import { CLIChannelTUI } from './cli/CLIChannelTUI.js';
import { BaseChannel } from './BaseChannel.js';
import type { IncomingMessage, OutgoingMessage } from './types.js';

export class CLIChannel extends BaseChannel {
  readonly id = 'cli';
  readonly name = 'Command Line Interface';

  private tui?: CLIChannelTUI;
  private currentUserId = 'cli-user';
  private currentConversationId?: string;

  async start(): Promise<void> {
    if (this.started) return;

    this.tui = new CLIChannelTUI({
      agentsPath: join(process.env.HOME || '~', '.agent-swarm', 'agents'),
    });

    // 设置回调
    this.tui.onMessage = async (content) => {
      const message: IncomingMessage = {
        channelId: this.id,
        userId: this.currentUserId,
        conversationId: this.currentConversationId,
        content,
      };
      await this.handleMessage(message);
    };

    this.tui.onAgentChange = (agentId) => {
      // 处理 Agent 切换
      console.log(`Switched to agent: ${agentId}`);
    };

    this.tui.onExit = async () => {
      await this.stop();
      process.exit(0);
    };

    await this.tui.start();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    await this.tui?.stop();
    this.started = false;
  }

  async send(message: OutgoingMessage): Promise<void> {
    // 使用 TUI 显示消息
    await this.tui?.receiveMessage(message.userId, message.content);
  }

  setUserId(userId: string): void {
    this.currentUserId = userId;
  }

  setConversationId(conversationId: string): void {
    this.currentConversationId = conversationId;
  }
}
```

---

## 5. 实现计划

### Phase 1: 基础框架（1 天）

**任务**：
1. 安装依赖 `@mariozechner/pi-tui@0.56.3`
2. 创建目录结构
   ```
   src/channel/cli/
   ├── CLIChannelTUI.ts
   ├── components/
   │   ├── Header.ts
   │   ├── AgentSidebar.ts
   │   ├── ChatArea.ts
   │   ├── StatusLine.ts
   │   ├── AgentSelector.ts
   │   └── HelpOverlay.ts
   └── themes/
       └── default.ts
   ```
3. 实现 CLIChannelTUI 主类
4. 实现基础布局（Header + Editor）

### Phase 2: 组件实现（2 天）

**任务**：
1. AgentSidebar 组件
2. ChatArea 组件（Markdown 渲染）
3. StatusLine 组件（状态指示）
4. 主题系统

### Phase 3: 功能集成（1-2 天）

**任务**：
1. 集成到现有 CLIChannel
2. 消息路由（用户 → Agent → 用户）
3. Agent 切换功能
4. 快捷键处理

### Phase 4: 测试与优化（1 天）

**任务**：
1. 单元测试
2. 集成测试
3. 性能优化

---

## 6. 依赖更新

```diff
{
  "dependencies": {
+   "@mariozechner/pi-tui": "^0.56.3",
    "@mariozechner/pi-agent-core": "^0.56.2",
    "@mariozechner/pi-ai": "^0.56.2",
    ...
  }
}
```

---

## 7. 兼容性考虑

### 7.1 保留简单模式

添加环境变量控制：

```typescript
const USE_TUI = process.env.SWARM_TUI !== 'false';

if (USE_TUI) {
  // 使用 pi-tui
} else {
  // 使用原有 readline
}
```

### 7.2 逐步迁移

1. 先实现 TUI 版本
2. 添加 `--tui` / `--simple` 标志
3. 默认使用 TUI
4. 后续移除旧代码

---

**文档版本**: 1.0
**创建日期**: 2026-03-07
**作者**: architect agent
**状态**: 待审核
