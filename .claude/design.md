# Agent Swarm 架构设计文档

## 1. 项目概述

Agent Swarm 是一个多 Agent 协作框架，支持快速创建 Agent、统一消息路由和 Session 持久化。

### 核心能力

- **多 Agent 管理**: 懒加载、空闲清理、生命周期管理
- **统一消息路由**: 支持单播、广播、工作流编排
- **多渠道接入**: CLI、钉钉、飞书等平台适配
- **会话持久化**: JSONL 格式存储，支持上下文恢复

### 设计原则

1. **AI Native**: 用户通过自然语言描述需求，AI 自动生成配置
2. **懒加载**: 收到消息时才启动 Agent
3. **待机保持**: Agent 启动后保持待机，可处理后续消息
4. **空闲清理**: 长时间无活动的 Agent 可被卸载
5. **不可变数据**: 避免隐藏副作用，便于调试和并发

### 1.1 AI Native 设计

**核心理念**：用户通过自然语言描述需求，AI 自动生成配置，无需手动编写 JSON。

**传统方式 vs AI Native**：

| 传统方式 | AI Native |
|---------|-----------|
| 手写 `config.json` | 告诉 Claude "创建一个客服 Agent" |
| 查阅文档了解字段 | Claude 读取 skills 自动生成正确配置 |
| 容易字段拼写错误 | AI 保证配置格式正确 |

**实现方式**：
1. 在 `~/.agent-swarm/.claude/skills/` 存放创建/配置 Agent 的技能文件
2. 用户在 Claude Code 中描述需求
3. Claude 读取对应的 skill 文件，自动生成配置

**示例对话**：
```
用户: "创建一个翻译助手 Agent"
Claude: [读取 create-agent.md] → 自动生成 config.json 和 prompt.md
```

**Skills 目录结构**：
```
~/.agent-swarm/.claude/skills/
├── create-agent.md      # 创建新 Agent 的技能
├── configure-agent.md   # 配置现有 Agent 的技能
├── add-channel.md       # 添加消息渠道的技能
└── ...                  # 更多技能
```

---

## 2. 核心架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      External Channels                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   CLI    │  │ 钉钉     │  │  飞书    │  │  更多...  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼─────────────┼─────────────┼───────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                      AgentSwarm (主类)                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   MessageBus                         │    │
│  │         (订阅/发布，路由，ACK 追踪)                   │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Agent A   │  │  Agent B   │  │  Agent C   │            │
│  │  (懒加载)   │  │  (懒加载)   │  │  (懒加载)   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SessionManager + SessionStore           │    │
│  │         (会话管理，上下文持久化)                      │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Workspace (~/.agent-swarm)                 │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │      agents/        │  │     sessions/       │           │
│  │  Agent 配置和技能    │  │  会话存储和上下文    │           │
│  └─────────────────────┘  └─────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

| 组件 | 职责 | 文件位置 |
|------|------|----------|
| AgentSwarm | 主类，组装所有组件，协调消息流 | `src/AgentSwarm.ts` |
| AgentManager | Agent 生命周期管理（懒加载/清理） | `src/agent/AgentManager.ts` |
| MessageBus | 消息路由，订阅/发布，ACK 追踪 | `src/message/MessageBus.ts` |
| SessionManager | Session 生命周期管理 | `src/session/SessionManager.ts` |
| SessionStore | Session 持久化（JSONL 格式） | `src/session/JSONLSessionStore.ts` |
| Channel | 外部平台适配器 | `src/channel/*.ts` |
| Container | 依赖注入容器 | `src/container.ts` |
| Workspace | 用户数据存储目录 | `~/.agent-swarm/` |

### 2.3 Workspace 说明

Workspace 是用户数据存储目录，与项目代码分离：

- **默认位置**: `~/.agent-swarm/`
- **可配置**: 通过环境变量 `AGENT_SWARM_WORKSPACE` 或代码参数自定义
- **内容**: Agent 配置、会话数据、上下文文件

---

## 3. 数据流设计

### 3.1 消息路由规则

```
1. 外部消息 → Channel → Swarm → Agent
2. Agent → Agent（通过 to 字段指定目标 Agent）
3. Agent → 外部（通过 replyTo 字段指定响应目标）
```

### 3.2 消息处理流程

```
用户消息
    │
    ▼
Channel.handleMessage()
    │
    ▼
AgentSwarm.handleIncomingMessage()
    │
    ├── SessionManager.getOrCreate()  // 获取或创建会话
    │
    ▼
MessageBus.send()
    │
    ▼
AgentSwarm.handleMessage()  // 订阅了 '*' 通配符
    │
    ├── 判断目标是 Agent 还是 Channel
    │
    ├── [Agent] → sendToAgent()
    │       │
    │       ├── AgentManager.exists()  // 检查 Agent 是否存在
    │       ├── SessionStore.addAgent()  // 将 Agent 添加到会话
    │       ├── SessionStore.loadContext()  // 读取会话上下文
    │       ├── AgentManager.process()  // 调用 Agent 处理
    │       └── 返回响应（通过 replyTo 或 from）
    │
    └── [Channel] → sendToChannel()
            │
            └── Channel.send()  // 发送到外部平台
```

### 3.3 工作流编排

支持 `oncomplete` 和 `onerror` 工作流：

```typescript
interface WorkflowConfig {
  oncomplete?: string | string[];  // 完成后发消息给谁
  onerror?: string | string[];     // 失败后发消息给谁
}
```

流程：
```
原始消息 → Agent A → 成功 → oncomplete → Agent B
                     │
                     └── 失败 → onerror → Error Handler
```

---

## 4. 接口设计

### 4.1 Message 结构

```typescript
interface Message {
  // 元数据
  id: string;
  timestamp: number;
  version: '1.0';

  // 路由
  from: string;              // 发送者 ID
  to: string | string[];     // 目标（Agent ID 或 Channel ID）
  sessionId: string;         // 关联会话

  // 类型
  type: 'request' | 'response' | 'event' | 'error';

  // 异步响应
  correlationId?: string;    // 匹配请求和响应
  replyTo?: string;          // 响应目标

  // 内容
  payload: {
    task?: string;
    data?: unknown;
    context?: string;        // 会话上下文
    workflow?: WorkflowConfig;
  };

  // ACK 配置
  ack: {
    required: boolean;
    timeout: number;
    retry: number;
  };
}
```

### 4.2 Channel 接口

```typescript
interface IChannel {
  readonly id: string;
  readonly name: string;

  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: OutgoingMessage): Promise<void>;
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void;
  makeSessionId(message: IncomingMessage): string;
  toOutgoing(message: Message): OutgoingMessage;
  isAvailable(): boolean;
}
```

### 4.3 Session 结构

```typescript
interface Session {
  // 标识
  id: string;                  // channelId:conversationId:threadId:userId
  channelId: string;
  channelUserId: string;
  conversationId?: string;
  threadId?: string;

  // 元数据
  createdAt: number;
  lastActiveAt: number;
  expiredAt?: number;

  // 关联的 Agent 列表
  agents: string[];

  // 文件路径
  contextPath: string;         // context.md 路径
  messagesPath: string;        // messages.jsonl 路径

  // 运行时上下文
  context: {
    messages: string[];        // Message ID 列表（最近 20 条）
    variables: Record<string, unknown>;
    agentStates: Map<string, unknown>;
  };
}
```

### 4.4 核心接口抽象

```typescript
// 消息总线接口
interface IMessageBus {
  send(message: Message, options?: SendOptions): Promise<void>;
  subscribe(agentId: string, handler: MessageHandler): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<HealthStatus>;
  getStats(): MessageBusStats;
}

// Session 存储接口
interface ISessionStore {
  init(): Promise<void>;
  get(sessionId: string): Promise<Session | null>;
  getOrCreate(options: SessionCreateOptions): Promise<Session>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  loadMessages(sessionId: string, limit?: number): Promise<Message[]>;
  loadContext(sessionId: string): Promise<string>;
  saveContext(sessionId: string, context: string): Promise<void>;
  addAgent(sessionId: string, agentId: string): Promise<void>;
  saveAgentState(sessionId: string, agentId: string, state: unknown): Promise<void>;
  loadAgentState(sessionId: string, agentId: string): Promise<unknown>;
  setVariable(sessionId: string, key: string, value: unknown): Promise<void>;
  getVariable(sessionId: string, key: string): Promise<unknown>;
  update(sessionId: string, updater: (session: Session) => void): Promise<Session | null>;
  cleanup(before?: Date): Promise<number>;
  stats(): SessionStoreStats;
}
```

---

## 5. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 运行时 | Node.js 20+ | ES2022 特性支持 |
| 语言 | TypeScript 5.3 | 严格模式，ESM 模块 |
| LLM SDK | @anthropic-ai/sdk | Anthropic API |
| Agent 核心 | @mariozechner/pi-agent-core | Agent 状态管理 |
| AI 模型 | @mariozechner/pi-ai | 模型抽象层 |
| 测试 | Vitest | 单元测试 + 覆盖率 |
| 配置 | js-yaml | YAML 配置解析 |

---

## 6. 目录结构

### 6.1 项目目录 vs Workspace 目录

Agent Swarm 采用**代码与数据分离**的设计：

- **项目目录**: 存放源代码和配置，可版本控制
- **Workspace 目录**: 存放用户数据（agents、sessions），独立于项目

```
┌─────────────────────────────────────────────────────────────────┐
│                        文件系统布局                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ~/projects/agent-swarm/          # 项目目录（可 git clone）     │
│  ├── src/                         # 源代码                      │
│  ├── dist/                        # 编译产物                     │
│  ├── package.json                                               │
│  └── ...                                                        │
│                                                                 │
│  ~/.agent-swarm/                  # Workspace 目录（用户数据）   │
│  ├── agents/                      # Agent 配置                  │
│  │   └── my-agent/                                              │
│  └── sessions/                    # 会话存储                    │
│      └── cli:user123/                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Workspace 配置

**默认位置**: `~/.agent-swarm`

**自定义方式**:

1. **环境变量**:
```bash
export AGENT_SWARM_WORKSPACE=/custom/path/workspace
```

2. **代码配置**:
```typescript
const swarm = new AgentSwarm({
  agentsPath: '/custom/path/agents',
  sessionsPath: '/custom/path/sessions',
});
```

3. **配置文件** (未来支持):
```yaml
# ~/.agent-swarm/config.yaml
workspace: /custom/path/workspace
```

### 6.2.1 全局配置文件

**文件位置**: `~/.agent-swarm/config.json`

**配置内容**:
```json
{
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-..."
  },
  "workspace": "/custom/path/workspace"
}
```

### 6.2.2 API 密钥配置方式

支持三种配置方式，按优先级加载：

| 优先级 | 方式 | 位置 | 适用场景 |
|--------|------|------|----------|
| 1 | 环境变量 | `ANTHROPIC_API_KEY` | CI/CD、向后兼容 |
| 2 | 共享配置 | `~/.agent-swarm/config.json` | 多 Agent 共享密钥 |
| 3 | Agent 专用 | `~/.agent-swarm/agents/{id}/config.json` | Agent 独立密钥 |

**Agent 专用密钥配置**（在 Agent config.json 中）:
```json
{
  "id": "my-agent",
  "name": "My Agent",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "apiKey": "sk-ant-...",     // Agent 专用密钥（可选）
  "channels": ["cli"]
}
```

### 6.2.3 AI Native 交互流程

创建 Agent 时，Claude 询问用户密钥配置方式：

```
Claude: 请选择 API 密钥配置方式：
A. 使用共享密钥（~/.agent-swarm/config.json）
B. 使用 Agent 专用密钥
C. 手动配置（稍后自行填写）

用户: A

Claude: 已使用共享密钥创建 Agent。
```

### 6.3 Workspace 目录结构

```
~/.agent-swarm/                    # Workspace 根目录
├── config.json                    # 全局配置（API 密钥等）
│
├── .claude/                       # AI Native 技能目录
│   └── skills/                    # Claude 创建/配置 Agent 的技能
│       ├── create-agent.md        # 如何创建 Agent
│       ├── configure-agent.md     # 如何配置 Agent
│       └── add-channel.md         # 如何添加渠道
│
├── agents/                        # Agent 配置目录
│   ├── README.md                  # Agent 创建指南
│   │
│   └── <agent-id>/                # 单个 Agent 目录
│       ├── config.json            # Agent 配置（必需）
│       ├── prompt.md              # System Prompt（必需）
│       ├── MEMORY.md              # 长期记忆（可选）
│       └── skills/                # 技能目录（可选）
│           └── <skill-name>/
│               └── SKILL.md
│
└── sessions/                      # 会话存储目录
    ├── index.jsonl                # 会话索引
    ��
    └── <sessionId>/               # 单个会话目录
        ├── context.md             # 会话上下文
        └── messages.jsonl         # 消息历史
```

### 6.4 项目目录结构

`npm install` 后的项目目录：

```
agent-swarm/                       # 项目根目录
├── .claude/                       # Claude Code 配置
│   ├── CLAUDE.md                  # 项目指令
│   └── design.md                  # 本文档
│
├── src/                           # 源代码（TypeScript）
│   ├── index.ts                   # 统一导出
│   ├── main.ts                    # CLI 入口
│   ├── AgentSwarm.ts              # 主类
│   ├── container.ts               # 依赖注入容器
│   │
│   ├── core/                      # 核心接口定义
│   │   ├── index.ts
│   │   ├── IMessageBus.ts
│   │   ├── ISessionStore.ts
│   │   └── IMessageStore.ts
│   │
│   ├── agent/                     # Agent 管理
│   │   ├── index.ts
│   │   ├── AgentManager.ts        # 生命周期管理
│   │   ├── config.ts              # 配置加载
│   │   ├── prompt.ts              # Prompt 构建
│   │   ├── memory.ts              # 记忆管理
│   │   ├── skills.ts              # Skills 加载
│   │   └── types.ts               # 类型定义
│   │
│   ├── message/                   # 消息系统
│   │   ├── index.ts
│   │   ├── MessageBus.ts          # 消息总线
│   │   ├── ACKTracker.ts          # ACK 追踪
│   │   ├── JSONLMessageStore.ts
│   │   └── types.ts
│   │
│   ├── session/                   # 会话管理
│   │   ├── index.ts
│   │   ├── SessionManager.ts
│   │   ├── JSONLSessionStore.ts
│   │   └── types.ts
│   │
│   ├── channel/                   # 渠道适配器
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── BaseChannel.ts         # 抽象基类
│   │   ├── CLIChannel.ts          # 命令行
│   │   ├── DingTalkChannel.ts     # 钉钉
│   │   └── FeishuChannel.ts       # 飞书
│   │
│   └── reliability/               # 可靠性
│       ├── index.ts
│       └── RetryScheduler.ts
│
├── dist/                          # 编译产物（npm run build 后生成）
│   └── *.js                       # 编译后的 JavaScript
│
├── node_modules/                  # 依赖包（npm install 后生成）
│   └── ...
│
├── tests/                         # 测试文件
│   ├── mocks/                     # Mock 实现
│   ├── utils/                     # 测试工具
│   ├── REGRESSION_TEST_CASES.md   # 回归测试用例
│   ├── E2E_TEST_GUIDE.md          # E2E 测试指南
│   └── *.test.ts                  # 测试文件
│
├── coverage/                      # 覆盖率报告（测试后生成）
│   └── index.html
│
├── package.json                   # 项目配置
├── package-lock.json              # 依赖锁定
├── tsconfig.json                  # TypeScript 配置
├── vitest.config.ts               # Vitest 配置
├── .eslintrc.js                   # ESLint 配置
├── .prettierrc                    # Prettier 配置
├── .gitignore                     # Git 忽略规则
├── Dockerfile.e2e                 # E2E 测试 Docker 镜像
├── docker-compose.e2e.yml         # Docker Compose 配置
└── README.md                      # 项目说明
```

### 6.5 Agent 配置详解

**Agent 目录结构**:
```
~/.agent-swarm/agents/my-agent/
├── config.json           # 必需：Agent 配置
├── prompt.md             # 必需：System Prompt
├── MEMORY.md             # 可选：长期记忆
└── skills/               # 可选：技能目录
    └── <skill-name>/
        └── SKILL.md
```

**config.json 配置字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | Agent 唯一标识 |
| `name` | string | ✅ | Agent 显示名称 |
| `description` | string | ❌ | Agent 描述 |
| `model.provider` | string | ✅ | LLM 提供商: `anthropic` |
| `model.id` | string | ✅ | 模型 ID: `claude-sonnet-4-6` |
| `channels` | string[] | ✅ | 支持的 Channel: `cli`, `dingtalk`, `feishu` |
| `maxTokens` | number | ❌ | 最大 Token 数 |
| `temperature` | number | ❌ | 温度参数 |

### 6.6 快速开始流程

```bash
# 1. 安装项目
git clone <repo-url>
cd agent-swarm
npm install
npm run build

# 2. 初始化 workspace（首次使用）
mkdir -p ~/.agent-swarm/agents/my-agent

# 3. 创建 Agent
cat > ~/.agent-swarm/agents/my-agent/config.json << 'EOF'
{
  "id": "my-agent",
  "name": "我的助手",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"]
}
EOF

cat > ~/.agent-swarm/agents/my-agent/prompt.md << 'EOF'
你是一个有用的助手。
EOF

# 4. 运行
npm start
```

---

## 7. 扩展性设计

### 7.1 添加新 Channel

1. 继承 `BaseChannel` 基类
2. 实现 `start()`, `stop()`, `send()` 方法
3. 调用 `handleMessage()` 处理收到的消息

```typescript
class MyChannel extends BaseChannel {
  readonly id = 'my-channel';
  readonly name = 'My Channel';

  async start() { /* 启动逻辑 */ }
  async stop() { /* 停止逻辑 */ }
  async send(message: OutgoingMessage) { /* 发送逻辑 */ }
}
```

### 7.2 添加新 Agent

在 workspace 的 `agents/` 目录下创建：

```bash
# 默认位置: ~/.agent-swarm/agents/
mkdir -p ~/.agent-swarm/agents/my-agent
```

```
~/.agent-swarm/agents/my-agent/
├── config.json    # { id, name, model, channels }
├── prompt.md      # System Prompt
├── MEMORY.md      # 长期记忆（可选）
└── skills/        # Skills（可选）
```

### 7.3 自定义 SessionStore

实现 `ISessionStore` 接口，可替换为数据库存储：

```typescript
class DatabaseSessionStore implements ISessionStore {
  // 实现所有接口方法
}
```

### 7.4 工作流扩展

通过 `payload.workflow` 字段支持复杂编排：

```typescript
const message: Message = {
  // ...
  payload: {
    data: '处理任务',
    workflow: {
      oncomplete: ['agent-b', 'agent-c'],
      onerror: 'error-handler'
    }
  }
};
```

---

## 8. 性能考量

### 8.1 Agent 懒加载

- Agent 首次收到消息时才启动
- 启动后保持待机状态
- 空闲 30 分钟后自动卸载

### 8.2 Session 缓存

- 内存缓存活跃 Session
- JSONL 格式持久化
- 定期清理过期 Session

### 8.3 消息处理

- 并发处理多个消息
- 支持通配符订阅 (`'*'`)
- ACK 机制确保可靠投递

---

## 9. pi-agent-core 集成

### 9.1 项目定位

**Agent Swarm 是"任务型"多 Agent 框架**，不只是"对话型"**。

**职责边界**：

| 层级 | 职责 | 实现方 |
|------|------|--------|
| **多 Agent 编排** | 路由、协作、生命周期 | Agent Swarm |
| **消息持久化** | Session、Context 存储 | Agent Swarm |
| **渠道适配** | CLI、钉钉、飞书 | Agent Swarm |
| **工具注册** | 全局工具定义 | Agent Swarm |
| **单 Agent 执行** | LLM 调用、Tool 执行 | pi-agent-core |
| **模型抽象** | 多 Provider 支持 | pi-ai |

### 9.2 P0 功能： Tool 调用

**必要性**: Agent 的核心价值是"能做事"，不只是"能聊天"。

#### 9.2.1 工具注册表设计

```typescript
// src/tools/registry.ts
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { Type } from '@sinclair/typebox';

/**
 * 全局工具注册表
 */
class ToolRegistry {
  private tools = new Map<string, AgentTool>();

  /**
   * 注册工具
   */
  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取所有工具
   */
  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 按名称获取工具
   */
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 移除工具
   */
  remove(name: string): boolean {
    return this.tools.delete(name);
  }
}

export const toolRegistry = new ToolRegistry();
```

#### 9.2.2 内置工具

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `search_web` | 网络搜索 | query: string |
| `read_file` | 读取文件 | path: string |
| `write_file` | 写入文件 | path: string, content: string |
| `execute_command` | 执行命令 | command: string, timeout?: number |
| `query_database` | 数据库查询 | sql: string |

#### 9.2.3 工具配置方式

**方式一：全局注册（推荐）**
```typescript
// 启动时注册
toolRegistry.register({
  name: 'search_web',
  description: '搜索网络信息',
  parameters: Type.Object({
    query: Type.String({ description: '搜索关键词' }),
  }),
  execute: async (args) => {
    const results = await searchAPI(args.query);
    return JSON.stringify(results);
  },
});
```

**方式二：Agent 配置文件**
```json
// ~/.agent-swarm/agents/my-agent/config.json
{
  "id": "my-agent",
  "tools": ["search_web", "read_file"]  // 引用已注册的工具
}
```

#### 9.2.4 AgentManager 集成

```typescript
// AgentManager.spawn()
import { toolRegistry } from '../tools/registry.js';

const agent = new Agent({
  initialState: {
    systemPrompt,
    model: getModel(provider, modelId),
    thinkingLevel: 'medium',
    tools: this.getAgentTools(config),  // 注入工具
    messages: [],
  },
  getApiKey: async (provider) => {
    const result = await getConfigLoader().getApiKey(provider, config.model?.apiKey);
    return result?.key;
  },
});

// 获取 Agent 配置的工具
private getAgentTools(config: AgentConfig): AgentTool[] {
  if (!config.tools || config.tools.length === 0) {
    return toolRegistry.getAll();  // 默认使用全部工具
  }
  return config.tools
    .map(name => toolRegistry.get(name))
    .filter((t): t is AgentTool => t !== undefined);
}
```

### 9.3 P0 功能： 上下文管理

**必要性**: 长对话会超出模型窗口限制，需要裁剪。

#### 9.3.1 上下文裁剪策略

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| **滑动窗口** | 保留最近 N 条消息 | 通用 |
| **摘要压缩** | 将旧消息压缩为摘要 | 超长对话 |
| **优先级保留** | 保留 system + 最近 user + assistant | 紧凑窗口 |

**推荐**: 先实现滑动窗口，后续支持可配置策略。

#### 9.3.2 滑动窗口实现

```typescript
// AgentManager.spawn()
const MAX_CONTEXT_MESSAGES = 50;  // 可配置

const agent = new Agent({
  initialState: { /* ... */ },
  // 上下文转换：滑动窗口
  transformContext: async (messages, signal) => {
    if (messages.length <= MAX_CONTEXT_MESSAGES) {
      return messages;
    }
    // 保留第一条（通常是 system prompt）+ 最近 N-1 条
    const first = messages[0];
    const recent = messages.slice(-(MAX_CONTEXT_MESSAGES - 1));
    return [first, ...recent];
  },
});
```

#### 9.3.3 高级策略（未来扩展）

```typescript
interface ContextStrategy {
  name: string;
  transform: (messages: AgentMessage[], config: ContextConfig) => Promise<AgentMessage[]>;
}

interface ContextConfig {
  maxMessages: number;
  strategy: 'sliding' | 'summary' | 'priority';
  preserveSystem?: boolean;
}
```

### 9.4 不需要的功能及理由

| 能力 | 为什么不需要 |
|------|--------------|
| **Steering** | 多 Agent 协作通过消息路由（to/oncomplete）更灵活，不需要单 Agent 内部干预 |
| **Follow-up** | 已通过 workflow.oncomplete 实现 |
| **Proxy 模式** | 企业内网部署是后期需求，当前直接调用 LLM API |

### 9.5 完整集成代码

```typescript
// AgentManager.spawn()
async spawn(agentId: string): Promise<void> {
  const config = await this.loadConfig(agentId);
  if (!config) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // 获取 API Key
  const apiKeyResult = await getConfigLoader().getApiKey(
    config.model.provider,
    config.model.apiKey
  );
  if (!apiKeyResult) {
    throw new Error(`API key not found for ${config.model.provider}`);
  }

  // 加载 Skills
  const skillsPath = join(this.agentsPath, agentId, 'skills');
  const skillsLoader = new SkillLoader(skillsPath);
  const skills = await skillsLoader.getMetadata();

  // 构建 System Prompt
  const systemPrompt = await this.buildSystemPrompt(agentId, skills);

  // 创建 Agent
  const agent = new Agent({
    initialState: {
      systemPrompt,
      model: getModel(config.model.provider, config.model.id),
      thinkingLevel: config.thinkingLevel ?? 'medium',
      tools: this.getAgentTools(config),
      messages: [],
    },
    // 动态 API Key
    getApiKey: async () => apiKeyResult.key,
    // 上下文裁剪
    transformContext: async (messages) => {
      const maxMessages = config.maxContextMessages ?? 50;
      if (messages.length <= maxMessages) return messages;
      const first = messages[0];
      const recent = messages.slice(-(maxMessages - 1));
      return [first, ...recent];
    },
  });

  this.agents.set(agentId, agent);
  this.configs.set(agentId, config);
}

// 获取 Agent 工具
private getAgentTools(config: AgentConfig): AgentTool[] {
  if (!config.tools || config.tools.length === 0) {
    return toolRegistry.getAll();
  }
  return config.tools
    .map(name => toolRegistry.get(name))
    .filter((t): t is AgentTool => t !== undefined);
}
```

### 9.6 配置扩展

**Agent config.json 新增字段**:

```json
{
  "id": "my-agent",
  "name": "我的助手",
  "model": { "provider": "anthropic", "id": "claude-sonnet-4-6" },
  "channels": ["cli"],

  // 新增字段
  "tools": ["search_web", "read_file"],
  "thinkingLevel": "medium",
  "maxContextMessages": 50
}
```

---

## 10. 安全考量

- API Key 通过环境变量配置，不硬编码
- Session ID 格式防止遍历攻击
- 消息内容不包含敏感信息

---

## 10. 测试策略

| 类型 | 覆盖率 | 说明 |
|------|--------|------|
| 单元测试 | 80%+ | 每个模块独立测试 |
| 集成测试 | 核心流程 | 组件间交互 |
| E2E 测试 | 用户场景 | Docker 隔离环境 |

测试运行：
```bash
npm run test:coverage -- --run
```
