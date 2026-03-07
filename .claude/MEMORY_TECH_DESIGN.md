# 长期记忆系统技术选型文档

## 1. Embedding 技术选型

### 选型：OpenAI text-embedding-3-small

| 参数 | 值 |
|------|-----|
| 维度 | 768 |
| 定价 | $0.02 per 1M tokens |
| 性能 | 比 ada-002 提升 13% |
| 多语言性能 | MIRACL 31.4% → 54.9% |

### 选择理由

1. **成本效益**：比上一代便宜 5 倍
2. **性能优秀**：在多语言任务上表现显著提升
3. **维度适中**：768 维度平衡了精度和存储成本
4. **生态成熟**：OpenAI API 稳定可靠

### 集成方案

```typescript
// src/memory/embedding/EmbeddingService.ts
interface EmbeddingService {
  embed(text: string): Promise<number[]>;  // 返回 768 维向量
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

### API 配置

- 使用现有的 `~/.agent-swarm/config.json` 中的 `openai` API 密钥
- 支持批量请求优化成本
- 本地向量缓存减少重复调用

---

## 2. 向量检索技术选型

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **hnswlib-node** | 性能最优，C++ 原生 | Node 原生依赖，编译复杂 | ⭐⭐⭐ |
| **hnsw-wasm** | 跨平台，无编译 | 性能略低于原生 | ⭐⭐⭐⭐ |
| **hnsw_lite** | 纯 JS，轻量 | 功能有限，性能较差 | ⭐⭐ |
| **自实现 HNSW** | 完全控制 | 开发成本高 | ⭐ |
| **Vectra** | 开箱即用 | 依赖本地文件 | ⭐⭐⭐ |

### 最终选型：自实现轻量级 HNSW

#### 选择理由

1. **项目规模**：Agent Swarm 是轻量级框架，不需要生产级向量库
2. **依赖控制**：避免引入复杂的原生模块编译
3. **学习价值**：深入理解 HNSW 算法
4. **渐进增强**：先实现基础版本，后续可替换为成熟方案

#### 实现策略

```typescript
// src/memory/vector/HNSWIndex.ts
interface HNSWIndex {
  // 构建索引
  addPoint(id: string, vector: number[]): void;

  // 搜索最近邻
  search(query: number[], k: number): string[];

  // 持久化
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}
```

#### HNSW 参数配置

| 参数 | 值 | 说明 |
|------|-----|------|
| M | 16 | 每层最大连接数 |
| efConstruction | 200 | 构建时的搜索宽度 |
| ef | 50 | 查询时的搜索宽度 |
| maxLayers | 16 | 最大层数 |

---

## 3. 定时调度技术选型

### 选型：node-cron

```bash
npm install node-cron
npm install @types/node-cron --save-dev
```

### 使用方式

```typescript
// src/memory/scheduler/CleanupScheduler.ts
import cron from 'node-cron';

// 每日凌晨 2 点执行整合
cron.schedule('0 2 * * *', async () => {
  await consolidator.consolidateAll();
});

// 每小时执行一次清理
cron.schedule('0 * * * *', async () => {
  await store.cleanup();
});
```

---

## 4. 三层存储架构设计

### L1: InMemoryMapStore（内存缓存）

**职责**：当前会话热数据，快速访问

```typescript
class InMemoryMapStore implements IMemoryStore {
  private cache = new Map<string, Memory>();
  private index = new Map<string, Set<string>>();  // sessionId -> memoryIds

  // TTL: 1 小时
  private ttl = 3600000;
}
```

### L2: JSONLMemoryStore（持久化）

**职责**：所有记忆的持久化存储

```typescript
class JSONLMemoryStore implements IMemoryStore {
  // 目录结构
  // memory/
  // ├── index.jsonl              # 全局索引
  // ├── sessions/                # 按会话分组
  // │   └── <sessionId>.jsonl
  // └── embeddings/              # 向量缓存
  //     └── <id>.bin
}
```

### L3: VectorDBStore（可选，大规模语义搜索）

**职责**：语义检索，支持跨会话搜索

```typescript
class VectorDBStore implements IMemoryStore {
  private hnsw: HNSWIndex;
  private embeddingService: EmbeddingService;

  async semanticSearch(query: string, topK: number): Promise<Memory[]>;
}
```

---

## 5. 重要性评分策略

### 评分因子

| 因子 | 权重 | 说明 |
|------|------|------|
| 基础分 | 0.5 | 所有记忆的起始分数 |
| 用户来源 | +0.3 | source === 'user' |
| 重复提及 | +0.2 | accessCount > 1 |
| 包含具体数据 | +0.1 | 包含数字或邮箱 |
| 情感关键词 | +0.1 | 包含"喜欢""重要"等 |
| 时间衰减 | -0.2 | 30 天未访问 |

### 实现示例

```typescript
function calculateImportance(memory: Partial<Memory>): number {
  let score = 0.5;

  if (memory.source === 'user') score += 0.3;
  if (memory.accessCount && memory.accessCount > 1) score += 0.2;
  if (/[0-9]+|[a-z0-9._%+-]+@[a-z0-9.-]+/i.test(memory.content || '')) score += 0.1;
  if (/\b(喜欢|讨厌|重要|必须|务必)\b/.test(memory.content || '')) score += 0.1;

  const daysSinceAccess = (Date.now() - (memory.lastAccessedAt || 0)) / 86400000;
  if (daysSinceAccess > 30) score -= 0.2;

  return Math.max(0, Math.min(1, score));
}
```

---

## 6. 技术风险和依赖项

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| OpenAI API 限流 | 嵌入生成失败 | 本地缓存 + 重试机制 |
| 向量索引性能 | 语义搜索慢 | 渐进式加载，限制搜索范围 |
| 存储空间 | 向量占用大量空间 | 定期清理低价值记忆 |
| 数据一致性 | 多层存储同步 | 写入顺序：L1 → L2 → L3 |

### 依赖项

| 依赖 | 版本 | 用途 |
|------|------|------|
| openai | ^4.0.0 | Embedding API |
| node-cron | ^3.0.0 | 定时任务 |

---

## 7. 实施计划

### Phase 1: 基础设施（P0）
- 类型定义
- 接口定义
- InMemoryMapStore

### Phase 2: 持久化（P0）
- JSONLMemoryStore
- EmbeddingService

### Phase 3: 语义检索（P1）
- HNSWIndex
- VectorDBStore

### Phase 4: 整合引擎（P1）
- MemoryConsolidator
- CleanupScheduler

### Phase 5: 集成（P0）
- Session 集成
- AgentSwarm 集成
- 测试

---

## 参考资料

- [OpenAI Vector embeddings guide](https://developers.openai.com/api/docs/guides/embeddings/)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [New embedding models announcement](https://openai.com/index/new-embedding-models-and-api-updates/)
- [HNSW Lite GitHub](https://github.com/darshandesai1095/hnsw_lite)
- [hnswlib-wasm npm](https://www.npmjs.com/package/hnswlib-wasm)
- [deepfates/hnsw GitHub](https://github.com/deepfates/hnsw)
