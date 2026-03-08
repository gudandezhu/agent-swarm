# TUI 粘贴问题修复

## 问题描述

在 TUI 中粘贴内容时，部分内容会消失或截断。

## 原因

1. **终端输入缓冲限制** - 某些终端在快速连续输入时会丢失字符
2. **换行符触发提交** - 粘贴的内容包含换行符时，可能提前触发消息提交
3. **特殊字符处理** - 某些特殊字符可能导致输入异常

## 已实施的修复

### 1. 改进输入框处理 (`src/tui/components/InputBox.tsx`)

- ✅ 添加 `useStdin` 确保终端处于正确模式
- ✅ 过滤空白字符，避免空提交
- ✅ 添加粘贴提示说明（Shift+Enter for newline）
- ✅ 优化焦点控制

### 2. 用户提示

帮助文本现在显示：
```
Press Ctrl+C twice to exit • Tab to autocomplete • Shift+Enter for newline
```

处理中显示：
```
Processing... Press Ctrl+C twice to exit
```

## 使用建议

### 粘贴大量文本

1. **避免直接粘贴多行文本** - 如果内容包含换行符，建议：
   - 先粘贴到文本编辑器
   - 移除换行符或替换为空格
   - 再粘贴到 TUI

2. **使用文件输入**（未来功能）：
   ```
   /load-file path/to/file.txt
   ```

3. **分批粘贴** - 将长文本分成较小的部分粘贴

### 替代方案

如果粘贴问题依然存在：

1. **使用文件** - 将内容保存到文件，通过命令加载
2. **使用 API** - 直接通过 API 调用而非 TUI
3. **使用其他 Channel** - 如 Web UI（未来功能）

## 已知限制

- 某些终端模拟器可能有自己的粘贴限制
- WSL 环境下可能需要额外配置
- 远程 SSH 连接时可能有网络延迟影响输入

## 测试

运行测试脚本：
```bash
chmod +x test-paste.sh
./test-paste.sh
```

## 相关文件

- `src/tui/components/InputBox.tsx` - 输入框组件
- `src/channel/InkChannel.ts` - TUI 渠道
- `src/tui/MessageBridge.ts` - 消息桥接
