# Agent Swarm 测试指南

## 快速开始

### 1. 快速验证（5分钟）
```bash
./quick-test.sh
```
验证核心功能是否正常工作。

### 2. 完整测试套件（30分钟）
```bash
./run-all-tests.sh
```
运行所有自动化测试。

### 3. 手动测试（1小时）
```bash
./start.sh
```
启动 TUI，按照 `tests/COMPLETE_TEST_CHECKLIST.md` 进行手动测试。

---

## 测试文件说明

### 测试脚本
| 文件 | 说明 | 用时 |
|------|------|------|
| `quick-test.sh` | 快速验证核心功能 | ~2分钟 |
| `run-all-tests.sh` | 完整自动化测试套件 | ~20分钟 |
| `start.sh` | 启动 TUI 手动测试 | - |

### 测试文档
| 文件 | 说明 |
|------|------|
| `COMPLETE_TEST_CHECKLIST.md` | 完整测试清单（所有功能） |
| `TEST_REPORT_TEMPLATE.md` | 测试报告模板 |
| `E2E_TEST_GUIDE.md` | E2E 测试指南 |
| `REGRESSION_TEST_CASES.md` | 回归测试用例 |
| `TEST_GUIDE.md` | Vitest 测试技巧 |

### 测试文件
| 文件 | 说明 |
|------|------|
| `e2e-user-behavior.test.ts` | 用户行为 E2E 测试 |
| `e2e-complete.test.ts` | 完整工作流 E2E 测试 |
| `agent-swarm.test.ts` | Agent Swarm 核心测试 |
| `cli/*.test.ts` | CLI 命令测试 |

---

## 测试类型

### 1. 单元测试
测试单个函数、类、组件。

```bash
# 运行所有单元测试
npm test

# 运行特定测试文件
npm test -- tests/agent-swarm.test.ts

# 生成覆盖率报告
npm run test:coverage -- --run
```

### 2. 集成测试
测试多个模块协作。

```bash
npm test -- tests/channel-e2e.test.ts
npm test -- tests/e2e-complete.test.ts
```

### 3. E2E 测试
测试完整用户场景。

```bash
npm test -- tests/e2e-user-behavior.test.ts
npm test -- tests/e2e-real-user.test.ts
```

### 4. 手动测试
需要人工验证的功能。

```bash
# 启动 TUI
./start.sh

# 按照 COMPLETE_TEST_CHECKLIST.md 测试
```

---

## 测试覆盖范围

### CLI 功能
- ✅ init - 初始化工作空间
- ✅ create-agent - 创建 Agent
- ✅ list - 列出 Agents
- ✅ start - 启动 TUI
- ✅ help - 显示帮助
- ✅ version - 显示版本

### TUI 功能
- ✅ 基本输入（单行、多行）
- ✅ 自动补全（命令、Agent）
- ✅ 历史记录（浏览、编辑）
- ✅ 命令处理（/help, /reset, /exit, /agent）
- ✅ 状态管理（Idle、Processing）
- ✅ 错误处理

### Agent 功能
- ✅ Agent 创建
- ✅ Agent 切换
- ✅ Agent 配置
- ✅ 多 Agent 协作

### Session 功能
- ✅ Session 持久化
- ✅ Session 恢复
- ✅ 上下文保持

### 消息功能
- ✅ 单轮对话
- ✅ 多轮对话
- ✅ 长消息处理
- ✅ 多行消息
- ✅ 代码块渲染

---

## 运行测试

### 方式1：快速测试
```bash
./quick-test.sh
```

### 方式2：完整测试
```bash
./run-all-tests.sh
```

### 方式3：单独运行
```bash
# 单元测试
npm test -- --run

# E2E 测试
npm test -- tests/e2e-*.test.ts --run

# CLI 测试
npm test -- tests/cli/*.test.ts --run
```

### 方式4：监视模式
```bash
npm test
```
文件变化时自动重新运行测试。

---

## 手动测试指南

### 1. CLI 测试
```bash
# 初始化
swarm init

# 创建 Agent
swarm create-agent my-agent

# 列出 Agents
swarm list

# 查看帮助
swarm --help
swarm init --help
```

### 2. TUI 测试
```bash
# 启动
./start.sh

# 测试清单
1. 输入文字 + Enter
2. \ + Enter（换行）
3. /he + Tab（补全）
4. ↑↓（历史）
5. /help（命令）
6. Ctrl+C（退出）
```

### 3. 错误测试
```bash
# 无效命令
输入: /invalid-command

# 空输入
直接按 Enter

# 网络错误
使用错误的 API key
```

---

## 测试报告

### 生成报告
1. 复制 `tests/TEST_REPORT_TEMPLATE.md`
2. 填写测试结果
3. 标记通过/失败的测试
4. 记录发现的问题

### 报告示例
```markdown
## 测试结果摘要

| 类别 | 总数 | 通过 | 失败 | 通过率 |
|------|------|------|------|--------|
| 单元测试 | 50 | 48 | 2 | 96% |
| 集成测试 | 10 | 10 | 0 | 100% |
| E2E测试 | 5 | 5 | 0 | 100% |
| 手动测试 | 30 | 28 | 2 | 93% |
```

---

## 缺陷跟踪

### 缺陷等级
- **P0**：阻塞性缺陷，必须立即修复
- **P1**：严重缺陷，影响主要功能
- **P2**：一般缺陷，影响次要功能
- **P3**：轻微缺陷，不影响使用

### 报告缺陷
使用 `TEST_REPORT_TEMPLATE.md` 中的缺陷模板：

```markdown
| 缺陷ID | 标题 | 等级 | 状态 | 发现日期 |
|--------|------|------|------|----------|
| BUG-001 | 输入框崩溃 | P0 | 待修复 | 2026-03-08 |
```

---

## CI/CD 集成

### GitHub Actions
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- --run
      - run: npm run test:coverage -- --run
```

---

## 测试最佳实践

### 1. 编写测试
- 遵循 AAA 模式（Arrange-Act-Assert）
- 使用描述性的测试名称
- 一个测试只验证一件事

### 2. 运行测试
- 提交前运行完整测试
- 定期运行手动测试
- 保持测试通过

### 3. 维护测试
- 及时更新失效的测试
- 删除重复的测试
- 保持测试代码清晰

---

## 常见问题

### Q: 测试失败怎么办？
A:
1. 查看错误信息
2. 检查相关代码
3. 修复问题
4. 重新运行测试

### Q: 如何调试测试？
A:
```bash
# 运行特定测试
npm test -- tests/xxx.test.ts --run

# 使用调试模式
node --inspect-brk node_modules/.bin/vitest run
```

### Q: 测试太慢怎么办？
A:
1. 使用 `--run` 避免监视模式
2. 只运行相关的测试
3. 使用 Mock 减少依赖

### Q: 如何增加覆盖率？
A:
1. 运行 `npm run test:coverage -- --run`
2. 查看未覆盖的代码
3. 编写测试覆盖这些代码
4. 目标：80%+ 覆盖率

---

## 相关文档

- [COMPLETE_TEST_CHECKLIST.md](./COMPLETE_TEST_CHECKLIST.md) - 完整测试清单
- [TEST_REPORT_TEMPLATE.md](./TEST_REPORT_TEMPLATE.md) - 测试报告模板
- [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md) - E2E 测试指南
- [REGRESSION_TEST_CASES.md](./REGRESSION_TEST_CASES.md) - 回归测试用例
- [TEST_GUIDE.md](./TEST_GUIDE.md) - Vitest 测试技巧
