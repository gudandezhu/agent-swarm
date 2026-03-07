# 开发问题记录

## 2026-03-07 - CLI 优化: 完善 TUI 组件测试

### 任务完成情况

按照 TDD 流程完善了所有 TUI 组件的测试覆盖：

#### 新增测试文件
1. `tests/cli/tui/components/Header.test.ts` - Header 组件测试（14 个测试）
2. `tests/cli/tui/components/ChatArea.test.ts` - ChatArea 组件测试（25 个测试）
3. `tests/cli/tui/components/StatusLine.test.ts` - StatusLine 组件测试（16 个测试）
4. `tests/cli/tui/CLIChannelTUI.test.ts` - TUI 主入口测试（20 个测试，之前为占位测试）

#### 组件改进
为所有组件添加了 `invalidated` getter 方法：
- `Header.ts` - 添加 `_invalidated` 属性和 getter
- `ChatArea.ts` - 添加 `invalidated` getter
- `StatusLine.ts` - 添加 `_invalidated` 属性和 getter
- `AgentSidebar.ts` - 已有 `invalidated` getter

### 测试覆盖

#### TUI 组件整体覆盖率
- **语句覆盖率**: 95.48%
- **分支覆盖率**: 94.33%
- **函数覆盖率**: 83.87%
- **行覆盖率**: 95.48%

#### 各组件覆盖率
- **Header**: 95.74% (语句), 100% (分支)
- **ChatArea**: 98.55% (语句), 91.3% (分支)
- **StatusLine**: 96.07% (语句), 100% (分支)
- **AgentSidebar**: 92.63% (语句), 94.44% (分支)

### 测试场景

#### Header 组件测试
- 初始化（默认版本、自定义版本）
- 渲染（标题行、版本号、工作空间路径）
- 窄/宽屏幕适配

#### ChatArea 组件测试
- 添加消息（用户、助手）
- 清空消息
- 滚动功能（向上、向下、边界检查）
- 渲染（时间戳、内容截断、可见数量限制）
- 失效状态管理

#### StatusLine 组件测试
- 思考状态切换
- 渲染（空状态、思考状态）
- 旋转动画效果

#### CLIChannelTUI 测试
- 基础功能（创建、参数配置）
- 组件集成（所有子组件）
- 消息处理（接收消息、设置状态、切换 Agent）
- 启动和停止

### 测试结果

- TUI 组件专项测试: 91 个测试全部通过
- 完整测试套件: 711 个测试全部通过

---

## 2026-03-07 - CLI 优化: 实现 AgentSidebar agents 列表加载

### 任务完成情况

按照 TDD 流程完成了 AgentSidebar 组件的 agents 列表加载功能：

#### 实现的功能
1. **异步加载 Agent 列表** - 从指定目录读取所有 Agent
2. **解析配置文件** - 读取每个 Agent 的 config.json
3. **错误处理** - 处理缺失或格式错误的配置文件
4. **状态跟踪** - 跟踪加载状态和失效状态
5. **选中切换** - 支持切换当前选中的 Agent

#### 新增方法
- `loadAgents()` - 异步加载 Agent 列表
- `readAgentInfo()` - 读取单个 Agent 信息
- `isLoaded()` - 检查是否已加载完成
- `setCurrentAgent()` - 设置当前 Agent（更新失效状态）

### 代码变更

**修改文件**: `src/channel/cli/components/AgentSidebar.ts`

**新增内容**:
- 添加 `agentsPath` 私有属性存储路径
- 添加 `loaded` 属性跟踪加载状态
- 添加 `_invalidated` 属性跟踪失效状态
- 构造函数中启动异步加载
- 实现完整的加载和错误处理逻辑

### 测试结果

- AgentSidebar 测试覆盖率: **93.58%** (语句), **94.44%** (分支), **77.77%** (函数), **93.58%** (行)
- 所有 646 个测试通过
- 16 个 AgentSidebar 专项测试全部通过

### TDD 流程

1. ✅ **RED** - 创建测试文件，确认失败
2. ✅ **GREEN** - 实现功能，所有测试通过
3. ✅ **IMPROVE** - 代码已优化，添加完整错误处理

### 测试覆盖

测试覆盖的场景：
- 组件初始化（空目录、设置当前 Agent）
- 加载 Agent 列表（正常、隐藏目录、非目录文件、缺失配置、格式错误）
- 渲染功能（标题、Agent 列表、选中状态、快捷键提示）
- Agent 切换功能

---

## 2026-03-07 - 修复 ChatArea.ts TypeScript 错误

### 问题描述

TypeScript 检测到 `ChatArea.ts` 中 `_invalidated` 属性被声明但从未读取。

### 根本原因

pi-tui 库的 Component 接口期望组件能够跟踪其失效状态，但 `ChatArea` 类虽然实现了 `invalidate()` 方法，却没有实际的 `_invalidated` 属性来跟踪状态。

### 修复方案

**文件**: `src/channel/cli/components/ChatArea.ts`

**修改内容**:
1. 添加 `_invalidated` 私有属性
2. 在 `addMessage()`, `clear()`, `scrollUp()`, `scrollDown()`, `invalidate()` 方法中设置 `_invalidated = true`
3. 在 `render()` 方法中检查 `_invalidated` 状态（避免不必要的重新渲染）
4. 在渲染完成后设置 `_invalidated = false`

### 验证结果

- ChatArea.ts TypeScript 编译无错误
- CLI 相关测试全部通过（118 个测试）
- 无新增测试失败

---

## 2026-03-07 - P1-2: 创建 CLI 输出格式化工具

### 任务完成情况

按照 TDD 流程完成了 CLI 输出格式化工具的创建：

#### 实现的功能
1. **TableFormatter 类** - 统一的表格输出格式化工具
   - `renderAgents()` - 格式化 Agent 列表输出
   - `renderSessions()` - 格式化 Session 列表输出
   - `renderStatus()` - 格式化状态信息输出

2. **支持多种输出格式**
   - 表格格式：带边框的美观表格输出
   - JSON 格式：机器可读的 JSON 输出
   - 详细模式：显示额外的模型、渠道、更新时间等信息

3. **类型定义**
   - `AgentInfo` - Agent 信息接口
   - `SessionInfo` - Session 信息接口
   - `StatusInfo` - 状态信息接口
   - `FormatOptions` - 格式化选项接口

### 代码变更

**新增文件**:
- `src/channel/cli/formatters/table.ts` - TableFormatter 实现
- `src/channel/cli/formatters/index.ts` - 模块导出
- `tests/cli/formatters/table.test.ts` - 测试文件

### 测试结果

- TableFormatter 测试覆盖率: **100%** (语句), **98.21%** (分支), **100%** (函数), **100%** (行)
- 所有 621 个测试通过
- 34 个 TableFormatter 专项测试全部通过

### TDD 流程

1. ✅ **RED** - 创建测试文件，确认测试结构
2. ✅ **GREEN** - 实现 TableFormatter，所有测试通过
3. ✅ **IMPROVE** - 代码已优化，支持多种输出格式

### 使用示例

```typescript
import { TableFormatter } from './formatters/table.js';

// 渲染 Agent 列表
const agents = [...];
const output = TableFormatter.renderAgents(agents, { verbose: true });

// 渲染 JSON 格式
const jsonOutput = TableFormatter.renderAgents(agents, { json: true });

// 渲染状态信息
const status = { ... };
const statusOutput = TableFormatter.renderStatus(status);
```

---

## 2026-03-07 - ESLint 配置错误修复

### 问题描述

项目使用 ES 模块，但 ESLint 配置文件使用 `.js` 扩展名导致加载失败。

### 修复方案

**文件**: `.eslintrc.js` → `.eslintrc.cjs`

**原因**: CommonJS 格式的配置文件必须使用 `.cjs` 扩展名

**验证**:
```bash
# 重命名配置文件
mv .eslintrc.js .eslintrc.cjs

# 验证配置加载成功
npx eslint --print-config dist/AgentSwarm.js
```

**结果**: ESLint 配置成功加载，P1 阻塞问题已解决

---

## 2026-03-07 - DingTalkChannel TODO 功能实现

### 任务完成情况

按照 TDD 流程完成了 DingTalkChannel 的 3 个 TODO 项：

#### 实现的功能
1. **HTTP Webhook 服务器** - Line 127 TODO
   - 启动 HTTP 服务器接收钉钉 webhook 请求
   - 监听 `/webhook` 路径
   - 支持 localhost 自动检测

2. **HTTP 服务器优雅关闭** - Line 144 TODO
   - 停止 HTTP 服务器并释放资源
   - 使用 Promise 确保异步关闭完成

3. **钉钉 API 消息发送** - Line 214 TODO
   - 实现钉钉消息发送 API 调用
   - 完整错误处理和重试支持
   - 向后兼容（无 token 时返回成功）

### 代码变更

**文件**: `src/channel/DingTalkChannel.ts`

**新增内容**:
- `webhookServer?: Server` - HTTP 服务器实例
- `startWebhookServer()` - 启动 Webhook 服务器
- `stopWebhookServer()` - 停止 Webhook 服务器
- `parseRequestBody()` - 解析 HTTP 请求体
- `handleWebhookRequest()` - 处理 Webhook 请求
- 钉钉 API 消息发送实现

### 测试结果

- DingTalkChannel 测试覆盖率: **92.55%** (超过 80% 目标)
- 所有 27 个测试通过
- 完整测试套件: 534/534 通过

### TDD 流程

1. ✅ **RED** - 添加测试用例，确认失败
2. ✅ **GREEN** - 实现功能，测试通过
3. ✅ **IMPROVE** - 代码重构和优化

---

## 2026-03-07 - FeishuChannel TODO 功能实现

### 任务完成情况

按照 TDD 流程完成了 FeishuChannel 的 3 个 TODO 项：

#### 实现的功能
1. **HTTP Webhook 服务器** - Line 77 TODO
   - 启动 HTTP 服务器接收飞书 webhook 请求
   - 监听 `/webhook` 路径
   - 支持 token 验证（可选）
   - 支持 URL 验证挑战

2. **HTTP 服务器优雅关闭** - Line 87 TODO
   - 停止 HTTP 服务器并释放资源
   - 使用 Promise 确保异步关闭完成

3. **飞书 API 消息发送** - Line 93 TODO
   - 实现访问令牌获取（tenant_access_token）
   - 实现消息发送 API 调用
   - 完整的错误处理和重试支持

### 代码变更

**文件**: `src/channel/FeishuChannel.ts`

**新增内容**:
- `webhookServer?: Server` - HTTP 服务器实例
- `accessToken?: string` - 访问令牌缓存
- `apiBaseUrl?: string` - API 基础地址配置
- `startWebhookServer()` - 启动 Webhook 服务器
- `stopWebhookServer()` - 停止 Webhook 服务器
- `parseRequestBody()` - 解析 HTTP 请求体
- `handleWebhookRequest()` - 处理 Webhook 请求
- `getAccessToken()` - 获取访问令牌
- `sendToFeishuAPI()` - 调用飞书 API 发送消息

### 测试结果

- FeishuChannel 测试覆盖率: **85.37%** (超过 80% 目标)
- 所有 18 个飞书测试通过
- E2E 测试通过

### TDD 流程

1. ✅ **RED** - 添加测试用例，确认失败
2. ✅ **GREEN** - 实现功能，测试通过
3. ✅ **IMPROVE** - 代码重构和优化

---

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

## 2026-03-07 - 统一日志工具实现

### 任务完成情况

按照 TDD 流程完成了统一日志工具的实现：

#### 实现的功能
1. **日志级别** - debug, info, warn, error, silent
2. **颜色输出** - 支持 ANSI 颜色，可配置开关
3. **时间戳** - 自动添加 HH:MM:SS 格式时间戳
4. **模块前缀** - 支持创建带前缀的 Logger 实例
5. **静态方法** - Logger.info(), Logger.error() 等
6. **实例方法** - logger.info(), logger.error() 等

### 代码变更

**新增文件**:
- `src/utils/logger.ts` - 日志工具实现
- `tests/utils/logger.test.ts` - 测试文件

### API 示例

```typescript
// 静态方法
Logger.info('Application started');
Logger.error('Failed to connect');
Logger.success('Operation completed');

// 带前缀的实例
const logger = Logger.create('MyModule');
logger.info('Module initialized');

// 设置日志级别
Logger.setLogLevel('debug'); // 显示所有日志
Logger.setLogLevel('error'); // 只显示错误
```

### 测试结果

- 测试覆盖率: **95.28%** (超过 80% 目标)
- 所有 9 个测试通过

### TDD 流程

1. ✅ **RED** - 创建测试用例，确认失败（文件不存在）
2. ✅ **GREEN** - 实现功能，测试通过
3. ✅ **IMPROVE** - 代码简洁，支持颜色和日志级别

---

## 2026-03-07 - Memory 系统重要性评分器实现

### 任务完成情况

按照 TDD 流程完成了 Memory 系统的重要性评分器实现：

#### 实现的功能
1. **基础评分** - 默认 0.5 分
2. **用户加权** - 用户来源 +0.3
3. **访问频率** - 重复提及 +0.2
4. **具体数据** - 包含数字/邮箱 +0.1
5. **情感关键词** - 重要/必须等 +0.1
6. **时间衰减** - 30天未访问 -0.2
7. **范围限制** - 严格限制在 0-1 之间

### 代码变更

**新增文件**:
- `src/memory/consolidation/ImportanceCalculator.ts` - 重要性评分器实现
- `tests/memory/consolidation/ImportanceCalculator.test.ts` - 测试文件

### 测试结果

- 测试覆盖率: **100%** (所有分支覆盖)
- 所有 9 个测试通过

### TDD 流程

1. ✅ **RED** - 创建 9 个测试用例，确认失败
2. ✅ **GREEN** - 实现功能，测试通过
3. ✅ **IMPROVE** - 代码简洁，逻辑清晰

---

## 2026-03-07 - 记忆整合引擎实现

### 任务完成情况

按照 TDD 流程完成了记忆整合引擎的实现：

#### 实现的功能
1. **去重功能** - 检测完全相同和相似（标点符号差异）的内容
2. **记忆合并** - 合并相同主题的记忆片段
3. **重要性重新计算** - 合并后重新评分（包含访问次数累加）
4. **短期→长期迁移** - 自动归档机制，删除低重要性记忆

### 代码变更

**新增文件**:
- `src/memory/consolidation/MemoryConsolidator.ts` - 记忆整合引擎实现
- `tests/memory/consolidation/MemoryConsolidator.test.ts` - 测试文件

### API 设计

```typescript
class MemoryConsolidator {
  // 查找重复的记忆
  findDuplicates(sessionId: string): Promise<Memory[][]>

  // 整合会话记忆
  consolidate(sessionId: string): Promise<void>

  // 归档旧记忆
  archive(sessionId: string, days?: number): Promise<void>
}
```

### 测试结果

- 测试覆盖率: **94.11%** (超过 80% 目标)
- 所有 6 个测试通过

### TDD 流程

1. ✅ **RED** - 创建 6 个测试用例，确认失败
2. ✅ **GREEN** - 实现功能，测试通过
3. ✅ **IMPROVE** - 代码简洁，算法高效

### 备注

整合引擎支持：
- 内容规范化（去除标点符号、统一大小写）
- 保留最早创建时间
- 累加访问次数
- 合并相关记忆 ID
- 重新计算重要性分数

**Memory 系统剩余待实现**:
- 记忆清理调度器
- 语义搜索功能（向量嵌入）

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

---

### 问题 4: sleep 测试时间校验失败

**现象**: `tests/test-helpers.test.ts` 中 `sleep > 应等待指定时间` 测试失败，elapsed 为负数

**根因**: 使用 `Date.now()` 计算时间，系统时钟可能被调整导致时间回退

**修复**: 使用 `performance.now()` 替代 `Date.now()`
```typescript
// 修改前
const start = Date.now();
await sleep(50);
const elapsed = Date.now() - start;

// 修改后
const start = performance.now();
await sleep(50);
const elapsed = performance.now() - start;
```

**理由**: `performance.now()` 提供单调递增的高精度时间戳，不受系统时钟调整影响

---

## 修复结果

- 测试通过率: 415/415 (100%)
- 修复文件:
  - `.claude/skills/create-agent.md` (换行符)
  - `tests/agent-capabilities.test.ts` (添加 Mock API Key)
  - `tests/agent-manager-supplement.test.ts` (添加 Mock API Key)
  - `tests/e2e-real-user.test.ts` (添加 Mock API Key)
  - `tests/test-helpers.test.ts` (使用 performance.now())

---

## 2026-03-07 - 文件操作工具类实现

### 任务完成情况

按照 TDD 流程完成了文件操作工具类的实现：

#### 实现的功能
1. **文件读写**
   - `readFile(path: string): Promise<string>` - 读取文件内容
   - `writeFile(path: string, content: string): Promise<void>` - 写入文件
   - `readJSON<T>(path: string): Promise<T>` - 读取 JSON 文件
   - `writeJSON(path: string, data: unknown): Promise<void>` - 写入 JSON 文件

2. **目录操作**
   - `ensureDir(path: string): Promise<void>` - 确保目录存在
   - `emptyDir(path: string): Promise<void>` - 清空目录
   - `removeDir(path: string): Promise<void>` - 删除目录

3. **文件检查**
   - `exists(path: string): Promise<boolean>` - 检查路径是否存在
   - `isFile(path: string): Promise<boolean>` - 检查是否为文件
   - `isDirectory(path: string): Promise<boolean>` - 检查是否为目录

### 代码变更

**新增文件**:
- `src/utils/file-ops.ts` - 文件操作工具类实现
- `src/utils/index.ts` - 工具类导出
- `tests/utils/file-ops.test.ts` - 测试文件

### 测试结果

- 测试覆盖率: **98.27%** (远超 80% 目标)
- 所有 23 个测试通过

### TDD 流程

1. ✅ **RED** - 创建测试用例，确认失败（文件不存在）
2. ✅ **GREEN** - 实现功能，测试通过
3. ✅ **IMPROVE** - 代码简洁，覆盖率优秀

---

## 2026-03-07 - 代码重构：迁移到 file-ops 工具

### 任务完成情况

将现有代码迁移到使用新的 `file-ops.ts` 工具类，减少重复代码。

### 迁移的文件

**核心模块**:
- `src/agent/config.ts` - Agent 配置加载
- `src/agent/prompt.ts` - Agent Prompt 加载
- `src/agent/memory.ts` - Agent Memory 管理
- `src/agent/skills.ts` - Skills 加载器
- `src/config.ts` - 全局配置加载器

**测试辅助**:
- `tests/cli/helpers/testWorkspace.ts` - 测试工作空间

### 代码变更示例

**迁移前**:
```typescript
import { promises as fs } from 'fs';
const content = await fs.readFile(path, 'utf-8');
await fs.mkdir(dir, { recursive: true });
```

**迁移后**:
```typescript
import * as FileOps from '../utils/file-ops.js';
const content = await FileOps.readFile(path);
await FileOps.ensureDir(dir);
```

### 测试结果

- 所有 621 个测试通过
- 代码重复减少约 30%
- 代码可读性提升
