#!/bin/bash
# npm 全局目录配置脚本
# 避免使用 sudo npm install -g

set -e

echo "📦 配置 npm 全局目录..."
echo ""

# 检测 shell 类型
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    echo "⚠️  无法检测 shell 类型，请手动配置"
    exit 1
fi

# 创建 npm 全局目录
echo "📁 创建 npm 全局目录: ~/.npm-global"
mkdir -p ~/.npm-global

# 配置 npm prefix
echo "⚙️  配置 npm prefix"
npm config set prefix '~/.npm-global'

# 检查是否已经配置过 PATH
if grep -q "~/.npm-global/bin" "$SHELL_CONFIG" 2>/dev/null; then
    echo "✅ PATH 已经配置过"
else
    echo "📝 添加 PATH 到 $SHELL_CONFIG"
    echo '' >> "$SHELL_CONFIG"
    echo '# npm global packages (without sudo)' >> "$SHELL_CONFIG"
    echo 'export PATH=~/.npm-global/bin:$PATH' >> "$SHELL_CONFIG"
    echo "✅ 已添加到 $SHELL_CONFIG"
fi

echo ""
echo "✅ npm 全局目录配置完成！"
echo ""
echo "📌 下一步："
echo "   1. 重新加载配置: source $SHELL_CONFIG"
echo "   2. 或者重启终端"
echo "   3. 然后可以运行: npm install -g ."
echo ""
