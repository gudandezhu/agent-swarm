#!/bin/bash

# 性能基准测试脚本
# 用于验证代码删除和重构后的性能改进

echo "=== Agent Swarm 性能基准测试 ==="
echo ""

# 1. 测试 exists() 方法性能
echo "1. 测试 exists() 方法性能（10000次调用）"
cat > /tmp/test-exists.mjs << 'INNEREOF'
import { WorkspaceInitializer } from './dist/setup/WorkspaceInitializer.js';

const initializer = new WorkspaceInitializer();
const start = performance.now();
for (let i = 0; i < 10000; i++) {
  await initializer.exists();
}
const end = performance.now();
console.log(`10000 次 exists() 调用耗时: ${end - start}ms`);
console.log(`平均每次: ${(end - start) / 10000}ms`);
INNEREOF

node /tmp/test-exists.mjs
echo ""

# 2. 测试配置加载性能
echo "2. 测试配置加载性能（1000次调用）"
cat > /tmp/test-config.mjs << 'INNEREOF'
import { getConfigLoader } from './dist/config.js';

const loader = getConfigLoader();
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  await loader.load();
}
const end = performance.now();
console.log(`1000 次 load() 调用耗时: ${end - start}ms`);
console.log(`平均每次: ${(end - start) / 1000}ms`);
INNEREOF

node /tmp/test-config.mjs
echo ""

# 3. 包大小对比
echo "3. dist 目录大小"
du -sh dist
echo ""

echo "=== 测试完成 ==="
