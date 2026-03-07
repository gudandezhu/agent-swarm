# 用户工作空间初始化方案设计

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

---

## 2. 目录结构设计

### 2.1 完整工作空间结构

```
~/.agent-swarm/                              # 工作空间根目录
├── config.json                              # 全局配置（API 密钥等）
├── .gitkeep                                 # 确保 git 跟踪空目录
│
├── .claude/                                  # AI Native 配置
│   └── skills/                               # Claude 创建/配置 Agent 的技能
│       ├── create-agent.md                   # 创建新 Agent
│       ├── configure-agent.md                # 配置现有 Agent
│       ├── add-channel.md                    # 添加消息渠道
│       └── start-dev-team.md                 # 启动开发团队
│
├── agents/                                   # Agent 配置目录
│   ├── README.md                             # Agent 创建指南
│   ├── .gitkeep
│   └── templates/                            # Agent 模板（可选）
│       ├── basic-agent/                      # 基础 Agent 模板
│       │   ├── config.json
│       │   └── prompt.md
│       └── translator-agent/                 # 翻译 Agent 模板
│           ├── config.json
│           └── prompt.md
│
├── sessions/                                 # 会话存储目录
│   ├── index.jsonl                           # 会话索引
│   └── .gitkeep
│
└── logs/                                     # 日志目录（可选）
    ├── .gitkeep
    └── agent-swarm.log                       # 应用日志
```

### 2.2 目录分离原则

| 目录 | 位置 | 说明 | Git 版本控制 |
|------|------|------|--------------|
| **源代码** | `~/projects/agent-swarm/` | 项目代码 | ✅ 是 |
| **工作空间** | `~/.agent-swarm/` | 用户数据 | ❌ 否 |
| **全局配置** | `~/.agent-swarm/config.json` | API 密钥等 | ❌ 否 |

### 2.3 多用户/多项目支持

#### 单用户多项目
```
~/.agent-swarm/                  # 共享工作空间
├── agents/                      # 所有项目的 Agent
├── sessions/                    # 所有项目的会话
└── projects/                    # 项目隔离数据（可选）
    ├── project-a/
    │   └── sessions/
    └── project-b/
        └── sessions/
```

#### 多用户隔离
每个用户有独立的工作空间：
- 用户 A: `/home/user-a/.agent-swarm/`
- 用户 B: `/home/user-b/.agent-swarm/`

#### 自定义路径支持
通过环境变量覆盖：
```bash
export AGENT_SWARM_WORKSPACE=/custom/path/workspace
```

---

## 3. 初始化时机和触发方式

### 3.1 初始化时机

| 时机 | 触发方式 | 优先级 | 说明 |
|------|----------|--------|------|
| **npm install** | postinstall 脚本 | P0 | 首次安装时初始化 |
| **npm run dev** | 启动检查 | P0 | 运行时确保工作空间存在 |
| **agent-swarm CLI** | 启动检查 | P0 | CLI 工具启动时检查 |
| **手动初始化** | `agent-swarm init` | P1 | 用户主动初始化 |

### 3.2 postinstall 脚本设计

#### package.json 配置
```json
{
  "scripts": {
    "postinstall": "node dist/scripts/init-workspace.js"
  },
  "files": [
    "dist/",
    "templates/",
    ".claude/skills/"
  ]
}
```

#### 初始化逻辑流程

```
postinstall 触发
    │
    ▼
检查工作空间是否存在
    │
    ├── [存在] → 检查版本 → 需要升级？
    │                    │
    │                    ├── [是] → 执行升级（保留用户配置）
    │                    └── [否] → 跳过
    │
    └── [不存在] → 创建目录结构
                    │
                    ├── 创建基础目录
                    ├── 复制 skills 文件
                    ├── 生成 config.json（如果不存在）
                    ├── 生成 README.md
                    └── 输出欢迎信息
```

### 3.3 运行时检查

在 AgentSwarm 启动时进行检查：

```typescript
// 设计示例（不编写代码）
class WorkspaceInitializer {
  async ensure(): Promise<void> {
    if (!await this.exists()) {
      await this.init();
    }
  }
}
```

---

## 4. 配置文件和模板

### 4.1 config.json（全局配置）

#### 初始模板
```json
{
  "version": "0.1.0",
  "apiKeys": {
    "anthropic": "",
    "openai": ""
  },
  "workspace": "~/.agent-swarm",
  "logLevel": "info"
}
```

#### 生成策略
- **首次安装**：生成默认 config.json
- **已存在**：不覆盖，保留用户配置
- **格式错误**：备份旧文件，生成新的

### 4.2 AI Native Skills

#### 复制策略
从项目源码复制到用户工作空间：

| 源路径 | 目标路径 | 策略 |
|--------|----------|------|
| `project/.claude/skills/*.md` | `~/.agent-swarm/.claude/skills/` | 覆盖更新 |
| `project/.claude/skills/team/` | `~/.agent-swarm/.claude/skills/team/` | 覆盖更新 |

#### 更新策略
- **postinstall**：每次都覆盖（确保用户获得最新 skills）
- **用户自定义**：用户可以在 `~/.agent-swarm/.claude/skills/custom/` 添加自定义 skills

### 4.3 Agent 模板（可选）

#### 模板列表
```
templates/
├── basic-agent/          # 基础 Agent
│   ├── config.json
│   └── prompt.md
├── translator-agent/     # 翻译 Agent
│   ├── config.json
│   └── prompt.md
└── code-assistant/       # 代码助手
    ├── config.json
    └── prompt.md
```

#### 使用场景
用户创建 Agent 时可以选择从模板开始：
```
agent-swarm create agent --template translator-agent
```

### 4.4 README.md

#### 内容
```markdown
# Agent Swarm 工作空间

## 目录说明

- `agents/`: 存放你的 Agent 配置
- `sessions/`: 存放会话数据
- `.claude/skills/`: AI Native 技能文件
- `config.json`: 全局配置（API 密钥等）

## 快速开始

1. 配置 API 密钥：
   ```bash
   # 编辑 config.json 或使用环境变量
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

2. 创建第一个 Agent：
   ```
   在 Claude Code 中说："创建一个翻译助手"
   ```

3. 运行 Agent Swarm：
   ```bash
   npm run dev
   ```

## 更多文档

- [完整文档](https://github.com/your-repo/agent-swarm)
- [Agent 创建指南](./agents/README.md)
```

---

## 5. 技术方案

### 5.1 技术选型

| 组件 | 方案 | 理由 |
|------|------|------|
| 文件操作 | Node.js 原生 `fs/promises` | 零依赖，性能好 |
| 路径处理 | Node.js 原生 `path` | 跨平台兼容 |
| 日志输出 | `console.log` + 颜色 | 简单直观 |
| 错误处理 | try-catch + 友好提示 | 用户体验优先 |

### 5.2 错误处理策略

#### 错误分类

| 错误类型 | 处理方式 | 用户提示 |
|----------|----------|----------|
| 权限不足 | 跳过初始化，警告 | ⚠️ 无法创建工作空间，请检查权限 |
| 磁盘空间不足 | 跳过初始化，警告 | ⚠️ 磁盘空间不足 |
| config.json 损坏 | 备份并重建 | ℹ️ 配置文件损坏，已备份并重建 |
| 网络问题（下载模板） | 跳过可选步骤 | ⚠️ 无法下载模板，使用默认配置 |

#### 错误恢复

```typescript
// 设计示例（不编写代码）
class WorkspaceInitializer {
  async handleConfigError(): Promise<void> {
    // 1. 备份损坏的文件
    // 2. 生成新的配置
    // 3. 记录日志
    // 4. 提示用户
  }
}
```

### 5.3 日志输出策略

#### 输出格式
```
✓ 创建工作空间: ~/.agent-swarm
✓ 创建目录: agents/
✓ 创建目录: sessions/
✓ 复制 skills 文件
✓ 生成配置文件
ℹ️ 工作空间初始化完成！
ℹ️ 下一步: 配置 API 密钥
```

#### 日志级别
| 级别 | 符号 | 用途 |
|------|------|------|
| 成功 | ✓ | 操作成功 |
| 信息 | ℹ️ | 提示信息 |
| 警告 | ⚠️ | 非致命错误 |
| 错误 | ✗ | 致命错误 |

#### 颜色支持
- 成功：绿色
- 信息：蓝色
- 警告：黄色
- 错误：红色

---

## 6. 升级和迁移

### 6.1 版本管理

#### 版本标记
```json
{
  "version": "0.1.0",
  "initializedAt": "2025-03-07T00:00:00.000Z",
  "lastUpgradedAt": "2025-03-07T00:00:00.000Z"
}
```

#### 升级策略
```typescript
// 设计示例（不编写代码）
class WorkspaceUpgrader {
  async upgrade(fromVersion: string, toVersion: string): Promise<void> {
    // 1. 备份用户配置
    // 2. 执行迁移脚本
    // 3. 更新版本标记
  }
}
```

### 6.2 迁移脚本

| 版本 | 迁移内容 | 脚本 |
|------|----------|------|
| 0.0.x → 0.1.0 | 添加 memory/ 目录 | `migrations/001-add-memory-dir.js` |
| 0.1.0 → 0.2.0 | 合并 skills 目录 | `migrations/002-merge-skills.js` |

---

## 7. 用户体验设计

### 7.1 首次安装流程

```
1. npm install
   ↓
2. postinstall 触发
   ↓
3. 自动初始化工作空间
   ↓
4. 输出欢迎信息
   ↓
5. 提示下一步操作
```

### 7.2 欢迎信息

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 工作空间初始化完成！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间位置: ~/.agent-swarm
✓ Skills 文件: 4 个
✓ Agent 模板: 3 个

🚀 快速开始:

  1. 配置 API 密钥:
     export ANTHROPIC_API_KEY=sk-ant-...

  2. 创建第一个 Agent:
     在 Claude Code 中说："创建一个翻译助手"

  3. 运行 Agent Swarm:
     npm run dev

📚 文档: https://github.com/your-repo/agent-swarm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7.3 交互式配置（可选）

```bash
$ agent-swarm init

? 选择 API 密钥配置方式:
  ❯ 使用环境变量（推荐）
    存储在 config.json 中
    稍后手动配置

? 输入 Anthropic API Key: sk-ant-...

✓ 配置已保存
```

---

## 8. 测试策略

### 8.1 测试场景

| 场景 | 验证点 |
|------|--------|
| 首次安装 | 工作空间正确创建 |
| 重复安装 | 不覆盖用户配置 |
| 权限不足 | 优雅降级，提示用户 |
| 自定义路径 | 正确使用自定义路径 |
| 配置损坏 | 备份并重建 |
| 升级 | 保留用户数据 |

### 8.2 测试命令

```bash
# 单元测试
npm test -- init-workspace.test.ts

# 集成测试
npm test -- init-workspace.integration.test.ts

# E2E 测试
npm run test:e2e -- workspace-init
```

---

## 9. 实施任务清单

### Phase 1: 核心功能（P0）

#### 任务 1.1: 创建初始化脚本模块
- [ ] 创建 `src/scripts/` 目录
- [ ] 实现 `WorkspaceInitializer` 类
- [ ] 实现目录创建逻辑
- [ ] 实现配置文件生成逻辑

#### 任务 1.2: 实现 postinstall 脚本
- [ ] 创建 `src/scripts/init-workspace.ts`
- [ ] 添加到 package.json scripts
- [ ] 实现版本检查逻辑
- [ ] 实现错误处理

#### 任务 1.3: 实现运行时检查
- [ ] 在 AgentSwarm 启动时检查工作空间
- [ ] 在 CLI 启动时检查工作空间
- [ ] 提供友好的错误提示

### Phase 2: 用户体验（P1）

#### 任务 2.1: 实现欢迎信息
- [ ] 设计 ASCII 艺术 logo
- [ ] 实现彩色输出
- [ ] 添加下一步操作提示

#### 任务 2.2: 实现交互式配置（可选）
- [ ] 实现 `agent-swarm init` 命令
- [ ] 实现交互式 API 密钥配置
- [ ] 实现 `agent-swarm config` 命令

### Phase 3: 高级功能（P2）

#### 任务 3.1: 实现版本管理和迁移
- [ ] 实现版本标记
- [ ] 实现迁移脚本框架
- [ ] 实现自动升级逻辑

#### 任务 3.2: 实现 Agent 模板系统
- [ ] 创建默认模板
- [ ] 实现模板加载逻辑
- [ ] 实现模板使用命令

### Phase 4: 测试（P0）

#### 任务 4.1: 单元测试
- [ ] 测试目录创建
- [ ] 测试配置生成
- [ ] 测试错误处理

#### 任务 4.2: 集成测试
- [ ] 测试完整初始化流程
- [ ] 测试升级流程
- [ ] 测试自定义路径

---

## 10. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 用户文件被覆盖 | 高 | 检查文件存在，不覆盖 |
| 权限问题 | 中 | 优雅降级，提示用户 |
| 跨平台兼容性 | 中 | 使用 path 模块，测试 Windows/Linux/macOS |
| postinstall 失败导致安装失败 | 高 | try-catch 处理，记录日志 |

---

## 11. 参考资料

- [Node.js File System API](https://nodejs.org/api/fs.html)
- [npm scripts 文档](https://docs.npmjs.com/cli/v9/using-npm/scripts)
- [design.md](.claude/design.md) - 项目架构设计
- [create-agent.md](.claude/skills/create-agent.md) - Agent 创建技能
