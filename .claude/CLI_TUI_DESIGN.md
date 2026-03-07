# CLI TUI 改进设计文档

## 1. 现状分析

### 1.1 当前 `swarm start` 实现

当前 `swarm start` 命令启动后显示静态文本，然后进入简单的 REPL 循环：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 服务启动成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间: ~/.agent-swarm
✓ 运行模式: 交互模式
...

📝 可用命令:
  - 输入消息发送给 Agent
  - 输入 /exit 或 Ctrl+C 退出
```

**存在的问题：**
- 仅支持单 Agent 对话，无法在多个 Agent 间切换
- 无消息历史查看
- 无会话状态管理（当前连接的 Agent、消息计数等）
- 无实时状态更新（Agent 响应状态、错误提示等）
- 用户体验与 Claude Code 等现代 CLI 工具差距较大

---

## 2. 技术选型对比

### 2.1 选项对比表

| 特性 | @mariozechner/pi-tui | Ink | Blessed | Rezi |
|------|---------------------|-----|---------|------|
| 语言 | TypeScript | TypeScript/React | JavaScript | TypeScript |
| 架构 | 组件式 | React 组件 | 命令式 | C 核心 + TS 前端 |
| 差异渲染 | ✅ 是 | ❌ 否 | ❌ 否 | ✅ 是 |
| 同步输出 | ✅ CSI 2026 | ⚠️ 部分支持 | ❌ 否 | ✅ 是 |
| IME 支持 | ✅ 焦点系统 | ⚠️ 有限 | ❌ 否 | ❌ 否 |
| 内置组件 | 10+ | 丰富 | 中等 | 有限 |
| 依赖关系 | 项目已使用 pi-agent-core | 需要新依赖 | 维护状态差 | 新项目 |
| 维护状态 | ✅ 活跃（2026-03） | ✅ 活跃 | ❌ 停滞 | ⚠️ 较新 |
| 社区生态 | 与 pi-mono 生态集成 | 广泛 | 旧项目 | 起步阶段 |

### 2.2 推荐方案：**@mariozechner/pi-tui**

**理由：**

1. **项目已集成 pi-mono 生态**
   - 当前使用 `@mariozechner/pi-agent-core` 和 `@mariozechner/pi-ai`
   - 添加 `@mariozechner/pi-tui` 无需额外架构调整

2. **差异渲染 + 同步输出**
   - CSI 2026 原子屏幕更新，无闪烁
   - 仅更新变化内容，性能优异

3. **完整组件库**
   - Editor（多行编辑器）
   - Markdown（渲染 Markdown）
   - SelectList（选择列表）
   - Input（单行输入）
   - Loader（加载动画）

4. **IME 支持**
   - Focusable 接口确保中日韩输入法正确定位

5. **与 Claude Code 同源技术**
   - `pi-coding-agent` 使用相同技术栈
   - 已验证在生产环境中的稳定性

---

## 3. 改进设计方案

### 3.1 UI 布局设计

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Agent Swarm v0.1.0          [translator] [● 运行中]      │ ← 标题栏
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  你: 请翻译这句话                    14:32                    │ ← 对话历史
│  translator: Please translate this sentence                │
│                                                               │
│  你: 翻译成英文                  14:33                        │
│  translator: Translate to English                           │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ▶ 正在思考...                           [□□□□□□□□]  │ │ ← 状态区
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ > 输入消息...                                    Alt+A 帮助  │ ← 输入区
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心功能模块

#### 3.2.1 会话管理

- **Agent 切换器**：`Alt+A` 或 `/agent <name>`
- **会话历史**：上下滚动查看之前的对话
- **会话持久化**：自动保存到 `~/.agent-swarm/sessions/`

#### 3.2.2 状态指示

- **连接状态**：显示当前 Agent 在线/离线
- **响应状态**：思考中、输入中、错误等
- **Token 统计**：可选显示当前会话使用量

#### 3.2.3 交互增强

- **Markdown 渲染**：Agent 输出的 Markdown 格式化显示
- **代码高亮**：代码块语法高亮
- **图片显示**：终端内联图片（Kitty/iTerm2 协议）
- **快捷键**：常用操作的快捷键绑定

### 3.3 快捷键设计

| 快捷键 | 功能 |
|--------|------|
| `Alt+A` | 切换 Agent |
| `Alt+C` | 清空当前会话 |
| `Alt+H` | 显示帮助 |
| `Alt+Q` / `Ctrl+C` | 退出 |
| `Ctrl+L` | 清屏 |
| `↑/↓` | 历史消息导航 |

---

## 4. 实现计划

### 4.1 Phase 1: 基础 TUI 框架（1-2 天）

**任务清单：**

1. 安装依赖
   ```bash
   npm install @mariozechner/pi-tui@0.56.3
   ```

2. 创建 `src/cli/tui/` 目录结构
   ```
   src/cli/tui/
   ├── index.ts              # TUI 入口
   ├── components/           # 自定义组件
   │   ├── Header.ts         # 标题栏
   │   ├── ChatArea.ts       # 对话区域
   │   ├── StatusBar.ts      # 状态栏
   │   └── InputArea.ts      # 输入区域
   ├── themes/               # 主题定义
   │   └── default.ts        # 默认主题
   └── utils/                # 工具函数
       └── markdown.ts       # Markdown 处理
   ```

3. 实现基础布局
   - 初始化 TUI 和 Terminal
   - 创建 Header（标题、Agent 选择器）
   - 创建 ChatArea（消息历史显示）
   - 创建 InputArea（Editor 组件）

### 4.2 Phase 2: 对话功能集成（2-3 天）

**任务清单：**

1. 消息路由集成
   - 连接 AgentSwarm 消息总线
   - 处理用户输入 → Agent 响应流程

2. Markdown 渲染
   - 使用 pi-tui 的 Markdown 组件
   - 配置主题样式

3. 状态管理
   - Agent 状态监听
   - 错误处理和显示
   - 加载状态动画

### 4.3 Phase 3: 高级功能（2-3 天）

**任务清单：**

1. Agent 切换
   - Agent 选择器 Overlay
   - 快捷键处理

2. 会话管理
   - 历史记录持久化
   - 会话恢复

3. 帮助系统
   - 帮助 Overlay
   - 快捷键提示

### 4.4 Phase 4: 测试与优化（1-2 天）

**任务清单：**

1. 单元测试
   - 组件渲染测试
   - 输入处理测试
   - 状态管理测试

2. 集成测试
   - 完整对话流程测试
   - Agent 切换测试

3. 性能优化
   - 差异渲染优化
   - 内存泄漏检查

---

## 5. 代码示例

### 5.1 TUI 初始化代码

```typescript
// src/cli/tui/index.ts
import { TUI, Editor, ProcessTerminal } from "@mariozechner/pi-tui";
import { Header } from "./components/Header.js";
import { ChatArea } from "./components/ChatArea.js";
import { StatusBar } from "./components/StatusBar.js";
import { defaultTheme } from "./themes/default.js";

export interface TUIOptions {
  workspacePath: string;
  swarm: AgentSwarm;
}

export async function startTUI(options: TUIOptions): Promise<void> {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // 设置主题
  tui.theme = defaultTheme;

  // 创建组件
  const header = new Header(options.workspacePath);
  const chatArea = new ChatArea();
  const statusBar = new StatusBar();
  const editor = new Editor(tui, defaultTheme.editor);

  // 配置编辑器提交
  editor.onSubmit = async (input) => {
    // 发送消息给 Agent
    await chatArea.sendMessage(input);
  };

  // 添加组件到 TUI
  tui.addChild(header);
  tui.addChild(chatArea);
  tui.addChild(statusBar);
  tui.addChild(editor);

  // 快捷键处理
  tui.onKey = (key) => {
    if (matchesKey(key, "Alt+A")) {
      tui.showOverlay(createAgentSelector(tui, options.swarm));
    } else if (matchesKey(key, "Alt+H")) {
      tui.showOverlay(createHelpOverlay());
    }
  };

  // 启动 TUI
  tui.start();

  return new Promise((resolve) => {
    tui.onStop = resolve;
  });
}
```

### 5.2 ChatArea 组件示例

```typescript
// src/cli/tui/components/ChatArea.ts
import { Component, Container, Markdown } from "@mariozechner/pi-tui";
import type { AgentSwarm } from "../../AgentSwarm.js";

export class ChatArea extends Container implements Component {
  private messages: Array<{role: string, content: string}> = [];
  private swarm?: AgentSwarm;

  constructor() {
    super();
    this.paddingX = 1;
    this.paddingY = 1;
  }

  async sendMessage(content: string): Promise<void> {
    // 添加用户消息
    this.addMessage("user", content);

    // 发送给 Agent
    if (this.swarm) {
      const response = await this.swarm.sendMessage(content);
      this.addMessage("assistant", response);
    }

    this.invalidate();
    this.tui?.requestRender();
  }

  addMessage(role: string, content: string): void {
    this.messages.push({ role, content });
  }

  render(width: number): string[] {
    const lines: string[] = [];

    for (const msg of this.messages) {
      const prefix = msg.role === "user" ? "你: " : "Agent: ";
      const markdown = new Markdown(msg.content);
      const rendered = markdown.render(width - prefix.length);
      lines.push(prefix + rendered[0]);
      lines.push(...rendered.slice(1));
    }

    return lines;
  }
}
```

---

## 6. pi-tui 核心概念详解

### 6.1 组件接口

所有 pi-tui 组件都实现 `Component` 接口：

```typescript
interface Component {
  render(width: number): string[];      // 返回渲染后的行数组
  handleInput?(data: string): void;     // 可选：处理键盘输入
  invalidate(): void;                   // 清除缓存，重新渲染
}
```

### 6.2 Focusable 接口（IME 支持）

对于需要光标和输入法支持的组件：

```typescript
import { CURSOR_MARKER, type Focusable } from "@mariozechner/pi-tui";

class MyInput implements Component, Focusable {
  focused: boolean = false;  // TUI 自动设置

  render(width: number): string[] {
    // 在光标位置发出 CURSOR_MARKER
    const marker = this.focused ? CURSOR_MARKER : "";
    return [`> ${beforeCursor}${marker}\x1b[7m${atCursor}\x1b[27m${afterCursor}`];
  }
}
```

### 6.3 Container 组件

用于组织子组件：

```typescript
import { Container } from "@mariozechner/pi-tui";

const container = new Container();
container.addChild(component);
container.removeChild(component);
container.clear();  // 移除所有子组件
```

### 6.4 Overlay 弹出层

用于对话框、菜单等临时 UI：

```typescript
// 基础用法（居中，最大 80 列）
const handle = tui.showOverlay(component);

// 高级用法（自定义位置和大小）
const handle = tui.showOverlay(component, {
  width: "80%",           // 宽度（百分比或绝对值）
  maxHeight: 20,          // 最大高度
  anchor: 'top-right',    // 锚点位置
  offsetX: 2,             // X 偏移
  offsetY: -1,            // Y 偏移
  margin: { top: 1, right: 2, bottom: 1, left: 2 },
  visible: (w, h) => w >= 100, // 响应式可见性
});

handle.hide();              // 永久移除
handle.setHidden(true);     // 临时隐藏
handle.isHidden();          // 检查状态
```

**锚点值**：`'center'`, `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`, `'top-center'`, `'bottom-center'`, `'left-center'`, `'right-center'`

---

## 7. 内置组件详解

### 7.1 Editor - 多行编辑器

```typescript
import { Editor } from "@mariozechner/pi-tui";

interface EditorTheme {
  borderColor: (str: string) => string;
  selectList: SelectListTheme;
}

const editor = new Editor(tui, theme, { paddingX: 1 });

// 事件处理
editor.onSubmit = (text) => console.log("提交:", text);
editor.onChange = (text) => console.log("变更:", text);

// 配置
editor.disableSubmit = true;  // 禁用提交
editor.setAutocompleteProvider(provider);
editor.borderColor = (s) => chalk.blue(s);

// 历史记录
editor.addToHistory(text);  // 添加到历史（上下箭头导航）
```

**功能**：
- 多行编辑、自动换行
- 斜杠命令自动完成（输入 `/`）
- 文件路径自动完成（Tab）
- 大段粘贴处理（>10 行显示标记）
- 撤销/重做栈

**快捷键**：
- `Enter` 提交，`Shift+Enter` 换行
- `Tab` 自动完成
- `Ctrl+A/E` 行首/行尾
- `Ctrl+W` 删除单词

### 7.2 Markdown - Markdown 渲染

```typescript
import { Markdown } from "@mariozechner/pi-tui";

interface MarkdownTheme {
  heading: (text: string) => string;
  link: (text: string) => string;
  code: (text: string) => string;
  codeBlock: (text: string) => string;
  quote: (text: string) => string;
  bold: (text: string) => string;
  italic: (text: string) => string;
  // ...更多样式
}

const md = new Markdown(markdownText, 1, 1, theme);
md.setText("更新内容");
```

### 7.3 SelectList - 选择列表

```typescript
import { SelectList } from "@mariozechner/pi-tui";

interface SelectItem {
  value: string;
  label: string;
  description?: string;
}

const list = new SelectList(items, 5, theme);

list.onSelect = (item) => console.log("选中:", item);
list.onCancel = () => console.log("取消");
list.onSelectionChange = (item) => console.log("高亮:", item);
list.setFilter("搜索词");  // 过滤项
```

### 7.4 Loader - 加载动画

```typescript
import { Loader } from "@mariozechner/pi-tui";

const loader = new Loader(tui,
  (s) => chalk.cyan(s),  // spinner 颜色
  (s) => chalk.gray(s),  // 消息颜色
  "加载中..."
);
loader.start();
loader.setMessage("继续加载...");
loader.stop();
```

---

## 8. 测试策略

### 6.1 单元测试

```typescript
// tests/cli/tui/components/Header.test.ts
import { describe, it, expect } from 'vitest';
import { Header } from '../../../src/cli/tui/components/Header.js';

describe('Header 组件', () => {
  it('应该渲染标题和工作空间路径', () => {
    const header = new Header('/test/workspace');
    const output = header.render(80);

    expect(output[0]).toContain('Agent Swarm');
    expect(output[0]).toContain('/test/workspace');
  });

  it('应该显示当前 Agent 名称', () => {
    const header = new Header('/test/workspace');
    header.setCurrentAgent('translator');

    const output = header.render(80);
    expect(output[0]).toContain('translator');
  });
});
```

### 6.2 集成测试

```typescript
// tests/cli/tui/tuiIntegration.test.ts
import { describe, it, expect } from 'vitest';
import { TestTerminal } from './helpers/testTerminal.js';
import { startTUI } from '../../src/cli/tui/index.js';

describe('TUI 集成测试', () => {
  it('应该完整启动和关闭', async () => {
    const terminal = new TestTerminal();
    const tui = await startTUI({
      workspacePath: '/tmp/test-workspace',
      swarm: mockSwarm,
    });

    // 发送测试输入
    terminal.sendInput('你好\n');

    // 等待响应
    await waitFor(() => {
      expect(terminal.output).toContain('你好');
    });

    // 关闭 TUI
    terminal.sendInput('Ctrl+C');
    await tui;
  });
});
```

---

## 9. 依赖更新

### 7.1 package.json 变更

```diff
{
  "dependencies": {
+   "@mariozechner/pi-tui": "^0.56.3",
    "@mariozechner/pi-agent-core": "^0.56.2",
    "@mariozechner/pi-ai": "^0.56.2",
    "@anthropic-ai/sdk": "^0.32.0",
    ...
  }
}
```

---

## 10. 回退计划

如果 TUI 实现遇到问题：

1. **保守方案**：保持当前简单 REPL，添加 ANSI 颜色增强
2. **渐进增强**：先实现基本布局，逐步添加功能
3. **Feature Flag**：添加 `--tui` 和 `--simple` 选项，用户可选择

---

## 11. 参考资料

- [pi-tui README](https://npm.im/@mariozechner/pi-tui)
- [pi-coding-agent 源码](https://npm.im/@mariozechner/pi-coding-agent)
- [Charmbracelet Bubble Tea](https://github.com/charmbracelet/bubbletea) (Go 参考)
- [Ink - React for CLI](https://github.com/vadimdemedes/ink)

---

**文档版本**: 1.0
**创建日期**: 2026-03-07
**作者**: architect agent
**状态**: 待审核
