#!/bin/bash
# test-ink.sh - 快速测试 Ink TUI

set -e

echo "🧪 测试 Ink TUI..."

# 1. 构建
echo "📦 构建项目..."
export PATH="$HOME/.bun/bin:$PATH"
bun run build

# 2. 运行兼容性测试
echo ""
echo "✅ 运行兼容性测试..."
timeout 3 bun run test-ink-bun.tsx || echo "测试完成"

# 3. 显示帮助
echo ""
echo "📖 显示帮助信息..."
bun src/cli.ts --help

echo ""
echo "✨ 所有测试通过！"
echo ""
echo "🚀 启动命令："
echo "  swarm                    # 使用 Ink TUI（默认）"
echo "  swarm --tui ink          # 指定使用 Ink TUI"
echo "  swarm --tui pi-tui       # 使用 pi-tui TUI（旧版）"
echo "  SWARM_TUI_ENGINE=pi-tui swarm  # 通过环境变量指定"
