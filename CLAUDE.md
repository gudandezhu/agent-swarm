# Agent Swarm - 协作框架设计文档

## 核心目标

- 快速创建 Agent，一个目录就是一个 Agent
- Swarm 内 Agent 通过 `to: agent-id` 直接通信
- Swarm 与外部通过 Channel 统一接入
- Session 上下文复用，JSONL 持久化
- Agent 拥有长期记忆，跨 Session 复用

## 技术选型

| 维度 | 选择 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js |
| 消息总线 | EventEmitter（内置） |
| LLM 集成 | pi-mono |
| 持久化 | JSONL |
| 包管理 | npm（单包） |

---

## 与 pi-mono 的分工

```
┌─────────────────────────────────────────────────────────────┐
│                    agent-swarm (我们实现)                   │
├─────────────────────────────────────────────────────────────┤
│  AgentManager  │  MessageBus  │  SessionStore  │  Channel   │
│  多 Agent 协作   │  消息路由     │  JSONL 持久化   │  适配器     │
└─────────────────────────────────────────────────────────────┘
                            ↓ 复用
┌─────────────────────────────────────────────────────────────┐
│              pi-mono (@mariozechner/*)                     │
├─────────────────────────────────────────────────────────────┤
│  Skills (SKILL.md) │  AgentTool │  Agent │  LLM API        │
│  遵循 Agent Skills  │  工具执行   │  运行时 │  流式调用        │
│  标准，自动加载      │            │        │                 │
└─────────────────────────────────────────────────────────────┘
```

| 能力 | 负责方 |
|------|--------|
| 多 Agent 协作、消息路由 | agent-swarm |
| Session 持久化 | agent-swarm |
| Agent 生命周期管理 | agent-swarm |
| Channel 适配（钉钉/飞书） | agent-swarm |
| **Skills (SKILL.md)** | **pi-mono** |
| 单 Agent 运行时 | pi-mono |
| LLM 调用、Tool 执行 | pi-mono |

---

## pi-mono Skills 机制

pi-mono 已实现完整的 [Agent Skills standard](https://agentskills.io/specification)：

### 加载机制（渐进式）

```
┌─────────────────────────────────────────────────────┐
│  Stage 1: Metadata (始终加载)                        │
│  name + description ~100 tokens                      │
│  → 用于匹配触发                                       │
├─────────────────────────────────────────────────────┤
│  Stage 2: SKILL.md 主体 (按需加载)                    │
│  完整内容 <5000 tokens                                │
│  → 触发后注入上下文                                   │
├─────────────────────────────────────────────────────┤
│  Stage 3: Resources (执行时加载)                      │
│  scripts, references, assets                         │
│  → 实际执行时使用                                     │
└─────────────────────────────────────────────────────┘
```

### SKILL.md 格式

```markdown
---
name: web-scraper
description: 爬取指定 URL 的网页内容。用于抓取网页、提取文本。
---

# Web Scraper

## Usage

当用户要求爬取网页时使用。

## Parameters

- `url` (string): 要爬取的网址

## Notes

- 支持 http 和 https
- 返回纯文本内容
```

### 目录结构

```
agent-id/
├── config.json          # Agent 配置
├── prompt.md            # System prompt
└── skills/              # Agent 专属 Skills
    ├── web-scraper/
    │   └── SKILL.md
    └── data-analyzer/
        └── SKILL.md
```

### 调用方式

- **自动匹配**：通过 description 匹配
- **手动调用**：`/skill:web-scraper`

---

## 架构设计

### 系统分层

```
Channel 层 → Session 层 → Message 层 → AgentManager 层 → pi-mono Agent 层
```

### 路由设计（无 Router 层）

| 场景 | 方案 |
|------|------|
| 用户 → Agent | Channel 配置 `defaultAgent` |
| Agent → Agent | `to: "agent-id"` 直接指定 |
| 响应路由 | `replyTo` 字段 |
| 广播 | `to: ["a", "b", "c"]` |

---

## 核心类型定义

### 设计原则：Session 与 Message 分离

| | Session（会话层） | Message（消息层） |
|---|---------|---------|
| 生命周期 | 长期（天/周） | 即时 |
| 用途 | 上下文管理、记忆持久化 | 信息传递、路由控制 |
| 持久化 | JSONL 文件 | 存入 Session |
| 关系 | Session ID 关联多个 Message | Message 携带 sessionId |

```
Message 携带 sessionId → 关联到 Session → 读取上下文 → 处理后回复
```

### Message

**目的**：单次消息传递，路由控制

```typescript
interface Message {
  // 元数据
  id: string;
  timestamp: number;
  version: '1.0';

  // 路由
  from: string;                    // 发送者 ID
  to: string | string[];           // 目标 Agent ID（核心路由字段）
  sessionId: string;               // 关联会话，用于读取上下文

  // 类型
  type: 'request' | 'response' | 'event' | 'error';

  // 异步响应
  correlationId?: string;         // 匹配请求和响应
  replyTo?: string;               // 响应目标

  // 内容
  payload: {
    task?: string;
    data?: unknown;
  };

  // ACK（仅确认"收到"，不等待业务完成）
  ack: {
    required: boolean;
    timeout: number;
    retry: number;
  };
}
```

### Session

**目的**：持久化上下文，跨消息保持状态

```typescript
interface Session {
  // 标识
  id: string;                     // dingtalk:user123 或 dingtalk:conv456:thread789:user123
  channelId: string;              // dingtalk
  channelUserId: string;          // user123
  conversationId?: string;        // conv456（群聊）
  threadId?: string;              // thread789（群聊线程）

  // 元数据
  createdAt: number;
  lastActiveAt: number;

  // 上下文（持久化）
  context: {
    messages: Message[];          // 最近 20 条消息
    variables: Record<string, unknown>;  // 会话变量
    agentStates: Map<string, unknown>;   // 各 Agent 状态
  };
}
```

### AgentManager

**复用 pi-mono 的 Agent 类**，我们提供多 Agent 管理：

```typescript
import { Agent } from "@mariozechner/agent";

interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model: Model;
  channels: string[];
}

class AgentManager {
  private agents = new Map<string, Agent>();

  async get(id: string): Promise<Agent> {
    if (!this.agents.has(id)) {
      const config = await this.loadConfig(id);

      // pi-mono 会自动加载该 Agent 的 skills/ 目录下的 SKILL.md
      const agent = new Agent({
        initialState: {
          systemPrompt: config.systemPrompt,
          model: config.model,
          tools: [],  // pi-mono 内置 tools: read, write, edit, bash
        }
      });
      this.agents.set(id, agent);
    }
    return this.agents.get(id)!;
  }
}
```

---

## 数据流

### 消息流转（异步非阻塞）

```
钉钉/飞书 → Channel适配 → MessageBus → AgentManager → Agent
                                              ↓
                                         立即ACK (0.1秒内)
                                              ↓
                                         异步执行任务
                                              ↓
                                         发送响应消息
```

### 关键设计

- **ACK 快速返回**: 收到消息 0.1 秒内确认，不等待业务处理
- **任务异步执行**: Agent 不阻塞，可处理其他消息
- **Correlation ID**: 匹配请求和响应
- **Reply-To**: 灵活指定响应目标

---

## 存储结构

### Session JSONL

```
sessions/
├── index.jsonl                    # Session 元数据索引
└── <sessionId>.jsonl              # 消息历史
```

**index.jsonl**:
```jsonl
{"type":"session","id":"dingtalk:user123","channelId":"dingtalk","channelUserId":"user123","createdAt":1709600000000,"lastActiveAt":1709680000000}
```

**dingtalk:user123.jsonl**:
```jsonl
{"type":"message","id":"msg001","sessionId":"dingtalk:user123","timestamp":1709600000000,"role":"user","content":"帮我爬取这个网页"}
```

### JSONLSessionStore

```typescript
class JSONLSessionStore {
  private basePath = './sessions';

  async getOrCreateSession(channelMessage: IncomingMessage): Promise<Session>;
  async addMessage(sessionId: string, message: Message): Promise<void>;
  async load(sessionId: string): Promise<Session | null>;
  async saveAgentState(sessionId: string, agentId: string, state: unknown): Promise<void>;
  async cleanup(): Promise<void>;  // 24 小时未活动
}
```

---

## 项目结构

```
agent-swarm/
├── src/
│   ├── agent/                   # AgentManager
│   ├── message/                 # Message、MessageBus
│   ├── session/                 # Session、JSONLSessionStore
│   └── channel/                 # Channel 基类、适配器（钉钉、飞书）
├── agents/                      # Agent 目录（一个目录 = 一个 Agent）
│   └── crawler/
│       ├── config.json          # Agent 配置
│       ├── prompt.md            # System prompt
│       └── skills/              # Agent 专属 Skills（pi-mono 自动加载）
│           └── web-scraper/
│               └── SKILL.md
├── sessions/                    # JSONL 持久化
├── package.json
└── tsconfig.json
```

---

## Session 策略

**Session ID 生成**:
- 单聊: `dingtalk:user123`
- 群聊+线程: `dingtalk:conv456:thread789:user123`

**ID 解析**:
```typescript
const parts = sessionId.split(':');
// 单聊: [channelId, userId]
// 群聊: [channelId, conversationId, threadId, userId]
```

**新 Session 创建时机**:

1. 首次对话
2. Session 过期（30天未活动）
3. 用户主动触发（`/new` 或 `/reset`）

---

## 核心 API

### Agent 开发

**Agent 以目录形式定义**：

```
agents/
└── crawler/
    ├── config.json           # Agent 配置
    ├── prompt.md             # System prompt
    └── skills/               # Agent 专属 Skills
        └── web-scraper/
            └── SKILL.md
```

**config.json**:
```json
{
  "id": "crawler",
  "name": "网页爬虫",
  "model": { "provider": "anthropic", "id": "claude-sonnet-4-6" },
  "channels": ["dingtalk"]
}
```

**使用**：
```typescript
const manager = new AgentManager();
const agent = await manager.get('crawler');
await agent.prompt("帮我爬取 https://example.com");
```

### 消息发送

```typescript
// 1对1
await messageBus.send({ from: 'a', to: 'b', payload: {...}, ack: {...} });

// 1对多
await messageBus.send({ from: 'a', to: ['b', 'c'], payload: {...} });
```

### Skill 开发

**遵循 Agent Skills standard**，放置在 Agent 的 `skills/` 目录：

```
agents/crawler/skills/web-scraper/SKILL.md
```

```markdown
---
name: web-scraper
description: 爬取指定 URL 的网页内容，提取文本。用于抓取网页、分析页面。
---

# Web Scraper

## Usage

当用户要求爬取网页、抓取页面内容时使用。

## Parameters

- `url` (string): 要爬取的网址，必须完整 URL

## Steps

1. 验证 URL 格式
2. 使用 fetch 获取内容
3. 提取纯文本
4. 返回给用户
```

pi-mono 会自动：
- 扫描 `skills/` 目录
- 提取 metadata 注入 system prompt
- 按需加载完整 SKILL.md

---

## 长期记忆

### 存储格式

直接使用 `MEMORY.md` 文件，每个 Agent 单独有这个文件，每次请求都默认加载。

```md
# 环境
{账密/容器/平台域名/管理服务器}
# 技能
{超过5次重复调用的工作，抽象为技能}
# 规则
{反复强调的要求，设定为规则}
# 常用命令
{经常使用的命令，报错并最终正确的命令}
```

### 操作

| 操作 | 实现 |
|------|------|
| 添加 | 追加到文件末尾 |
| 修改 | 均可修改       |

**版本**: v0.5.0 | **更新**: 2026-03-05
