---
name: start-dev-team
description: "启动完整开发团队（架构师+开发+测试）。使用 everything-claude-code 专业能力并行协作，架构设计、TDD 开发、E2E 测试。当用户说'启动团队'、'开始开发'、'组建团队'、'start team'时使用。"
version: "1.0.0"
author: "Agent Swarm Team"
triggers:
  - "启动团队"
  - "开始开发"
  - "组建团队"
  - "启动开发团队"
  - "start team"
  - "create team"
  - "并行开发"
category: "team-management"
---

# Start Development Team Skill

## 概述

启动完整开发团队，包含架构师、开发工程师、测试工程师三个角色。团队成员使用 everything-claude-code 的专业能力并行协作。

## 快速开始

**用户说**: "实现用户认证功能"

**Claude 自动**:
1. 启动架构师（plan）→ 分析需求、生成计划
2. 并行启动开发（tdd）+ 测试（review）
3. 协作完成任务

## 团队角色

### 1. 架构师 (Architect)

**能力**: `everything-claude-code:plan`

职责：
- 分析需求，评估技术方案
- 识别依赖和风险
- 生成实施计划和架构设计
- 确保方案符合项目规范

### 2. 开发工程师 (Developer)

**能力**: `everything-claude-code:tdd` + `everything-claude-code:tdd-workflow`

职责：
- 遵循 TDD 流程开发
- 编写测试（RED）→ 实现（GREEN）→ 重构（IMPROVE）
- 确保代码质量符合规范
- 处理架构师提出的设计要求

### 3. 测试工程师 (Tester)

**能力**: `everything-claude-code:security-review` + `everything-claude-code:python-review`（或对应语言 review）

职责：
- 代码审查（CRITICAL/HIGH 问题）
- 安全扫描
- 测试覆盖率验证（80%+）
- 验证符合回归测试用例

## 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    启动开发团队                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. 架构师 (plan)                                            │
│     ├─ 分析需求                                              │
│     ├─ 评估风险                                              │
│     └─ 生成实施计划 ←──────┐                                │
│                            │                                 │
│  2. 开发 (tdd) ────────────┼──→ 3. 测试 (review)             │
│     ├─ 编写测试             │     ├─ 代码审查                 │
│     ├─ 实现功能             │     ├─ 安全检查                 │
│     └─ 重构优化 ────────────┘     └─ 覆盖率验证               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 执行步骤

### 第一步：启动架构师

```typescript
await Agent({
  name: "architect",
  instructions: `
使用 everything-claude-code:plan 能力：

1. 分析用户需求
2. 评估技术风险和依赖
3. 生成详细的实施计划
4. 输出：PRD、架构设计、任务列表
`
});
```

### 第二步：并行启动开发和测试

```typescript
await Promise.all([
  Agent({
    name: "developer",
    instructions: `
使用 everything-claude-code:tdd 能力：

1. 遵循架构师的实施计划
2. 编写测试先行（RED）
3. 实现最小可行代码（GREEN）
4. 重构优化（IMPROVE）
5. 确保测试覆盖率 80%+
`
  }),

  Agent({
    name: "tester",
    instructions: `
使用 everything-claude-code:security-review 和代码审查能力：

1. 审查开发代码，标记 CRITICAL/HIGH 问题
2. 运行安全扫描
3. 验证测试覆盖率
4. 对照回归测试用例验证功能
`
  })
]);
```

## 语言适配

根据项目语言选择对应的 review skill：

| 语言 | Review Skill |
|------|-------------|
| Python | `everything-claude-code:python-review` |
| Go | `everything-claude-code:go-review` |
| Java | `everything-claude-code:springboot-verification` |
| TypeScript | `everything-claude-code:simplify` |

## 质量标准

### 架构师输出
- [ ] 需求分析文档
- [ ] 技术方案设计
- [ ] 风险评估
- [ ] 实施任务列表

### 开发输出
- [ ] 测试用例（先于实现）
- [ ] 功能实现代码
- [ ] 测试覆盖率 ≥ 80%
- [ ] 符合代码规范

### 测试输出
- [ ] 代码审查报告
- [ ] 安全扫描报告
- [ ] 覆盖率验证
- [ ] 回归测试结果

## 协作规则

1. **架构优先**: 开发必须等待架构师完成计划
2. **并行执行**: 开发和测试可并行工作
3. **问题反馈**: 测试发现问题反馈给开发修复
4. **规范遵守**: 所有角色遵循项目 CLAUDE.md 规范

## 完成条件

当以下条件全部满足时，团队工作完成：
1. 架构师计划已被执行
2. 所有测试通过
3. 测试覆盖率 ≥ 80%
4. 无 CRITICAL/HIGH 安全/质量问题
5. 回归测试用例通过

## 示例对话

**用户**: "实现用户认证功能，支持邮箱和手机号登录"

**Claude**:
```
启动开发团队...

[架构师] 分析中...
- 需求：邮箱/手机号登录
- 技术方案：JWT + bcrypt
- 风险：密码安全、Token 管理
- 计划：3 个阶段

[开发] TDD 执行中...
- RED: 编写登录测试
- GREEN: 实现登录逻辑
- IMPROVE: 重构验证

[测试] 审查中...
- 代码审查: PASS
- 安全扫描: PASS
- 覆盖率: 85%

✓ 团队任务完成
```

## 参考文档

- [Autonomous Loops Skill](plugin:everything-claude-code:autonomous-loops) - 更多团队协作模式
