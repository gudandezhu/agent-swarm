# CLI 命令全面测试验证方案

**版本**: v1.0.0
**更新日期**: 2026-03-07
**设计者**: Architect
**目标**: 确保 CLI 命令功能完整、稳定、易用

---

## 1. 测试策略概述

### 1.1 测试目标

| 目标 | 描述 | 验收标准 |
|------|------|---------|
| 功能完整性 | 所有命令和选项正常工作 | 100% 功能覆盖 |
| 边界处理 | 正确处理各种边界情况 | 0 未处理异常 |
| 错误处理 | 友好的错误提示和恢复 | 错误消息清晰 |
| 用户体验 | 符合用户预期的交互 | 用户测试通过 |
| 自动化 | 支持自动化测试和 CI/CD | 测试可脚本化 |

### 1.2 测试类型

```
┌─────────────────────────────────────────────────────────────┐
│                      测试金字塔                              │
├─────────────────────────────────────────────────────────────┤
│                    E2E 测试 (5%)                            │
│         真实场景、完整流程、跨命令交互                        │
├─────────────────────────────────────────────────────────────┤
│                  集成测试 (25%)                              │
│        命令间协作、文件系统交互、配置管理                      │
├─────────────────────────────────────────────────────────────┤
│                 单元测试 (70%)                               │
│       单个命令、参数解析、输出格式、错误处理                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 测试环境

| 环境 | 用途 | 配置 |
|------|------|------|
| 本地开发 | 开发和调试 | WSL2/Linux |
| CI 环境 | 自动化测试 | Docker |
| 生产模拟 | 真实场景测试 | 独立虚拟机 |

---

## 2. 测试用例清单

### 2.1 优先级定义

| 优先级 | 定义 | 阻塞发布 |
|--------|------|---------|
| **P0** | 核心功能，必须正常工作 | ✅ 是 |
| **P1** | 重要功能，影响用户体验 | ⚠️ 警告 |
| **P2** | 增强功能，可延后处理 | ❌ 否 |

---

### 2.2 全局命令测试 (TC-GLOBAL)

#### TC-GLOBAL-001: 版本显示 (P0)
```bash
swarm --version
swarm -v
swarm version
```
**验证**: 显示版本号 `v0.1.0`

#### TC-GLOBAL-002: 帮助显示 (P0)
```bash
swarm --help
swarm -h
swarm help
```
**验证**: 显示所有可用命令和选项

#### TC-GLOBAL-003: 未知命令处理 (P0)
```bash
swarm unknown-command
```
**验证**: 友好的错误提示

#### TC-GLOBAL-004: 空命令处理 (P0)
```bash
swarm
```
**验证**: 提示使用 --help

---

### 2.3 swarm init 命令测试 (TC-INIT)

#### 基础功能测试

#### TC-INIT-001: 首次初始化 (P0)
```bash
swarm init
```
**验证**:
- [ ] 创建 `~/.agent-swarm/` 目录
- [ ] 创建 `agents/`, `sessions/`, `memory/`, `.claude/skills/` 子目录
- [ ] 生成 `config.json` 配置文件
- [ ] 显示成功消息

#### TC-INIT-002: 重复初始化 (P0)
```bash
swarm init
swarm init
```
**验证**:
- [ ] 第二次跳过初始化
- [ ] 显示 "已存在" 提示
- [ ] 不覆盖现有配置

#### TC-INIT-003: 强制重新初始化 (P1)
```bash
swarm init --force
```
**验证**:
- [ ] 备份现有工作空间
- [ ] 重新创建目录结构
- [ ] 重新生成配置文件

#### TC-INIT-004: 静默模式初始化 (P2)
```bash
swarm init --quiet
swarm init -q
```
**验证**:
- [ ] 减少输出信息
- [ ] 功能正常

#### TC-INIT-005: 自定义工作空间路径 (P1)
```bash
swarm init --workspace /custom/path
```
**验证**:
- [ ] 在指定路径创建工作空间
- [ ] 配置文件记录自定义路径

#### 边界测试

#### TC-INIT-101: 无权限目录 (P0)
```bash
# 在无权限目录执行
swarm init
```
**验证**:
- [ ] 友好的错误提示
- [ ] 不崩溃

#### TC-INIT-102: 磁盘空间不足 (P1)
```bash
# 模拟磁盘满
```
**验证**:
- [ ] 检测空间不足
- [ ] 友好错误提示

#### TC-INIT-103: 中断恢复 (P1)
```bash
# 初始化过程中中断 (Ctrl+C)
swarm init
```
**验证**:
- [ ] 再次初始化能恢复
- [ ] 不留下损坏状态

#### 配置文件测试

#### TC-INIT-201: config.json 格式验证 (P0)
```bash
# 验证生成的 config.json
cat ~/.agent-swarm/config.json | jq .
```
**验证**:
- [ ] JSON 格式正确
- [ ] 包含必需字段: version, workspace, apiKeys

#### TC-INIT-202: Skills 文件复制 (P0)
```bash
ls ~/.agent-swarm/.claude/skills/
```
**验证**:
- [ ] create-agent.md 存在
- [ ] configure-agent.md 存在
- [ ] add-channel.md 存在

---

### 2.4 swarm create-agent 命令测试 (TC-CREATE)

#### 基础功能测试

#### TC-CREATE-001: 创建基础 Agent (P0)
```bash
swarm create-agent test-agent
```
**验证**:
- [ ] 创建 `~/.agent-swarm/agents/test-agent/` 目录
- [ ] 生成 `config.json` (id, name, model, channels, createdAt)
- [ ] 生成 `prompt.md` (包含标题和描述)
- [ ] 显示成功消息

#### TC-CREATE-002: 带描述创建 (P0)
```bash
swarm create-agent translator --description "翻译助手"
```
**验证**:
- [ ] config.json 包含指定描述
- [ ] prompt.md 包含描述内容

#### TC-CREATE-003: 使用模板创建 (P1)
```bash
swarm create-agent agent --template basic
```
**验证**:
- [ ] 使用模板内容
- [ ] 生成符合模板的配置

#### 名称验证测试

#### TC-CREATE-101: 有效名称 (P0)
```bash
swarm create-agent agent
swarm create-agent my-agent
swarm create-agent test-agent-123
```
**验证**:
- [ ] 所有有效名称创建成功

#### TC-CREATE-102: 无效名称 - 过短 (P0)
```bash
swarm create-agent a
```
**验证**:
- [ ] 显示 "名称过短" 错误
- [ ] 不创建目录

#### TC-CREATE-103: 无效名称 - 过长 (P1)
```bash
swarm create-agent $(python -c "print('a'*50)")
```
**验证**:
- [ ] 显示 "名称过长" 错误

#### TC-CREATE-104: 无效名称 - 特殊字符 (P0)
```bash
swarm create-agent "agent 123"
swarm create-agent "agent@123"
swarm create-agent "agent/123"
swarm create-agent "agent.name"
```
**验证**:
- [ ] 显示 "名称格式错误" 提示
- [ ] 列出允许的字符规则

#### TC-CREATE-105: 无效名称 - 连字符问题 (P0)
```bash
swarm create-agent -agent
swarm create-agent agent-
swarm create-agent agent--name
```
**验证**:
- [ ] 检测连字符位置错误
- [ ] 友好的错误提示

#### 重复创建测试

#### TC-CREATE-201: Agent 已存在 (P0)
```bash
swarm create-agent existing-agent
swarm create-agent existing-agent
```
**验证**:
- [ ] 第二次创建失败
- [ ] 显示 "已存在" 错误
- [ ] 不覆盖现有文件

#### 边界测试

#### TC-CREATE-301: 工作空间不存在 (P0)
```bash
# 删除工作空间后创建
rm -rf ~/.agent-swarm
swarm create-agent test
```
**验证**:
- [ ] 自动创建工作空间
- [ ] 成功创建 Agent

#### TC-CREATE-302: 并发创建 (P1)
```bash
# 同时创建多个 Agent
swarm create-agent agent1 &
swarm create-agent agent2 &
```
**验证**:
- [ ] 两个 Agent 都创建成功
- [ ] 无文件冲突

---

### 2.5 swarm list 命令测试 (TC-LIST)

#### 基础功能测试

#### TC-LIST-001: 空列表 (P0)
```bash
# 无 Agent 时执行
swarm list
```
**验证**:
- [ ] 显示 "没有找到任何 Agent"
- [ ] 提示创建新 Agent

#### TC-LIST-002: 列出单个 Agent (P0)
```bash
swarm create-agent test-agent
swarm list
```
**验证**:
- [ ] 显示 Agent ID
- [ ] 显示描述
- [ ] 显示状态 (✓)

#### TC-LIST-003: 列出多个 Agents (P0)
```bash
swarm create-agent agent1
swarm create-agent agent2
swarm list
```
**验证**:
- [ ] 显示所有 Agents
- [ ] 按创建时间排序（最新在前）

#### 输出格式测试

#### TC-LIST-101: 表格格式 (P0)
```bash
swarm list
```
**验证**:
- [ ] 表格对齐正确
- [ ] 包含 Agent 列表
- [ ] 显示总数统计

#### TC-LIST-102: JSON 格式 (P0)
```bash
swarm list --json
swarm list -j
```
**验证**:
- [ ] 输出有效 JSON
- [ ] 包含 count 字段
- [ ] 包含 agents 数组

#### TC-LIST-103: Verbose 模式 (P1)
```bash
swarm list --verbose
swarm list -v
```
**验证**:
- [ ] 显示详细信息（模型、渠道、创建时间）
- [ ] 显示 Agent 路径

#### 异常处理测试

#### TC-LIST-201: 配置文件损坏 (P0)
```bash
# 创建损坏的配置
echo "{invalid}" > ~/.agent-swarm/agents/bad-agent/config.json
swarm list
```
**验证**:
- [ ] 显示其他有效 Agents
- [ ] 标记损坏的 Agent (✗)
- [ ] 显示错误原因

#### TC-LIST-202: 缺少配置文件 (P0)
```bash
# 创建只有 prompt 的目录
mkdir -p ~/.agent-swarm/agents/partial-agent
echo "# Test" > ~/.agent-swarm/agents/partial-agent/prompt.md
swarm list
```
**验证**:
- [ ] 显示 "配置文件缺失" 错误
- [ ] 不影响其他 Agents

#### TC-LIST-203: 工作空间不存在 (P0)
```bash
rm -rf ~/.agent-swarm
swarm list
```
**验证**:
- [ ] 显示友好提示
- [ ] 建议运行 swarm init

---

### 2.6 swarm start 命令测试 (TC-START)

#### 基础功能测试

#### TC-START-001: 正常启动 (P0)
```bash
swarm start
```
**验证**:
- [ ] AgentSwarm 服务启动
- [ ] 加载所有 Agents
- [ ] 显示启动信息

#### TC-START-002: 开发模式启动 (P1)
```bash
swarm start --dev
```
**验证**:
- [ ] 启用开发日志
- [ ] 热重载（如支持）

#### TC-START-003: 指定端口启动 (P1)
```bash
swarm start --port 3000
```
**验证**:
- [ ] 在指定端口启动
- [ ] 显示端口信息

#### 启动状态测试

#### TC-START-101: 无 Agent 时启动 (P0)
```bash
# 无任何 Agent
swarm start
```
**验证**:
- [ ] 显示 "0 个 Agent" 提示
- [ ] 建议创建 Agent
- [ ] 服务正常启动

#### TC-START-102: 有 Agent 时启动 (P0)
```bash
swarm create-agent test-agent
swarm start
```
**验证**:
- [ ] 显示加载的 Agents
- [ ] 显示 Agent 状态

#### 边界测试

#### TC-START-201: 端口占用 (P0)
```bash
# 占用端口后启动
swarm start --port 8080
swarm start --port 8080
```
**验证**:
- [ ] 检测端口占用
- [ ] 友好的错误提示

#### TC-START-202: 工作空间不存在 (P0)
```bash
rm -rf ~/.agent-swarm
swarm start
```
**验证**:
- [ ] 自动初始化工作空间
- [ ] 成功启动服务

---

### 2.7 集成测试 (TC-INTEGRATION)

#### 完整流程测试

#### TC-INT-001: 新用户完整流程 (P0)
```bash
# 1. 全新安装后首次使用
swarm init
# 2. 创建第一个 Agent
swarm create-agent my-assistant --description "我的助手"
# 3. 验证创建成功
swarm list
# 4. 启动服务
swarm start
```
**验证**:
- [ ] 所有命令正常执行
- [ ] 输出信息连贯友好
- [ ] 无需用户干预

#### TC-INT-002: 多 Agent 管理 (P0)
```bash
swarm create-agent agent1
swarm create-agent agent2
swarm create-agent agent3
swarm list
swarm start
```
**验证**:
- [ ] 多个 Agent 都能创建
- [ ] list 显示所有 Agents
- [ ] start 加载所有 Agents

#### TC-INT-003: 命令选项组合 (P1)
```bash
swarm create-agent test --description "测试" --template basic
swarm list --json
swarm start --dev --port 3000
```
**验证**:
- [ ] 选项正确组合
- [ ] 选项优先级正确

#### 文件系统交互测试

#### TC-INT-101: 工作空间迁移 (P1)
```bash
# 1. 创建工作空间
swarm init
# 2. 创建 Agent
swarm create-agent test
# 3. 备份工作空间
cp -r ~/.agent-swarm ~/backup-swarm
# 4. 删除工作空间
rm -rf ~/.agent-swarm
# 5. 从备份恢复
cp -r ~/backup-swarm ~/.agent-swarm
# 6. 验证
swarm list
```
**验证**:
- [ ] 正确识别恢复的工作空间
- [ ] Agent 配置正常

#### TC-INT-102: 部分文件修复 (P1)
```bash
# 1. 创建 Agent
swarm create-agent test
# 2. 删除 prompt.md
rm ~/.agent-swarm/agents/test/prompt.md
# 3. 验证
swarm list
```
**验证**:
- [ ] 标记不完整状态
- [ ] 其他功能正常

---

### 2.8 E2E 测试 (TC-E2E)

#### 真实场景测试

#### TC-E2E-001: 全新用户上手 (P0)
**场景**: 用户首次安装 agent-swarm
```bash
npm install -g agent-swarm
swarm --help
swarm init
swarm create-agent assistant --description "AI 助手"
swarm list
swarm start
```
**验证**:
- [ ] 无需查看文档即可完成
- [ ] 错误提示足够友好
- [ ] 成功启动服务

#### TC-E2E-002: 开发者工作流 (P0)
**场景**: 开发者创建和测试多个 Agents
```bash
swarm init
swarm create-agent translator --description "翻译助手"
swarm create-agent summarizer --description "摘要助手"
swarm create-agent composer --description "写作助手"
swarm list -v
swarm start --dev
```
**验证**:
- [ ] 支持快速迭代
- [ ] verbose 模式提供足够信息

#### TC-E2E-003: 故障恢复 (P1)
**场景**: 用户遇到各种错误情况
```bash
# 中断操作
swarm create-agent test
^C
swarm create-agent test

# 磁盘空间不足（模拟）
# ...

# 权限问题
swarm init --workspace /root/test
```
**验证**:
- [ ] 所有错误都有友好提示
- [ ] 错误后可以继续操作
- [ ] 不会留下损坏状态

---

## 3. 测试执行计划

### 3.1 测试频率

| 测试类型 | 频率 | 触发条件 | 负责人 |
|---------|------|---------|--------|
| 单元测试 | 每次 PR 提交 | 代码变更 | Developer |
| 集成测试 | 每日 | 定时任务 | Tester |
| E2E 测试 | 每周 | 定时任务 + 发布前 | Tester |
| 回归测试 | 每次发布 | 发布前 | Architect |

### 3.2 测试优先级执行

**P0 测试** (必须通过):
- 每次 PR 提交前执行
- CI/CD 管道强制执行
- 失败阻止合并

**P1 测试** (建议通过):
- 每日定时执行
- CI/CD 管道执行但不阻止
- 失败记录问题

**P2 测试** (可选):
- 每周执行
- 发布前执行
- 失败不影响发布

### 3.3 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| CLI 框架 | 85% | 92.78% ✅ |
| create-agent | 80% | 93.28% ✅ |
| list | 80% | 98.8% ✅ |
| init | 80% | 95.29% ✅ |
| start | 75% | 87.86% ✅ |

---

## 4. 自动化测试方案

### 4.1 单元测试自动化

**框架**: Vitest
**运行方式**: `npm test`
**CI 集成**: GitHub Actions / GitLab CI

```yaml
# .github/workflows/test.yml
name: CLI Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test -- --run
      - run: npm run test:coverage -- --run
```

### 4.2 集成测试自动化

**脚本**: `tests/cli/integration.test.ts`
**运行方式**: `npm test -- tests/cli/integration.test.ts`

```typescript
describe('CLI 集成测试', () => {
  it('完整用户流程', async () => {
    const workspace = new TestWorkspace();
    await workspace.initialize();

    // init -> create-agent -> list -> start
    const cli = new CLI(workspace.getPath());
    await cli.execute(['init']);
    await cli.execute(['create-agent', 'test']);
    const result = await cli.execute(['list']);
    expect(result.success).toBe(true);
  });
});
```

### 4.3 E2E 测试自动化

**方案 1: Shell 脚本**
```bash
#!/bin/bash
# tests/e2e/cli-e2e.sh

set -e

# 清理环境
rm -rf ~/.agent-swarm

# 完整流程
swarm init || exit 1
swarm create-agent test-agent || exit 1
swarm list | grep test-agent || exit 1
swarm start --daemon || exit 1

# 清理
pkill -f "swarm start"
```

**方案 2: Docker**
```dockerfile
# Dockerfile.e2e-cli
FROM node:20
RUN npm install -g agent-swarm
RUN swarm init
RUN swarm create-agent test-agent
RUN swarm list
```

### 4.4 性能测试

```bash
# 测试大量 Agent 的 list 性能
for i in {1..100}; do
  swarm create-agent agent-$i
done
time swarm list --json | jq .
```

---

## 5. 测试用例统计

### 5.1 用例数量统计

| 模块 | P0 | P1 | P2 | 总计 |
|------|----|----|----|------|
| 全局命令 | 4 | 0 | 0 | 4 |
| init | 8 | 3 | 0 | 11 |
| create-agent | 11 | 3 | 0 | 14 |
| list | 8 | 1 | 0 | 9 |
| start | 6 | 2 | 0 | 8 |
| 集成测试 | 3 | 3 | 0 | 6 |
| E2E 测试 | 3 | 0 | 0 | 3 |
| **总计** | **43** | **12** | **0** | **55** |

### 5.2 覆盖率统计

| 测试类型 | 用例数 | 自动化 | 覆盖命令 |
|---------|--------|--------|---------|
| 单元测试 | 39 | ✅ 100% | 所有命令 |
| 集成测试 | 10 | ✅ 80% | 命令交互 |
| E2E 测试 | 6 | ✅ 50% | 完整流程 |
| **总计** | **55** | **90%** | **100%** |

---

## 6. 问题跟踪和修复

### 6.1 问题分类

| 类型 | 严重程度 | 响应时间 | 修复时间 |
|------|---------|---------|---------|
| P0 功能缺陷 | 严重 | 2h | 24h |
| P1 功能缺陷 | 高 | 1d | 3d |
| P2 功能缺陷 | 中 | 3d | 1w |
| 体验问题 | 低 | 1w | 2w |

### 6.2 回归测试策略

**触发条件**:
- 修复 P0/P1 缺陷后
- 新功能添加后
- 每次发布前

**测试范围**:
- 相关命令的所有测试
- 受影响功能的集成测试
- 关键 E2E 场景

---

## 7. 验收标准

### 7.1 功能验收

- [ ] 所有 P0 测试用例通过
- [ ] P1 测试通过率 >= 95%
- [ ] 代码覆盖率 >= 80%
- [ ] 无已知严重缺陷

### 7.2 质量验收

- [ ] 所有命令有友好的错误提示
- [ ] 帮助文档完整准确
- [ ] 无内存泄漏
- [ ] 响应时间 < 1s (常见操作)

### 7.3 文档验收

- [ ] 每个命令有使用示例
- [ ] 错误消息有解决建议
- [ ] README 包含快速开始指南

---

## 8. 附录

### 8.1 测试环境配置

```bash
# 安装依赖
npm install

# 运行所有测试
npm test

# 运行 CLI 测试
npm test -- tests/cli/

# 生成覆盖率报告
npm run test:coverage -- --run
```

### 8.2 测试数据准备

```bash
# 创建测试工作空间
export TEST_WORKSPACE=/tmp/swarm-test-$(date +%s)
mkdir -p $TEST_WORKSPACE

# 清理测试数据
rm -rf $TEST_WORKSPACE
```

### 8.3 相关文档

- [REGRESSION_TEST_CASES.md](../tests/REGRESSION_TEST_CASES.md) - 回归测试用例
- [E2E_TEST_GUIDE.md](../tests/E2E_TEST_GUIDE.md) - E2E 测试指南
- [WORKSPACE_INIT_DESIGN_V2.md](./WORKSPACE_INIT_DESIGN_V2.md) - CLI 设计文档

---

**文档版本**: v1.0.0
**最后更新**: 2026-03-07
**维护者**: Architect
