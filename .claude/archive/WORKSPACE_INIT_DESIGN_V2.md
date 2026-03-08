# 用户工作空间初始化方案设计 V2

## 1. 背景和问题

### 当前问题
用户在执行 `npm install` 后，`~/.agent-swarm` 目录没有自动创建，导致：
- 无法存放 Agent 配置
- 无法存放会话数据
- AI Native skills 不可用
- 用户体验不完整

### 设计目标
1. **自动化**：`npm install` 后自动创建工作空间
2. **非侵入**：不覆盖用户已有配置
3. **可配置**：支持自定义工作空间路径
4. **健壮性**：优雅处理各种错误情况
5. **CLI 优先**：使用全局 `swarm` 命令而非 `npm run dev`

---

## 2. 全局 CLI 命令设计

### 2.1 命令名称

**命令**: `swarm`（简短、易记）

**安装方式**:
```bash
# 全局安装
npm install -g agent-swarm

# 或本地安装后链接
npm link
```

### 2.2 CLI 命令结构

```bash
swarm [command] [options]

# 可用命令:
swarm init                    # 初始化工作空间
swarm start                   # 启动 AgentSwarm
swarm create-agent <name>     # 创建 Agent
swarm list                    # 列出所有 Agent
swarm delete-agent <id>       # 删除 Agent
swarm status                  # 查看系统状态
swarm --help                  # 显示帮助
```

### 2.3 package.json 配置

```json
{
  "name": "agent-swarm",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "swarm": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest",
    "postinstall": "node dist/setup/initWorkspace.js"
  },
  "files": [
    "dist/",
    "templates/",
    ".claude/skills/"
  ]
}
```

### 2.4 CLI 框架选择

**推荐**: Commander.js

**理由**:
- 成熟稳定，广泛使用
- 支持子命令和选项
- 自动生成帮助信息
- TypeScript 友好

**依赖安装**:
```bash
npm install commander
npm install --save-dev @types/commander
```

### 2.5 CLI 入口文件设计

```typescript
// src/cli.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { createAgentCommand } from './commands/createAgent.js';
import { listCommand } from './commands/list.js';
import { ensureWorkspace } from './setup/ensureWorkspace.js';

const program = new Command();

program
  .name('swarm')
  .description('Agent Swarm - 多 Agent 协作框架')
  .version('0.1.0');

// 注册命令
program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(createAgentCommand);
program.addCommand(listCommand);

// 运行时工作空间检查
program.hook('preAction', async () => {
  await ensureWorkspace();
});

// 解析并执行
program.parseAsync(process.argv);
```

---

## 3. 初始化时机和触发方式

### 3.1 初始化时机（更新）

| 时机 | 触发方式 | 优先级 | 说明 |
|------|----------|--------|------|
| **npm install** | postinstall 脚本 | P0 | 首次安装时初始化 |
| **swarm 命令** | 首次运行任何 swarm 命令 | P0 | 运行时自动初始化 |
| **swarm init** | 手动初始化 | P1 | 用户主动初始化 |

### 3.2 命令详细设计

#### swarm init
```bash
swarm init [--workspace <path>]

选项:
  --workspace <path>  自定义工作空间路径
  --force             强制重新初始化

示例:
  swarm init                    # 使用默认路径 ~/.agent-swarm
  swarm init --workspace /custom/path  # 使用自定义路径
  swarm init --force             # 强制重新初始化
```

#### swarm start
```bash
swarm start [--config <path>]

选项:
  --config <path>    指定配置文件路径
  --dev              开发模式

示例:
  swarm start                   # 启动 AgentSwarm
  swarm start --dev             # 开发模式启动
```

#### swarm create-agent
```bash
swarm create-agent <name> [options]

参数:
  <name>             Agent 名称

选项:
  --template <name>  使用模板创建
  --description <text>  Agent 描述

示例:
  swarm create-agent translator
  swarm create-agent translator --template translator-agent
```

#### swarm list
```bash
swarm list

列出所有可用的 Agent
```

---

## 4. 目录结构设计

### 4.1 完整工作空间结构

```
~/.agent-swarm/                              # 工作空间根目录
├── config.json                              # 全局配置（API 密钥等）
│
├── .claude/                                  # AI Native 配置
│   └── skills/                               # Claude 创建/配置 Agent 的技能
│       ├── create-agent.md
│       ├── configure-agent.md
│       ├── add-channel.md
│       └── start-dev-team.md
│
├── agents/                                   # Agent 配置目录
│   ├── README.md
│   └── <agent-id>/
│       ├── config.json
│       └── prompt.md
│
├── sessions/                                 # 会话存储目录
│   └── <sessionId>/
│       ├── context.md
│       └── messages.jsonl
│
└── memory/                                   # 长期记忆存储
    ├── index.jsonl
    ├── sessions/
    └── embeddings/
```

### 4.2 项目目录结构（新增 CLI）

```
src/
├── cli.ts                    # CLI 入口（新增）
├── commands/                 # CLI 命令（新增）
│   ├── init.ts
│   ├── start.ts
│   ├── createAgent.ts
│   └── list.ts
├── setup/                    # 初始化相关
│   ├── initWorkspace.ts
│   └── ensureWorkspace.ts
└── ...
```

---

## 5. 技术实现要点

### 5.1 工作空间自动初始化

```typescript
// src/setup/ensureWorkspace.ts
export async function ensureWorkspace(): Promise<void> {
  const workspacePath = getWorkspacePath();

  if (await exists(workspacePath)) {
    return; // 已存在，跳过
  }

  console.log('正在初始化 Agent Swarm 工作空间...');
  await initWorkspace(workspacePath);
  console.log('✓ 工作空间初始化完成！');
}
```

### 5.2 运行时检查

每次运行 `swarm` 命令时，在 preAction 钩子中检查工作空间：

```typescript
program.hook('preAction', async () => {
  await ensureWorkspace();
});
```

### 5.3 配置文件模板

**config.json 模板**:
```json
{
  "version": "0.1.0",
  "workspace": "~/.agent-swarm",
  "apiKeys": {
    "anthropic": "",
    "openai": ""
  },
  "logLevel": "info"
}
```

---

## 6. 用户体验设计

### 6.1 首次使用流程

```bash
# 1. 安装
npm install -g agent-swarm

# 2. npm install 触发 postinstall，自动创建工作空间
# 或首次运行 swarm 命令时自动初始化

# 3. 配置 API 密钥
export ANTHROPIC_API_KEY=sk-ant-...

# 4. 启动
swarm start
```

### 6.2 欢迎信息

```bash
$ swarm start

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 工作空间已就绪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间: ~/.agent-swarm
✓ 可用 Agents: 0

🚀 快速开始:
  swarm create-agent <name>    # 创建新 Agent
  swarm list                    # 查看所有 Agent

📚 文档: https://github.com/your-repo/agent-swarm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. 实施任务清单（重新设计）

### Phase 1: CLI 框架（P0）

#### 任务 1.1: 实现 CLI 框架
**预估**: 1.5 小时
**输出**: `src/cli.ts`

**实现要点**:
- 使用 Commander.js
- 定义基础命令结构
- 添加版本和帮助信息

**验收标准**:
- [ ] `swarm --help` 正常显示
- [ ] `swarm --version` 正常显示
- [ ] 命令结构清晰

#### 任务 1.2: 实现运行时工作空间检查
**预估**: 1 小时
**输出**: `src/setup/ensureWorkspace.ts`

**实现要点**:
- 检查工作空间是否存在
- 不存在时自动初始化
- 优雅处理错误

**验收标准**:
- [ ] 首次运行自动初始化
- [ ] 已存在时跳过
- [ ] 错误处理完善

### Phase 2: 初始化命令（P0）

#### 任务 2.1: 实现 swarm init 命令
**预估**: 2 小时
**输出**: `src/commands/init.ts`

**实现要点**:
- 创建目录结构
- 复制 skills 文件
- 生成配置文件
- 支持 --workspace 和 --force 选项

**验收标准**:
- [ ] `swarm init` 正常工作
- [ ] 支持自定义路径
- [ ] 强制重新初始化

#### 任务 2.2: 更新 package.json
**预估**: 0.5 小时
**输出**: 更新 `package.json`

**实现要点**:
- 添加 bin 配置
- 添加 postinstall 脚本
- 添加 commander 依赖

**验收标准**:
- [ ] bin 配置正确
- [ ] postinstall 正常工作

### Phase 3: 核心命令（P0）

#### 任务 3.1: 实现 swarm start 命令
**预估**: 2 小时
**输出**: `src/commands/start.ts`

**实现要点**:
- 启动 AgentSwarm
- 加载配置
- 连接渠道

**验收标准**:
- [ ] `swarm start` 正常启动
- [ ] 支持 --dev 选项

#### 任务 3.2: 实现 swarm create-agent 命令
**预估**: 1.5 小时
**输出**: `src/commands/createAgent.ts`

**实现要点**:
- 创建 Agent 目录
- 生成配置文件
- 支持 --template 选项

**验收标准**:
- [ ] `swarm create-agent test` 正常工作
- [ ] 支持模板

#### 任务 3.3: 实现 swarm list 命令
**预估**: 1 小时
**输出**: `src/commands/list.ts`

**实现要点**:
- 列出所有 Agent
- 显示 Agent 状态

**验收标准**:
- [ ] `swarm list` 正常显示

### Phase 4: 测试（P0）

#### 任务 4.1: CLI 测试
**预估**: 2 小时
**输出**: `tests/cli/*.test.ts`

**测试场景**:
- 首次运行自动初始化
- 命令参数解析
- 错误处理

**验收标准**:
- [ ] 覆盖主要场景
- [ ] 测试通过

---

## 8. 迁移策略

### 8.1 从 npm run dev 迁移

**旧方式**:
```bash
npm run dev
```

**新方式**:
```bash
swarm start
```

### 8.2 向后兼容

暂时保留 `npm run dev` 作为过渡：

```json
{
  "scripts": {
    "dev": "swarm start",
    "postinstall": "node dist/setup/initWorkspace.js"
  }
}
```

---

## 9. 参考资料

- [Commander.js 文档](https://commander.js.com/)
- [npm bin 配置](https://docs.npmjs.com/cli/v9/configuring-npm/package-json.html#bin)
- [design.md](.claude/design.md) - 项目架构设计
