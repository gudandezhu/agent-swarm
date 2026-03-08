#!/bin/bash
# 完整测试套件 - 运行所有测试

set -e  # 遇到错误立即退出

echo "🧪 Agent Swarm 完整测试套件"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 记录测试结果
run_test() {
  local test_name="$1"
  local test_command="$2"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo -e "${YELLOW}运行测试: ${test_name}${NC}"
  echo "命令: ${test_command}"
  echo ""

  if eval "$test_command"; then
    echo -e "${GREEN}✅ ${test_name} 通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ ${test_name} 失败${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
  echo ""
}

# 1. 单元测试
echo "================================"
echo "1. 单元测试"
echo "================================"
echo ""

run_test "基础单元测试" "npm test -- --run"
run_test "覆盖率测试" "npm run test:coverage -- --run"

# 2. 集成测试
echo "================================"
echo "2. 集成测试"
echo "================================"
echo ""

run_test "Agent Swarm 集成测试" "npm test -- tests/agent-swarm.test.ts --run"
run_test "Channel 集成测试" "npm test -- tests/channel-e2e.test.ts --run"
run_test "完整 E2E 测试" "npm test -- tests/e2e-complete.test.ts --run"

# 3. CLI 测试
echo "================================"
echo "3. CLI 测试"
echo "================================"
echo ""

run_test "CLI 框架测试" "npm test -- tests/cli/CLIFramework.test.ts --run"
run_test "Init 命令测试" "npm test -- tests/cli/initCommand.test.ts --run"
run_test "Create Agent 命令测试" "npm test -- tests/cli/createAgentCommand.test.ts --run"
run_test "List 命令测试" "npm test -- tests/cli/listCommand.test.ts --run"

# 4. 用户行为 E2E 测试
echo "================================"
echo "4. 用户行为 E2E 测试"
echo "================================"
echo ""

run_test "用户行为测试" "npm test -- tests/e2e-user-behavior.test.ts --run"

# 5. 构建测试
echo "================================"
echo "5. 构建测试"
echo "================================"
echo ""

run_test "TypeScript 编译" "npm run build"

# 6. 代码质量检查
echo "================================"
echo "6. 代码质量检查"
echo "================================"
echo ""

if command -v eslint &> /dev/null; then
  run_test "ESLint 检查" "npm run lint"
else
  echo -e "${YELLOW}⚠️  ESLint 未安装，跳过${NC}"
fi

# 7. 安全性检查
echo "================================"
echo "7. 安全性检查"
echo "================================"
echo ""

echo "检查敏感信息..."
if grep -r "sk-ant-" dist/ 2>/dev/null; then
  echo -e "${RED}❌ 发现 API key！${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
else
  echo -e "${GREEN}✅ 未发现硬编码的 API key${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 8. 性能测试
echo "================================"
echo "8. 性能测试"
echo "================================"
echo ""

echo "检查包大小..."
BUILD_SIZE=$(du -sh dist/ | cut -f1)
echo "构建大小: ${BUILD_SIZE}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 9. 文档检查
echo "================================"
echo "9. 文档检查"
echo "================================"
echo ""

run_test "README 存在" "test -f README.md"
run_test "CHANGELOG 存在" "test -f CHANGELOG.md"

# 10. 手动测试清单
echo "================================"
echo "10. 手动测试清单"
echo "================================"
echo ""

cat << 'EOF'
请手动完成以下测试：

基础功能：
  [ ] 启动 TUI（./start.sh）
  [ ] 基本输入（输入文字 + Enter）
  [ ] 多行输入（\ + Enter）
  [ ] 自动补全（/he + Tab）
  [ ] 历史记录（↑↓ 箭头）
  [ ] 命令执行（/help, /reset, /exit）

高级功能：
  [ ] Agent 切换（/agent <name>）
  [ ] Session 持久化
  [ ] 错误处理（无效命令、网络错误）
  [ ] 长消息处理
  [ ] 快速连续输入

详细清单见：tests/COMPLETE_TEST_CHECKLIST.md

按任意键继续...
EOF
read -n 1

# 打印测试结果摘要
echo ""
echo "================================"
echo "测试结果摘要"
echo "================================"
echo ""
echo "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"
echo ""

if [ ${FAILED_TESTS} -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}⚠️  有 ${FAILED_TESTS} 个测试失败${NC}"
  exit 1
fi
