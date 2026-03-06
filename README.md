# AgentSwarm

多 Agent 协作框架 - 快速创建 Agent，统一消息路由，Session 持久化。

## 特性

- **多 Agent 协作** - 支持多个 Agent 协同工作，通过消息总线通信
- **任务编排** - 支持 `oncomplete`/`onerror` 工作流，实现复杂的任务链
- **Session 持久化** - 基于 JSONL 的会话存储，跨会话保持上下文
- **多 Channel 支持** - 内置 CLI、钉钉、飞书 Channel，易于扩展
- **能力发现** - 自动发现 Agent 能力，支持动态技能加载
- **测试覆盖** - 90%+ 测试覆盖率，300+ 测试用例

## 环境要求

- Node.js >= 20.0.0
- npm 或 pnpm

## 安装

```bash
# 克隆项目
git clone https://github.com/gudandezhu/agent-swarm.git
cd agent-swarm

# 安装依赖
npm install
```

## 构建

```bash
# 编译 TypeScript
npm run build

# 输出目录: dist/
```

### dist/ 目录结构

```
dist/
├── index.js           # npm 包主入口 (导出 AgentSwarm 等核心类)
├── main.js            # CLI 可执行入口
├── AgentSwarm.js
├── container.js
├── agent/             # Agent 管理模块
├── channel/           # Channel 适配器
├── message/           # 消息处理模块
├── session/           # Session 管理模块
├── reliability/       # 重试机制
└── core/              # 核心接口
```

### 作为 npm 包使用

```javascript
// ESM 方式导入
import { AgentSwarm } from 'agent-swarm';

// 或直接使用 dist/
import { AgentSwarm } from './dist/AgentSwarm.js';
```

### CLI 使用

```bash
# 开发模式（使用 tsx 直接运行 TypeScript）
npm run dev

# 生产模式（先编译后运行）
npm run build
npm start

# 或直接运行编译后的文件
node dist/main.js

# 全局安装后使用（npm link 后）
npm link
agent-swarm
```

## 测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行一次后退出（非 watch 模式）
npm run test:coverage -- --run
```

## 快速开始

### 1. 创建 Agent

在 `agents/` 目录下创建你的 Agent：

```bash
mkdir -p agents/my-agent/skills
```

### 2. 配置 Agent

创建 `agents/my-agent/config.json`：

```json
{
  "id": "my-agent",
  "name": "我的助手",
  "description": "一个有用的 AI 助手",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"],
  "maxTokens": 4000,
  "temperature": 0.7
}
```

### 3. 编写提示词

创建 `agents/my-agent/prompt.md`：

```markdown
你是一个有用的助手，专门帮助用户解决问题。

你的特长包括：
- 分析问题
- 提供建议
- 协助编程

请始终使用中文回答。
```

### 4. 运行

```bash
npm run dev
```

## Agent 协作

### 工作流编排

通过 `workflow` 字段定义任务链：

```typescript
const message = {
  id: 'msg-1',
  from: 'user',
  to: 'agent-a',
  sessionId: 'session-1',
  type: 'request',
  payload: {
    task: '处理数据',
    workflow: {
      oncomplete: 'agent-b',  // 完成后通知 agent-b
      onerror: 'error-handler' // 失败时通知 error-handler
    }
  },
  ack: { required: false, timeout: 0, retry: 0 }
};
```

### 多目标广播

```typescript
const message = {
  id: 'msg-2',
  from: 'user',
  to: ['agent-a', 'agent-b', 'agent-c'],  // 发送给多个 Agent
  // ...
};
```

## 项目结构

```
agent-swarm/
├── agents/              # Agent 定义目录
│   ├── example/         # 示例 Agent
│   └── README.md        # Agent 创建指南
├── src/
│   ├── agent/           # Agent 管理器
│   ├── channel/         # 消息通道 (CLI, 钉钉, 飞书)
│   ├── core/            # 核心接口定义
│   ├── message/         # 消息总线和持久化
│   ├── reliability/     # 重试调度器
│   ├── session/         # Session 管理
│   ├── AgentSwarm.ts    # 主类
│   └── main.ts          # CLI 入口
├── tests/               # 测试文件
├── dist/                # 编译输出
└── sessions/            # Session 持久化存储
```

## 核心 API

### AgentSwarm

```typescript
import { AgentSwarm } from 'agent-swarm';

const swarm = new AgentSwarm({
  defaultAgent: 'example',
  agentsPath: './agents',
  sessionsPath: './sessions',
  mockResponse: async (msg) => 'Mock response' // 可选，用于测试
});

await swarm.start();

// 注册 Channel
await swarm.registerChannel(channel);

// 停止
await swarm.stop();
```

### AgentManager

```typescript
const agentManager = swarm.getAgentManager();

// 获取 Agent
const agent = await agentManager.get('agent-id');

// 检查 Agent 是否存在
const exists = await agentManager.exists('agent-id');

// 获取 Agent 能力
const capabilities = await agentManager.getCapabilities('agent-id');

// 列出所有 Agent
const agents = await agentManager.list();
```

### MessageBus

```typescript
const messageBus = swarm.getMessageBus();

// 发送消息
await messageBus.send({
  id: 'msg-1',
  from: 'user',
  to: 'agent-1',
  sessionId: 'session-1',
  type: 'request',
  payload: { data: 'Hello' },
  ack: { required: false, timeout: 0, retry: 0 }
});

// 订阅消息
const unsubscribe = messageBus.subscribe('agent-1', async (msg) => {
  console.log('收到消息:', msg);
});

// 取消订阅
unsubscribe();
```

### SessionManager

```typescript
const sessionManager = swarm.getSessionManager();

// 获取或创建 Session
const session = await sessionManager.getOrCreate({
  channelId: 'cli',
  channelUserId: 'user-123',
  conversationId: 'conv-1'
});

// 更新 Session 上下文
await sessionManager.updateContext(session.id, '新的上下文');

// 触发 Session（更新最后活跃时间）
await sessionManager.touch(session.id);
```

## 配置

### 环境变量

```bash
# Anthropic API Key
export ANTHROPIC_API_KEY=your-api-key

# 或使用 .env 文件
echo "ANTHROPIC_API_KEY=your-api-key" > .env
```

## 开发

```bash
# 监听模式编译
npm run dev:watch

# 运行 CLI
npm start

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## License

MIT
