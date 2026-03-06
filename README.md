# AgentSwarm

多 Agent 协作框架

## 开始使用

```bash
npm install
export ANTHROPIC_API_KEY=your-key
npm run dev
```

## 创建 Agent

```bash
# 1. 创建目录
mkdir -p ~/.agent-swarm/agents/my-agent

# 2. 写配���
echo '{"id":"my-agent","name":"助手","model":{"provider":"anthropic","id":"claude-sonnet-4-6"},"channels":["cli"]}' \
  > ~/.agent-swarm/agents/my-agent/config.json

# 3. 写提示词
echo '你是助手。' > ~/.agent-swarm/agents/my-agent/prompt.md
```

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 运行 |
| `npm run build` | 编译 |
| `npm test` | 测试 |

## 结构

```
~/.agent-swarm/          # Agent 配置
├── agents/              # 你的 Agent
└── sessions/            # 会话记录
```

更多：[架构设计](.claude/design.md)
