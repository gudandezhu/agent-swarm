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

---

# Docker E2E 测试

## 目的
在隔离的 Docker 环境中验证完整用户流程，模拟全新环境下的项目使用。

## 文件
- `Dockerfile.e2e` - E2E 测试镜像定义
- `docker-compose.e2e.yml` - Docker Compose 配置
- `tests/e2e-real-user.test.ts` - 真实用户场景测试

## 运行命令

```bash
# 构建镜像
docker build -f Dockerfile.e2e -t agent-swarm:e2e .

# 运行 E2E 测试
docker run --rm agent-swarm:e2e

# 或运行特定测试
docker run --rm agent-swarm:e2e npm test -- tests/e2e-real-user.test.ts --run

# 使用 docker-compose
docker-compose -f docker-compose.e2e.yml up
```
