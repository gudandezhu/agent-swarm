# TUI 输入框快捷键

## 快捷键列表

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Enter` | 提交 | 提交当前输入 |
| `Alt+Enter` | 换行 | **最可靠**的换行方案，所有终端都支持 |
| `Shift+Enter` | 换行 | 部分终端支持，可能不工作 |
| `Tab` | 补全 | 命令和 Agent 名称补全 |
| `Backspace` | 删除 | 删除字符 |
| `↑↓` | 历史 | 浏览输入历史 |
| `ESC` | 取消 | 关闭补全菜单 |
| `Ctrl+C` | 退出 | 退出程序 |

## 多行输入方式

### 方式 1: Alt+Enter（推荐）
```
第一行 [Alt+Enter]
第二行 [Alt+Enter]
第三行 [Enter 提交]
```

### 方式 2: 反斜杠续行
```
第一行\ [Enter]
第二行\ [Enter]
第三行 [Enter 提交]
```

### 方式 3: Shift+Enter（依赖终端）
```
第一行 [Shift+Enter]
第二行 [Shift+Enter]
第三行 [Enter 提交]
```

## 测试快捷键

### 自动化测试
```bash
npm test -- tests/shortcut-keys.test.ts
```

### 手动测试
```bash
./test-shortcuts.sh
```

### 调试按键序列
如果快捷键不工作，运行调试工具：
```bash
node test-key-sequences.js
```

然后按你想测试的键（如 Shift+Enter），查看终端实际发送的序列。

## 支持的 Shift+Enter 格式

代码已支持以下终端的 Shift+Enter 序列：

| 格式 | 终端 | 序列 |
|------|------|------|
| CSI `1;2R` | xterm | ESC [ 1 ; 2 R |
| CSI `1;2~` | 许多终端 | ESC [ 1 ; 2 ~ |
| CSI `13;2~` | 某些终端 | ESC [ 1 3 ; 2 ~ |

如果你的终端发送其他格式的序列，请运行 `test-key-sequences.js` 并报告。

## 已知问题

### Shift+Enter 不工作
**原因**：不同终端发送不同的按键序列，某些终端可能不支持 Shift+Enter。

**解决方案**：
1. 使用 `Alt+Enter`（最可靠）
2. 使用反斜杠续行：`\` + Enter
3. 运行调试工具检查你的终端序列

### Alt+Enter 不工作
**原因**：WSL 或某些终端配置可能拦截 Alt+Enter。

**解决方案**：
1. 检查终端设置
2. 使用反斜杠续行
3. 尝试 Shift+Enter

## 技术细节

### 按键序列检测顺序
```
1. Ctrl+C (0x03)
2. Alt+Enter (ESC + CR)
3. Shift+Enter (各种 CSI 序列)
4. Enter (CR)
5. Tab, 方向键, 等等
```

### 终端兼容性
- ✅ **Windows Terminal**: Alt+Enter 可用
- ✅ **VS Code 集成终端**: Alt+Enter 可用
- ✅ **iTerm2**: Shift+Enter 和 Alt+Enter 都可用
- ⚠️ **WSL 默认终端**: 可能需要配置
- ✅ **GNOME Terminal**: Alt+Enter 可用

## 反馈

如果快捷键在你的终端不工作：
1. 运行 `node test-key-sequences.js`
2. 按不工作的快捷键
3. 将输出反馈给我们
