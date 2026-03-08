#!/bin/bash
# 启动脚本 - 用于测试

echo "🚀 启动 Agent Swarm..."
echo ""
echo "测试清单："
echo "✅ 1. 输入文字（不应该报错）"
echo "✅ 2. 按 Enter 提交"
echo "✅ 3. 输入 /he 按 Tab（自动补全）"
echo "✅ 4. 按 \\ Enter 换行"
echo "✅ 5. Ctrl+C 退出"
echo ""
echo "按任意键开始..."
read -n 1

npm run start:tui
