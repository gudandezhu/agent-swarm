# Agent Swarm 用户 Skills

这些 skills 是 agent-swarm 框架的核心功能，供终端用户使用。

## 📚 可用 Skills

### Agent 管理

- **create-agent** - 通过自然语言创建新的 Agent
- **configure-agent** - 修改 Agent 的模型、温度等配置

### 渠道集成

- **add-channel** - 为 Agent 添加消息渠道（CLI、钉钉、飞书等）

### 团队协作

- **start-dev-team** - 启动完整开发团队（架构师+开发+测试）

## 🚀 使用方式

这些 skills 在用户安装 agent-swarm 后自动可用：

```bash
# 安装 agent-swarm
swarm init

# 直接使用自然语言调用
# "创建一个翻译助手"
# "为 agent 添加钉钉渠道"
# "启动开发团队"
```

## 📦 安装位置

框架安装时，这些 skills 会被复制到：
```
~/.agent-swarm/skills/
```

## 🔧 开发说明

如果你是 agent-swarm 框架的开发者，项目开发的 skills 请查看：
```
.claude/skills/
```

---

## 版本历史

查看 [VERSION.md](VERSION.md) 了解各 skill 的版本信息。
