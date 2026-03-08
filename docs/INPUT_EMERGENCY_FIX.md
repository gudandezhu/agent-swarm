# 输入框紧急修复

## 问题

输入文字后立即报错：
```
Error in handleData: TypeError: The "list[1]" argument must be of type Buffer or Uint8Array. Received type string ('h')
```

## 根本原因

在 `MultiLineInput.tsx` 的 `handleData` 函数中，stdin 的 'data' 事件可能发送两种类型：
- `Buffer`（在 raw 模式下）
- `string`（在某些情况下）

原代码假设总是收到 `Buffer`，导致类型错误。

## 修复

### 修改前
```typescript
const handleData = (data: Buffer) => {
  buffer = Buffer.concat([buffer, data]);
  // ...
}
```

### 修改后
```typescript
const handleData = (data: Buffer | string) => {
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  buffer = Buffer.concat([buffer, dataBuffer]);
  // ...
}
```

## 测试

```bash
# 1. 重新构建
npm run build

# 2. 启动测试
./test-fix.sh

# 或直接运行
npm run start:tui
```

### 测试步骤
1. 输入一些文字（如：hello）
2. 观察：**不应该报错**
3. 按 Enter 提交
4. 继续输入更多文字
5. 按 Ctrl+C 退出

## 验证

- ✅ 构建成功
- ✅ 类型检查通过
- ✅ 兼容 Buffer 和 string 输入

## 相关文件

- `src/tui/components/MultiLineInput.tsx` - 修复 handleData 函数
- `test-fix.sh` - 测试脚本

## 道歉

抱歉之前没有充分测试就发布。现在已经修复并通过编译验证。
