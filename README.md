# AgentSwarm

多 Agent 协作框架，支持 AI Native 设计理念。

## 🚀 AI Native 一键安装

**只需要说一句话：**

```
"帮我安装 agent-swarm"
```

Claude 会自动完成所有配置，无需手动执行命令。

## AI Native 设计

**核心理念**：用户用自然语言描述需求，AI 自动生成配置，无需手写 JSON。

| 传统方式 | AI Native |
|---------|-----------|
| 手写 agent-swarm.json | 告诉 Claude "创建一个客服 Agent" |
| 查阅文档了解字段 | Claude 读取 skills 自动生成 |
| 容易拼写错误 | AI 保证格式正确 |

## 📊 功能状态

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| **核心功能** |||
| 多 Agent 管理 | ✅ 已实现 | 懒加载、空闲清理、生命周期管理 |
| 消息路由 | ✅ 已实现 | 单播、广播、工作流编排 |
| 会话持久化 | ✅ 已实现 | JSONL 格式、上下文恢复 |
| **渠道接入** |||
| CLI 命令行 | ✅ 已实现 | 交互式命令行界面 |
| 钉钉 | ✅ 已实现 | 企业内部应用集成 |
| 飞书 | ✅ 已实现 | 企业自建应用集成 |
| **规划中 (v0.2.0)** |||
| 工具调用 | 🚧 设计中 | 详见 [FEATURES.md](./FEATURES.md) |
| 上下文裁剪 | 🚧 设计中 | 详见 [FEATURES.md](./FEATURES.md) |

<details>
<summary>📋 完整功能清单</summary>

查看 [FEATURES.md](./FEATURES.md) 了解所有功能、版本规划和贡献指南。

</details>

---

## 快速开始

### AI Native 安装（推荐）

**一句话安装：**

```
"帮我安装 agent-swarm"
```

Claude 会自动执行：
1. 配置 npm 全局目录（无需 sudo）
2. 安装依赖并编译
3. 全局安装 swarm 命令
4. 初始化工作空间

---

### 手动安装

如果需要手动安装，执行以下命令：

```bash
git clone https://github.com/your-repo/agent-swarm.git
cd agent-swarm

# 一键安装脚本
./scripts/install.sh

# 重新加载配置
source ~/.bashrc  # 或 source ~/.zshrc
```

### 2. 配置 API 密钥（可选）

**方式一：环境变量（推荐）**

```bash
# Anthropic Claude
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# 智谱 GLM
export GLM_API_KEY=your-glm-api-key

swarm start
```

**方式二：配置文件**

编辑 `~/.agent-swarm/agent-swarm.json`：

```json
{
  "apiKeys": {
    "anthropic": "your-anthropic-key",
    "openai": "your-openai-key",
    "glm": "your-glm-api-key"
  }
}
```

### 2.1. 配置 Base URL（可选）

如果需要使用自定义的 API 端点（如 GLM coding-plan），可以配置 Base URL。

**方式一：环境变量（推荐）**

```bash
# GLM 普通端点
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# GLM coding-plan 端点
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/coding-plan

# 自定义 OpenAI 端点
export OPENAI_BASE_URL=https://custom.openai.com/v1
```

**方式二：配置文件**

编辑 `~/.agent-swarm/agent-swarm.json`：

```json
{
  "apiKeys": {
    "glm": "your-glm-api-key"
  },
  "baseUrls": {
    "glm": "https://open.bigmodel.cn/api/paas/v4/coding-plan",
    "openai": "https://custom.openai.com/v1",
    "anthropic": "https://custom.anthropic.com"
  }
}
```

**优先级**：环境变量 > 配置文件 > 默认值

### 3. 启动服务

```bash
swarm
```

启动后会看到：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agent Swarm 工作空间已就绪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 工作空间: ~/.agent-swarm
✓ 可用 Agents: 1

🤖 Agent Swarm CLI
输入消息发送给 Agent，输入 /exit 退出
```

## CLI 命令

### swarm start

启动 Agent Swarm 服务：

```bash
swarm
```

### swarm create-agent

创建新的 Agent：

```bash
swarm create-agent <name>                    # 创建基础 Agent
swarm create-agent translator --description "翻译助手"  # 带描述
swarm create-agent agent --template basic    # 使用模板
```

**命名规则**：
- 长度: 2-30 字符
- 允许: 字母、数字、连字符（-）
- 禁止: 以连字符开头/结尾、特殊字符、空格

### swarm list

列出所有 Agents：

```bash
swarm list                    # 表格格式
swarm list -v                 # 详细信息
swarm list --json             # JSON 格式
```

## 创建更多 Agent

> 安装时已自动创建默认 Agent，以下为创建额外 Agent 的方法

### 方式一：CLI 命令

```bash
swarm create-agent translator --description "专业的中英翻译助手"
```

### 方式二：AI Native

在 Claude Code 中描述你的需求：

```
用户: 创建一个翻译助手，支持中英互译
```

### 方式三：手动创建

```bash
mkdir -p ~/.agent-swarm/agents/translator
# 然后创建 config.json 和 prompt.md
```

### Agent 配置字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent 唯一标识符 |
| name | string | 是 | Agent 显示名称 |
| description | string | 否 | Agent 功能描述 |
| model | string | 否 | 模型 ID（默认 claude-sonnet-4-6） |
| channels | array | 否 | 消息渠道配置 |
| createdAt | string | 是 | 创建时间（ISO 8601） |

## 配置 Agent

### 方式一：AI Native（推荐）

```
用户: 把翻译助手改成用 GPT-4
```

```
用户: 让客服 Agent 更有创意一些，调高温度
```

### 方式二：手动修改

编辑 `~/.agent-swarm/agents/{agent-id}/config.json`：

```json
{
  "model": "claude-opus-4-6",
  "description": "更新后的描述"
}
```

## 添加渠道

### 支持的渠道

| 渠道 | 说明 | 必需配置 |
|------|------|---------|
| CLI | 命令行界面 | 无 |
| 钉钉 | 钉钉企业通讯 | appKey, appSecret |
| 飞书 | 飞书企业通讯 | appId, appSecret |

### 方式一：AI Native（推荐）

```
用户: 给翻译助手添加钉钉渠道
```

Claude 会询问必需的配置信息并自动生成配置。

### 方式二：手动配置

编辑 `~/.agent-swarm/agents/{agent-id}/config.json`：

```json
{
  "channels": [
    {
      "type": "dingtalk",
      "config": {
        "appKey": "your-app-key",
        "appSecret": "your-app-secret"
      }
    }
  ]
}
```

### 获取渠道配置

**钉钉**：
1. 访问 [钉钉开放平台](https://open.dingtalk.com/)
2. 创建企业内部应用
3. 获取 AppKey 和 AppSecret

**飞书**：
1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run setup` | 安装依赖并编译 |
| `npm run build` | 编译 |
| `npm test` | 测试 |

### CLI 交互命令

| 命令 | 说明 |
|------|------|
| `/exit` | 退出程序 |
| `/help` | 显示帮助 |
| `/clear` | 清屏 |

## 目录结构

```
~/.agent-swarm/
├── agent-swarm.json             # 全局配置（API 密钥）
│   // 示例: { "apiKeys": { "anthropic": "sk-ant-...", "openai": "sk-..." } }
│
├── .claude/
│   └── skills/
│       ├── create-agent.md      # 创建 Agent skill
│       ├── configure-agent.md   # 配置 Agent skill
│       └── add-channel.md       # 添加渠道 skill
│
├── agents/
│   └── <agent-id>/
│       ├── config.json          # Agent 配置
│       └── prompt.md            # Agent 提示词
│
└── sessions/
    └── <session-id>.jsonl       # 会话记录
```

## 常见问题

### Q: 如何切换模型？

修改 Agent 的 `config.json`：
```json
{
  "model": "claude-opus-4-6"
}
```

**使用智谱 GLM 模型：**

1. 配置 GLM API 密钥和 Base URL（二选一）：

```bash
# 方式一：环境变量
export GLM_API_KEY=your-glm-api-key

# 普通端点（默认）
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# 或使用 coding-plan 端点
export GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/coding-plan
```

或在 `~/.agent-swarm/agent-swarm.json` 中配置：

```json
{
  "apiKeys": {
    "glm": "your-glm-api-key"
  },
  "baseUrls": {
    "glm": "https://open.bigmodel.cn/api/paas/v4/coding-plan"
  }
}
```

2. 在 Agent 配置中使用 GLM 模型：

```json
{
  "model": "glm-4-plus"
}
```

支持的模型：

**Anthropic Claude**
- `claude-opus-4-6`
- `claude-sonnet-4-6`
- `claude-haiku-4-5`

**智谱 GLM**
- `glm-4-plus`
- `glm-4-air`
- `glm-4-flash`
- `glm-4-plus-latest`
- `glm-4-air-latest`
- `glm-4-flash-latest`

### Q: 如何调整 Agent 的回复风格？

修改 `prompt.md` 中的行为指南。

### Q: Agent 没有响应怎么办？

1. 检查 API 密钥是否正确设置
2. 检查 Agent 配置文件格式是否正确
3. 查看终端日志错误信息

### Q: 如何备份 Agent 配置？

```bash
cp -r ~/.agent-swarm/agents ./agents-backup
```

### Q: 如何删除 Agent？

```bash
rm -rf ~/.agent-swarm/agents/<agent-id>
```

### Q: 如何查看所有 Agents？

```bash
swarm list
```

## 全局安装

**AI Native 方式：**

```
"帮我安装 agent-swarm"
```

Claude 会自动运行安装脚本并配置所有依赖。

**手动安装：**

```bash
./scripts/install.sh && source ~/.bashrc
```

**备选方案（使用 npx）：**

```bash
npx agent-swarm start
```

**⚠️ 注意**：
- ❌ 不要使用 `sudo npm install -g .`，这会导致权限问题
- ✅ 安装脚本会自动配置 npm 用户目录
- ✅ 一次配置，永久生效（无需 sudo）

## 更多文档

- [架构设计](.claude/design.md)
- [回归测试用例](tests/REGRESSION_TEST_CASES.md)
- [E2E 测试指南](tests/E2E_TEST_GUIDE.md)

## 许可证

MIT
