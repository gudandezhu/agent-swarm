# 输入框使用指南

## 快捷键

| 按键 | 功能 |
|------|------|
| `Enter` | 提交消息 |
| `Shift+Enter` | 换行（推荐） |
| `\` + `Enter` | 换行（通用，所有终端支持） |
| `Tab` | 自动补全 |
| `↑↓` | 浏览历史 |
| `Ctrl+C` | 退出 |

## 命令

| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助 |
| `/reset` | 清空历史 |
| `/exit` | 退出 |
| `/agent <name>` | 切换 Agent |

## Agent 列表

- `assistant` - 通用助手
- `coder` - 代码助手
- `reviewer` - 代码审查
- `planner` - 规划专家
- `tester` - 测试专家

## 多行输入

**方式1：Shift+Enter**
```
› 第一行[Shift+Enter]
│ 第二行[Shift+Enter]
│ 第三行[Enter 提交]
```

**方式2：反斜杠续行**
```
› 第一行\[Enter]
│ 第二行\[Enter]
│ 第三行[Enter 提交]
```

## 自动补全

```bash
/he<Tab>      → /help
/agent c<Tab> → /agent coder
```

## 常见问题

**Q: Shift+Enter 不工作？**
A: 使用反斜杠续行（行末输入 `\` 然后 Enter），所有终端都支持。

**Q: 历史记录？**
A: 保存在内存中，退出后丢失。
