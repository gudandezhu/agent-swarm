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
```

### 2. 配置 API 密钥

**方式一：共享配置（推荐）**

创建 `~/.agent-swarm/config.json`，所有 Agent 共享：

```json
{
  "apiKeys": {
    "anthropic": "your-anthropic-key",
    "openai": "your-openai-key"
  }
}
```

**方式二：Agent 专用配置**

在 Agent 配置中直接指定：

```json
{
  "id": "my-agent",
  "model": {
    "provider": "anthropic",
    "apiKey": "your-key"    // Agent 专用密钥
  }
}
```

**加载优先级**：Agent 专用 > 共享配置 > 环境变量

### 3. 启动服务

```bash
npm run dev
```

启动后会看到：
```
✓ AgentSwarm started
🤖 Agent Swarm CLI
输入消息发送给 Agent，输入 /exit 退出
✓ Channel registered: Command Line Interface (cli)
```

### 4. 开始对话

```
你: 你好
助手: 你好！我是你的助手，有什么可以帮助你的吗？
```

## 创建 Agent

### 方式一：AI Native（推荐）

在 Claude Code 中描述你的需求：

```
用户: 创建一个翻译助手，支持中英互译
```

Claude 会自动：
1. 读取 `create-agent.md` skill
2. 生成 `config.json` 和 `prompt.md`
3. 创建完整的 Agent 配置

### 方式二：手动创建

```bash
# 1. 创建目录
mkdir -p ~/.agent-swarm/agents/translator

# 2. 写配置
cat > ~/.agent-swarm/agents/translator/config.json << 'EOF'
{
  "id": "translator",
  "name": "翻译助手",
  "description": "专业的中英翻译助手",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"],
  "maxTokens": 4000,
  "temperature": 0.3
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
| description | string | 是 | Agent 功能描述 |
| model.provider | string | 否 | 模型提供商 |
| model.id | string | 否 | 模型 ID |
| temperature | number | 否 | 模型温度 (0-1) |
| maxTokens | number | 否 | 最大 token 数 |

### 支持的模型

| Provider | 模型 ID |
|----------|---------|
| anthropic | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |
| openai | gpt-4, gpt-4-turbo, gpt-3.5-turbo |

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
  "model": {
    "provider": "openai",
    "id": "gpt-4"
  },
  "temperature": 0.9
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

Claude 会询问必需的配置信息并自动生成 `channels.json`。

### 方式二：手动配置

创建 `~/.agent-swarm/agents/{agent-id}/channels.json`：

```json
{
  "channels": [
    {
      "type": "cli",
      "enabled": true
    },
    {
      "type": "dingtalk",
      "enabled": true,
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

## 命令列表

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 编译 TypeScript |
| `npm test` | 运行测试 |
| `npm run test:coverage` | 运行测试覆盖率 |

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
│       ├── prompt.md            # Agent 提示词
│       └── channels.json        # 渠道配置（可选）
│
└── sessions/
    └── <session-id>.jsonl       # 会话记录
```

## 常见问题

### Q: 如何切换模型？

修改 Agent 的 `config.json`：
```json
{
  "model": {
    "provider": "openai",
    "id": "gpt-4"
  }
}
```

### Q: 如何调整 Agent 的回复风格？

修改 `temperature` 参数：
- **更低 (0.1-0.3)**：更确定、一致
- **中等 (0.5-0.7)**：平衡
- **更高 (0.8-1.0)**：更有创意、随机

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

## 更多文档

- [架构设计](.claude/design.md)
- [回归测试用例](tests/REGRESSION_TEST_CASES.md)
- [E2E 测试指南](tests/E2E_TEST_GUIDE.md)

## 许可证

MIT
