# Skills 版本管理

## 当前版本

**v1.0.0** (2026-03-07)

### 更新内容

**Phase 1: Frontmatter 元数据**
- ✅ 添加 YAML frontmatter (name, description, version, triggers, category)
- ✅ 所有 4 个 skills 完成元数据添加
- ✅ 使用 "pushy" 描述风格，改善触发准确度

**Phase 2: 内容优化与模板提取**
- ✅ 创建 `.claude/skills/templates/` 目录
- ✅ 提取 3 个模板文件：
  - `agent-config.md` (130 行) - Agent 配置字段和模型选择
  - `agent-prompts.md` (67 行) - 各类 Agent prompt 模板
  - `channel-configs.md` (55 行) - 渠道配置示例
- ✅ 简化主 skill 文件：
  - create-agent.md: 283 → 162 行 (-43%)
  - configure-agent.md: 191 → 166 行 (-13%)
  - add-channel.md: 259 → 213 行 (-18%)
  - start-dev-team.md: 202 → 209 行 (+3%)
- ✅ 添加"快速开始"部分到每个 skill

**Phase 3: 质量保证**
- ✅ 创建 `validate-skills.sh` 验证脚本
- ✅ 检查 frontmatter 完整性
- ✅ 验证模板引用链接
- ✅ 文件行数和描述长度警告

## 版本策略

### 语义化版本 (Semver)

遵循 `MAJOR.MINOR.PATCH` 格式：

- **MAJOR**: 破坏性变更（如删除 skill、重大接口变更）
- **MINOR**: 新增功能（如新 skill、新模板）
- **PATCH**: bug 修复和小改进（如修正描述、补充示例）

### 示例

```
v1.0.0 - 初始发布，4 个 skills
v1.1.0 - 添加新 skill "delete-agent"
v1.1.1 - 修复 create-agent.md 的错别字
v2.0.0 - 重构所有 skills，移除旧格式
```

## 更新日志格式

```markdown
## v1.1.0 (YYYY-MM-DD)

### Added
- 新增 "delete-agent" skill
- 添加 GitHub Actions 集成示例

### Changed
- 优化 create-agent 触发词
- 更新 agent-config.md 模板

### Fixed
- 修复 validate-skills.sh 触发词计数 bug

### Deprecated
- "start-dev-team" 旧版工作流（v2.0.0 移除）

### Removed
- 移除已废弃的 "agent-helper" skill
```

## 变更流程

### 1. 提议变更

在更新 skill 前，创建 issue 或更新 `SKILLS_OPTIMIZATION_PLAN.md`：

```
## Proposed Changes for v1.1.0

- Add "delete-agent" skill
- Improve triggers for "create-agent"
```

### 2. 更新版本号

修改对应 skill 文件的 frontmatter：

```yaml
---
version: "1.1.0"
---
```

### 3. 更新 CHANGELOG

在本文档中添加变更记录。

### 4. 验证

运行验证脚本：

```bash
bash .claude/skills/validate-skills.sh
```

### 5. 测试触发

验证 skills 是否正常触发：

```bash
# 创建测试 agent
claude -p "创建一个测试 Agent"

# 验证是否使用了 create-agent skill
```

### 6. 提交

```bash
git add .claude/skills/
git commit -m "chore(skills): bump to v1.1.0"
```

## 发布检查清单

- [ ] 所有 skills 有完整 frontmatter
- [ ] 版本号已更新
- [ ] CHANGELOG 已更新
- [ ] 验证脚本通过
- [ ] 触发词测试通过
- [ ] 模板引用链接有效
- [ ] 文件行数合理（<300 行）
- [ ] 描述长度合理（<200 字符）

## 回滚策略

如果新版本有问题：

1. **立即回滚**: 恢复到上一个 git tag
   ```bash
   git checkout v1.0.0
   ```

2. **修复重发**: 修复问题后发布 patch 版本
   ```
   v1.1.0 (有问题) → v1.1.1 (修复)
   ```

3. **记录问题**: 在 CHANGELOG 中记录问题和修复

## 路线图

### v1.1.0 (计划中)
- 添加 "delete-agent" skill
- 添加 "list-agents" skill
- 优化触发词准确度
- 添加技能触发测试脚本

### v1.2.0 (计划中)
- 添加 "start-swarm" skill
- 集成 MCP 服务器配置
- 添加技能使用统计

### v2.0.0 (未来)
- 重构 skills 架构
- 可能的破坏性变更
- 完整的技能测试套件
