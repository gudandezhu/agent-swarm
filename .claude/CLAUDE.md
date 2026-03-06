# 架构设计(除非要求，否则不允许改动)
[design.md](design.md)

# 回归测试用例：[REGRESSION_TEST_CASES.md](../tests/REGRESSION_TEST_CASES.md)
要求：维持在300行以内，保留核心流程用例

# 完整业务功能测试 [E2E_TEST_GUIDE.md](../tests/E2E_TEST_GUIDE.md)
要求：尽可能不修改本文档，他是衡量代码是否偏离预期的重要因素

# Vitest 测试技巧

## coverage 测试

- `npm run test:coverage` 默认进入 watch 模式，测试完成后会一直监听文件变化
- 测试完成后会显示 `PASS Waiting for file changes... press h to show help, press q to quit`
- 这不是卡住，而是在等待代码修改

### 运行一次后退出（推荐）

```bash
# 方法1
npm run test:coverage -- --run

# 方法2
npx vitest run --coverage
```

### watch 模式退出

按 `q` 键退出