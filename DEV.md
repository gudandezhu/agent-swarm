# 开发问题记录

## 2026-03-07 - CLI 命令实现任务

### 任务完成情况

按照 TDD 流程完成了三个 CLI 命令任务：

#### 任务 #11: 实现 swarm create-agent 命令
- 创建 `src/cli/commands/createAgent.ts`
- 实现 Agent 名称验证（2-30字符，仅字母数字连字符）
- 生成 config.json 和 prompt.md 文件
- 支持已存在检查和 --description 选项
- 测试覆盖率: 93.28%

#### 任务 #12: 实现 swarm list 命令
- 创建 `src/cli/commands/list.ts`
- 扫描 agents 目录并读取配置
- 支持表格和 JSON 两种输出格式
- 支持 --verbose 选项显示详细信息
- 按创建时间排序（最新在前）
- 测试覆盖率: 98.8%

#### 任务 #13: 添加 CLI 命令测试
- 创建 `tests/cli/helpers/testWorkspace.ts` 测试辅助工具
- 创建 `tests/cli/createAgentCommand.test.ts` (12个测试)
- 创建 `tests/cli/listCommand.test.ts` (10个测试)
- 更新 `tests/cli/CLIFramework.test.ts` 添加集成测试
- CLI 模块整体测试覆盖率: 92.78%

### 实现亮点

1. **TDD 严格执行**: RED → GREEN → IMPROVE 流程
2. **测试辅助工具**: 创建了可复用的 TestWorkspace 类
3. **完整集成**: 更新 CLI.ts 和 commands/index.ts
4. **错误处理**: 名称验证、已存在检查、配置损坏处理
5. **用户体验**: 友好的命令帮助和成功消息

### 测试结果

- 所有 528 个测试通过
- CLI 模块覆盖率: 92.78% (超过 80% 目标)
- Commands 模块覆盖率: 93.13%

---

## 2026-03-07 - 测试修复任务

### 问题 1: create-agent.md CRLF 换行符导致测试失败

**现象**: `ai-native-skills.test.ts` 中正则表达式匹配失败

**根因**: `.claude/skills/create-agent.md` 文件使用 CRLF (0d0a) 换行符，但测试正则只匹配 LF

**修复**:
```bash
sed -i 's/\r$//' .claude/skills/create-agent.md
```

**预防**:
- 在项目根目录添加 `.gitattributes` 文件，统一使用 LF 换行符
- 配置编辑器自动转换为 LF

---

### 问题 2: Agent 测试缺少 API Key 导致创建失败

**现象**: `agent-capabilities.test.ts` 和 `agent-manager-supplement.test.ts` 测试失败

**根因**: `getCapabilities` 方法内部调用 `this.get(agentId)`，会触发 Agent 创建。Agent 创建时需要验证 API Key 配置

**修复**: 在测试的 `beforeEach` 中添加 Mock API Key:
```typescript
beforeEach(async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key-for-xxx-test';
  // ...
});
```

**长期优化建议**:
- 创建 `ensureSkillsLoaded(agentId)` 方法，只初始化 SkillsLoader
- 或让 `getCapabilities` 直接读取 skills 目录，避免触发 Agent 创建

---

### 问题 3: E2E 测试缺少 API Key

**现象**: `e2e-real-user.test.ts` 测试失败

**根因**: E2E 测试创建真实 Agent 时需要 API Key

**修复**: 在 `beforeEach` 中添加 Mock API Key:
```typescript
beforeEach(async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key-for-e2e-test';
  // ...
});
```

---

## 修复结果

- 测试通过率: 415/415 (100%)
- 修复文件:
  - `.claude/skills/create-agent.md` (换行符)
  - `tests/agent-capabilities.test.ts` (添加 Mock API Key)
  - `tests/agent-manager-supplement.test.ts` (添加 Mock API Key)
  - `tests/e2e-real-user.test.ts` (添加 Mock API Key)
