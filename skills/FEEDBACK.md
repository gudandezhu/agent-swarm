# Skills 反馈收集

## 反馈渠道

### 1. GitHub Issues

推荐用于：
- Bug 报告
- 功能请求
- 触发失败反馈
- 文档改进建议

**模板**:

```markdown
## 问题描述

**Skill 名称**: create-agent
**用户输入**: "创建一个新的助手"
**预期行为**: 应该触发 create-agent skill
**实际行为**: 没有触发，Claude 自己生成了配置

## 环境

- Claude Code 版本: x.x.x
- 项目: agent-swarm

## 复现步骤

1. 打开 Claude Code
2. 输入: "创建一个新的助手"
3. 观察: 没有 skill 触发
```

### 2. 使用反馈

在项目根目录创建 `.claude/SKILLS_FEEDBACK.md`:

```markdown
# Skills 使用反馈

## 创建 Agent (create-agent)

### ✅ 成功案例
- "创建一个客服 Agent" - 正确触发
- "新建翻译助手" - 正确触发

### ❌ 失败案例
- "我想建一个机器人" - 未触发 (2026-03-07)

### 💡 改进建议
- 增加"机器人"作为触发词
```

### 3. 直接修改

如果发现 trigger 缺失，可以直接修改 skill 文件的 frontmatter：

```yaml
---
triggers:
  - "创建一个"
  - "新建 agent"
  - "我想建一个机器人"  # 新增
---
```

## 反馈分类

### 1. 触发问题

**症状**: Skill 没有在应该触发的时候触发

**信息收集**:
- 用户输入的完整句子
- 预期触发哪个 skill
- 实际发生了什么
- Claude 的回复

**示例**:

```markdown
## 触发失败

**Skill**: create-agent
**用户输入**: "帮我建一个 bot"
**预期**: 触发 create-agent，生成配置
**实际**: Claude 问"你想创建什么类型的 bot？"
**建议**: 增加 "bot" 作为触发词
```

### 2. 内容问题

**症状**: Skill 内容不准确或缺失

**信息收集**:
- 哪部分内容有问题
- 期望的内容是什么
- 为什么需要这个内容

**示例**:

```markdown
## 内容缺失

**Skill**: add-channel
**缺失内容**: 企业微信渠道配置
**原因**: 用户需要使用企业微信
**建议**: 参考 [企业微信文档](https://developer.work.weixin.qq.com/)
```

### 3. 模板问题

**症状**: 模板文件有误或缺失

**信息收集**:
- 哪个模板文件
- 模板的问题
- 建议的修复

**示例**:

```markdown
## 模板错误

**模板**: templates/agent-config.md
**问题**: 缺少 GPT-4 Turbo 模型 ID
**建议**: 添加 gpt-4-turbo 到支持的模型列表
```

### 4. 文档问题

**症状**: 文档不清晰或有错误

**信息收集**:
- 哪个文档
- 哪部分不清晰
- 建议的改进

## 反馈处理流程

### 1. 收集

```bash
# 查看所有反馈
cat .claude/SKILLS_FEEDBACK.md

# 查看 GitHub issues
gh issue list --label "skills"
```

### 2. 分类

将反馈归类到：
- **P0 - Critical**: 触发完全失效，影响核心功能
- **P1 - High**: 触发不准确，内容错误
- **P2 - Medium**: 文档不清晰，建议改进
- **P3 - Low**: 错别字，格式问题

### 3. 修复

按优先级处理：

```bash
# P0 - 立即修复
# 修改 frontmatter triggers

# P1 - 本周修复
# 更新 skill 内容或模板

# P2 - 下个版本
# 改进文档

# P3 - 有时间再处理
# 修正格式
```

### 4. 验证

```bash
# 运行验证脚本
bash .claude/skills/validate-skills.sh

# 测试触发
claude -p "用户测试输入"
```

### 5. 关闭

- 在反馈文件中标记为 `[已解决]`
- 更新 CHANGELOG
- 关闭 GitHub issue

## 反馈模板

### 快速反馈

```markdown
**Skill**: [skill-name]
**类型**: [触发/内容/模板/文档]
**问题**: [简要描述]
**建议**: [如何改进]
```

### 详细反馈

```markdown
## [标题]

### Skill
- **名称**: [skill-name]
- **版本**: v1.0.0

### 问题描述
[详细描述问题]

### 复现步骤
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

### 预期行为
[期望发生什么]

### 实际行为
[实际发生了什么]

### 环境信息
- Claude Code 版本:
- 操作系统:
- 项目:

### 附加信息
- [截图]
- [日志]
- [其他相关信息]

### 建议
[如何改进]
```

## 反馈统计

定期统计反馈，识别改进方向：

```bash
# 统计反馈类型
grep -E "^\*\*类型\*\*:" .claude/SKILLS_FEEDBACK.md | sort | uniq -c

# 统计问题 skills
grep -E "^\*\*Skill\*\*:" .claude/SKILLS_FEEDBACK.md | sort | uniq -c
```

## 持续改进

根据反馈定期优化：

1. **每月**：统计反馈，识别高优先级问题
2. **每季度**：发布优化版本（v1.x.0）
3. **每年**：评估 skills 架构，必要时重构（v2.0.0）

## 反馈激励

如果你提供了有价值的反馈：

- 你的名字会出现在 CHANGELOG 的"致谢"部分
- 如果是新 feature，可能会在 skill 描述中注明"由 @username 建议"

感谢你的反馈！🙏
