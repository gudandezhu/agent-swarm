# Agent Swarm E2E 测试指南

**目的**: 验证完整用户流程从安装到 Agent 协作
**频率**: 不定期（代码重大变更后、发布前）
**执行者**: E2E测试工程师

---

## 测试环境要求

| 环境 | 要求 |
|------|------|
| Node.js | >= 18.0.0 |
| npm | 最新版本 |
| 系统 | macOS/Linux/Windows |

---

## 完整测试流程

### 阶段1: 安装与编译

**目标**: 验证项目可以正常安装和编译

```bash
# 1. 清理环境（可选）
rm -rf node_modules package-lock.json dist

# 2. 安装依赖
npm install

# 预期: 成功安装，无报错

# 3. 编译项目
npm run build

# 预期: 编译成功，生成 dist/ 目录
```

**验证点**:
- [ ] npm install 成功完成
- [ ] npm run build 无错误
- [ ] dist/ 目录存在且包含编译后的文件

**失败标准**: 编译报错 → 阻塞，必须修复

---

### 阶段2: 创建 Agent

**目标**: 验证用户可以创建新 Agent

```bash
# 1. 创建 Agent 目录
mkdir -p agents/e2e-test-agent/skills

# 2. 创建 config.json
cat > agents/e2e-test-agent/config.json << 'EOF'
{
  "id": "e2e-test-agent",
  "name": "E2E测试Agent",
  "description": "用于E2E测试的Agent",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"],
  "maxTokens": 4000,
  "temperature": 0.7
}
EOF

# 3. 创建 prompt.md
cat > agents/e2e-test-agent/prompt.md << 'EOF'
# E2E测试Agent

你是E2E测试用的助手，用于验证系统功能。

## 能力
- 确认收到消息
- 返回测试响应

## 规则
1. 收到消息时回复"E2E Agent已收到"
2. 保持简洁
EOF
```

**验证点**:
- [ ] 目录创建成功
- [ ] config.json 格式正确
- [ ] prompt.md 存在

---

### 阶段3: 创建多个 Agent

**目标**: 验证多 Agent 协作能力

```bash
# 创建第二个 Agent
mkdir -p agents/e2e-test-agent-2/skills

cat > agents/e2e-test-agent-2/config.json << 'EOF'
{
  "id": "e2e-test-agent-2",
  "name": "E2E测试Agent 2",
  "description": "用于协作测试",
  "model": {
    "provider": "anthropic",
    "id": "claude-sonnet-4-6"
  },
  "channels": ["cli"],
  "maxTokens": 4000,
  "temperature": 0.7
}
EOF

cat > agents/e2e-test-agent-2/prompt.md << 'EOF'
# E2E测试Agent 2

你是第二个测试Agent，用于验证多Agent协作。

## 规则
1. 收到消息时回复"Agent2已收到"
2. 保持简洁
EOF
```

**验证点**:
- [ ] e2e-test-agent-2 创建成功
- [ ] 两个 Agent 配置都正确

---

### 阶段4: 运行测试验证

**目标**: 验证核心功能正常工作

```bash
# 1. Agent 配置加载测试
npm test -- tests/agent-manager.test.ts --run

# 预期: 17/17 测试通过

# 2. 消息总线测试
npm test -- tests/message-bus.test.ts --run

# 预期: 32/32 测试通过

# 3. 集成测试
npm test -- tests/integration.test.ts --run

# 预期: 6/6 测试通过

# 4. 完整测试套件
npm test -- --run
```

**验证点**:
- [ ] AgentManager 测试通过
- [ ] MessageBus 测试通过
- [ ] 集成测试通过
- [ ] 核心功能测试无失败

---

### 阶段5: 覆盖率检查

**目标**: 验证测试覆盖率

```bash
npm run test:coverage -- --run
```

**验证点**:
- [ ] 整体覆盖率 >= 60% (当前基准)
- [ ] 核心模块覆盖率 >= 80%

---

## 测试结果记录模板

| 日期 | 执行人 | 阶段1 | 阶段2 | 阶段3 | 阶段4 | 覆盖率 | 问题 |
|------|--------|-------|-------|-------|-------|--------|------|
| YYYY-MM-DD | name | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | xx% | 描述 |

---

## 常见问题排查

### 编译失败
- 检查 TypeScript 版本
- 检查是否有语法错误
- 查看具体报错信息

### Agent 加载失败
- 检查 config.json 格式
- 检查 agents/ 目录结构
- 查看日志输出

### 测试失败
- 运行单个测试文件定位问题
- 检查是否有 API Key 配置问题
- 查看详细错误信息

---

## 阻塞标准

| 级别 | 条件 | 操作 |
|------|------|------|
| P0 | 编译失败 | 阻止发布，必须修复 |
| P0 | 核心功能测试失败 | 阻止发布，必须修复 |
| P1 | 覆盖率下降 > 5% | 警告，建议修复 |
| P2 | 非核心功能失败 | 记录问题，可发布 |

---

## 清理测试数据

测试完成后清理：

```bash
# 删除测试 Agent
rm -rf agents/e2e-test-agent
rm -rf agents/e2e-test-agent-2

# 删除测试会话
rm -rf sessions/*.jsonl
```
