# Agent Swarm 开发 Skills

这些 skills 是用于开发 agent-swarm 框架本身的，不是给终端用户使用的。

## 📁 目录结构

```
.claude/skills/
├── install/           # 安装和部署框架
├── dev/              # 开发相关技能
└── team/             # 团队协作（保留用于开发团队）
```

## 🔧 可用 Skills

### 框架安装

- **install** - 引导用户完成 agent-swarm 框架的完整安装和配置流程

### 开发工具

- 更多开发技能即将添加...

## 📝 与用户 Skills 的区别

- **开发 Skills** (`.claude/skills/`) - 框架开发者使用
- **用户 Skills** (`skills/`) - 框架安装后，终端用户使用

## 🚀 开发新功能

在开发 agent-swarm 框架时，这些 skills 会自动加载。如果你要添加新的开发 skill：

1. 在 `.claude/skills/` 下创建目录
2. 添加 `SKILL.md` 文件，遵循标准格式
3. 在项目 CLAUDE.md 中记录（如果需要）
