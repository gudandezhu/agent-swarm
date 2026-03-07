# AgentSwarm

多 Agent 协作框架，支持 AI Native 设计理念。

## AI Native 设计

**核心理念**：用户用自然语言描述需求，AI 自动生成配置，无需手写 JSON。

| 传统方式 | AI Native |
|---------|-----------|
| 手写 config.json | 告诉 Claude "创建一个客服 Agent" |
| 查阅文档了解字段 | Claude 读取 skills 自动生成 |
| 容易拼写错误 | AI 保证格式正确 |

## 快速开始

### 1. 安装依赖

```bash
git clone https://github.com/your-repo/agent-swarm.git
cd agent-swarm
npm install
npm run build
```

### 2. 初始化工作空间

```bash
swarm init
```

这会创建 `~/.agent-swarm/` 目录结构，包含：
- `agents/` - Agent 配置目录
- `sessions/` - 会话存储
- `memory/` - 长期记忆
- `.claude/skills/` - AI Native 技能文件

### 3. 配置 API 密钥

编辑 `~/.agent-swarm/config.json`：

```json
{
  "apiKeys": {
    "anthropic": "your-anthropic-key",
    "openai": "your-openai-key"
  }
}
```

### 4. 创建 Agent

```bash
swarm create-agent my-assistant --description "我的 AI 助手"
```

### 5. 启动服务

```bash
swarm start
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

### 6. 开始对话

```
你: 你好
助手: 你好！我是你的助手，有什么可以帮助你的吗？
```

## CLI 命令

### 命令列表

| 命令 | 说明 |
|------|------|
| `swarm init` | 初始化工作空间 |
| `swarm start` | 启动 Agent Swarm 服务 |
| `swarm create-agent <name>` | 创建新 Agent |
| `swarm list` | 列出所有 Agents |

### swarm init

初始化 Agent Swarm 工作空间：

```bash
swarm init                    # 使用默认路径 ~/.agent-swarm
swarm init --force            # 强制重新初始化
swarm init --quiet            # 静默模式
```

### swarm start

启动 Agent Swarm 服务：

```bash
swarm start                   # 启动服务
swarm start --dev             # 开发模式
swarm start --port 3000       # 指定端口
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

## 创建 Agent

### 方式一：CLI 命令（推荐）

```bash
swarm create-agent translator --description "专业的中英翻译助手"
```

### 方式二：AI Native

在 Claude Code 中描述你的需求：

```
用户: 创建一个翻译助手，支持中英互译
```

Claude 会自动：
1. 读取 `create-agent.md` skill
2. 生成 `config.json` 和 `prompt.md`
3. 创建完整的 Agent 配置

### 方式三：手动创建

```bash
# 1. 创建目录
mkdir -p ~/.agent-swarm/agents/translator

# 2. 写配置
cat > ~/.agent-swarm/agents/translator/config.json << 'EOF'
{
  "id": "translator",
  "name": "翻译助手",
  "description": "专业的中英翻译助手",
  "model": "claude-sonnet-4-6",
  "channels": [],
  "createdAt": "2025-01-15T00:00:00.000Z"
}
EOF

# 3. 写提示词
cat > ~/.agent-swarm/agents/translator/prompt.md << 'EOF'
# 翻译助手

你是一个专业的翻译助手，精通中文和英文。

## 角色定义
- 提供准确、流畅的翻译
- 保持原文的风格和语气
- 处理专业术语和文化差异

## 行为指南
1. 准确翻译，不添加个人观点
2. 如有歧义，提供多种翻译选项
3. 保持格式（如引号、换行）
EOF
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
| `npm run build` | 编译 TypeScript |
| `npm test` | 运行测试 |
| `npm run test:coverage` | 运行测试覆盖率 |
| `npm run dev` | 开发模式（直接运行 tsx） |

### CLI 交互命令

| 命令 | 说明 |
|------|------|
| `/exit` | 退出程序 |
| `/help` | 显示帮助 |
| `/clear` | 清屏 |

## 目录结构

```
~/.agent-swarm/
├── config.json                  # 全局配置（API 密钥）
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

支持的模型：
- `claude-opus-4-6`
- `claude-sonnet-4-6`
- `claude-haiku-4-5`

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

将 `swarm` 命令安装到全局：

```bash
npm link
# 或
npm install -g .
```

安装后可在任何目录使用 `swarm` 命令。

## 更多文档

- [架构设计](.claude/design.md)
- [CLI 测试策略](.claude/CLI_TEST_STRATEGY.md)
- [回归测试用例](tests/REGRESSION_TEST_CASES.md)
- [E2E 测试指南](tests/E2E_TEST_GUIDE.md)

## 许可证

MIT
