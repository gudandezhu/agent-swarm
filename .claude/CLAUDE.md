# 规则
.claude/CLAUDE.md保持最简,只存放结果文档的链接,禁止存放过程文档
保持文档和代码同步, 任何任务完成后必须检查相关文档是否需要同步更新
非必要不新增文档,不要输出总结文档,仅保留关键核心信息到已有文档中

# AI Native 设计规范

## 设计原则

**核心理念**：用户用自然语言描述需求，AI 自动生成配置，无需手写 JSON。

| 传统方式 | AI Native |
|---------|-----------|
| 手写 config.json | 告诉 Claude "创建一个客服 Agent" |
| 查阅文档了解字段 | Claude 读取 skills 自动生成 |
| 容易拼写错误 | AI 保证格式正确 |

## 实现方式

1. **Skills 目录**：框架用户 skills 在 `skills/`，开发 skills 在 `.claude/skills/`
2. **工作流程**：用户描述需求 → Claude 读取 skill → 自动生成配置

## Skills 架构

### 用户 Skills (`skills/`)
框架的核心功能，终端用户使用：
- `create-agent` - 创建 Agent
- `configure-agent` - 配置 Agent
- `add-channel` - 添加消息渠道
- `start-dev-team` - 启动开发团队

### 开发 Skills (`.claude/skills/`)
框架开发使用：
- `install` - 安装和部署框架
- `dev/*` - 其他开发相关技能

详见：[Skills README](../skills/README.md) | [开发 Skills README](skills/README.md)

# 相关文档索引

## 架构设计文档
[design.md](design.md)

## 项目文档
- [FEATURES.md](../FEATURES.md) - 功能清单与版本规划
- [README.md](../README.md) - 快速开始与使用指南

## 测试文档
- [TEST_GUIDE.md](../tests/TEST_GUIDE.md) - 测试技巧与 E2E 指南
- [REGRESSION_TEST_CASES.md](../tests/REGRESSION_TEST_CASES.md) - 回归测试用例
- [E2E_TEST_GUIDE.md](../tests/E2E_TEST_GUIDE.md) - E2E 测试指南
