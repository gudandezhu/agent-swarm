# 输入框修复说明

## 已修复的问题

### 1. useEffect 依赖项导致的频繁重新注册
**问题**：`useEffect` 的依赖项包含了 `input`, `showCompletions`, `completions` 等频繁变化的值，导致每次输入都重新注册监听器。

**修复**：
- 使用 `useRef` 存储这些值
- 在 `handleData` 中通过 ref 访问最新值
- 只保留必要的依赖项

### 2. 错误的状态访问
**问题**：在 `handleData` 中直接使用 `input.endsWith('\\')` 等状态值。

**修复**：改用 `inputRef.current`。

### 3. 未处理的异常
**问题**：没有 try-catch 包裹，错误会导致崩溃。

**修复**：添加 try-catch 块捕获并记录错误。

### 4. 缓冲区访问越界
**问题**：在检查 `buffer[0]` 之前没有检查 `buffer.length === 0`。

**修复**：添加空缓冲区检查。

## 测试步骤

```bash
swarm

# 测试1：基本输入
1. 启动后直接输入文字（应该正常显示，不报错）
2. 按 Enter 提交

# 测试2：自动补全
1. 输入 /he
2. 按 Tab（应该显示补全）
3. 按 Enter 应用

# 测试3：多行输入
1. 输入文字
2. 按 \ 然后 Enter（换行）
3. 继续输入
4. 按 Enter 提交

# 测试4：历史记录
1. 输入几条消息并提交
2. 按 ↑ 查看历史
3. 按 ↓ 浏览

# 按 Ctrl+C 退出
```

## 技术细节

### 关键修改

```typescript
// 使用 ref 存储频繁变化的值
const inputRef = useRef(input);
const completionsRef = useRef(completions);
const showCompletionsRef = useRef(showCompletions);

// 同步 ref
useEffect(() => {
  inputRef.current = input;
}, [input]);

// 在 handleData 中使用 ref
const currentInput = inputRef.current;

// 添加错误处理
try {
  // 处理输入
} catch (error) {
  console.error('Error in handleData:', error);
}
```

### 函数式更新

```typescript
// 使用函数式更新避免闭包陷阱
setHistoryIndex((currentIndex) => {
  // 基于 currentIndex 计算新值
  return newIndex;
});
```

## 如果还有问题

如果仍然遇到错误，请：
1. 记录完整的错误信息
2. 检查终端类型和版本
3. 尝试在不同终端中测试
