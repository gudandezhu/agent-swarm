# 长期记忆系统架构设计

## 1. 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         AgentSwarm                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MemoryManager                          │   │
│  │         (统一入口，协调三层存储)                           │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│         ┌─────────────┼─────────────┐                           │
│         ▼             ▼             ▼                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ L1: InMemory │ │ L2: JSONL    │ │ L3: VectorDB │            │
│  │   MapStore   │ │  MemoryStore │ │   Store      │            │
│  │  (热数据缓存) │ │ (持久化存储)  │ │ (语义检索)   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│         │             │             │                           │
│         └─────────────┼─────────────┘                           │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Consolidation Engine                         │   │
│  │   - ImportanceCalculator (重要性评分)                      │   │
│  │   - MemoryConsolidator (记忆整合)                         │   │
│  │   - CleanupScheduler (清理调度)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心接口设计

### 2.1 Memory 类型定义

```typescript
// src/memory/types.ts

export type MemoryType = 'fact' | 'preference' | 'event' | 'skill';
export type MemorySource = 'user' | 'agent' | 'system';

export interface Memory {
  // 标识
  id: string;
  sessionId: string;
  agentId?: string;

  // 内容
  content: string;
  embedding?: number[];  // 768 维向量

  // 元数据
  type: MemoryType;
  importance: number;  // 0-1
  confidence: number;  // 0-1

  // 时间
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;

  // 关联
  relatedIds: string[];
  source: MemorySource;
}

export interface MemoryQuery {
  sessionId?: string;
  agentId?: string;
  type?: MemoryType;
  minImportance?: number;
  limit?: number;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;  // 相似度分数
}
```

### 2.2 IMemoryStore 接口

```typescript
// src/memory/core/IMemoryStore.ts

export interface IMemoryStore {
  // 核心 CRUD
  add(memory: Memory): Promise<string>;
  get(id: string): Promise<Memory | null>;
  update(id: string, updates: Partial<Memory>): Promise<void>;
  delete(id: string): Promise<void>;

  // 检索
  search(query: MemoryQuery): Promise<Memory[]>;
  getBySession(sessionId: string): Promise<Memory[]>;
  getByAgent(agentId: string): Promise<Memory[]>;

  // 统计
  stats(): Promise<MemoryStoreStats>;
}

export interface IMemoryVectorStore extends IMemoryStore {
  // 语义检索
  semanticSearch(query: string, topK?: number): Promise<MemorySearchResult[]>;

  // 向量操作
  addEmbedding(id: string, embedding: number[]): Promise<void>;
  getEmbedding(id: string): Promise<number[] | null>;
}
```

### 2.3 IEmbeddingService 接口

```typescript
// src/memory/embedding/IEmbeddingService.ts

export interface IEmbeddingService {
  // 单文本嵌入
  embed(text: string): Promise<number[]>;

  // 批量嵌入（优化成本）
  embedBatch(texts: string[]): Promise<number[][]>;

  // 带缓存的嵌入
  embedWithCache(text: string): Promise<number[]>;
}

export interface EmbeddingCache {
  get(text: string): number[] | null;
  set(text: string, embedding: number[]): void;
  clear(): void;
}
```

### 2.4 IMemoryConsolidator 接口

```typescript
// src/memory/consolidation/IMemoryConsolidator.ts

export interface IMemoryConsolidator {
  // 整合单个会话
  consolidate(sessionId: string): Promise<void>;

  // 整合所有会话
  consolidateAll(): Promise<void>;

  // 去重
  deduplicate(sessionId: string): Promise<number>;

  // 合并相似记忆
  merge(sessionId: string): Promise<number>;
}

export interface IMemoryCleanupScheduler {
  // 清理低价值记忆
  cleanup(): Promise<number>;

  // 启动定时任务
  start(): void;

  // 停止定时任务
  stop(): void;
}
```

---

## 3. 三层存储实现

### 3.1 L1: InMemoryMapStore

```typescript
// src/memory/store/InMemoryMapStore.ts

export class InMemoryMapStore implements IMemoryStore {
  private cache = new Map<string, Memory>();
  private sessionIndex = new Map<string, Set<string>>();
  private agentIndex = new Map<string, Set<string>>();

  // TTL 配置
  private readonly ttl = 3600000;  // 1 小时
  private lastCleanup = Date.now();

  async add(memory: Memory): Promise<string> {
    this.cache.set(memory.id, memory);
    this.updateIndexes(memory);
    return memory.id;
  }

  async get(id: string): Promise<Memory | null> {
    const memory = this.cache.get(id);
    if (memory) {
      // 更新访问时间
      memory.lastAccessedAt = Date.now();
      memory.accessCount++;
    }
    return memory || null;
  }

  // ... 其他方法
}
```

### 3.2 L2: JSONLMemoryStore

```typescript
// src/memory/store/JSONLMemoryStore.ts

export class JSONLMemoryStore implements IMemoryStore {
  private indexPath: string;
  private sessionsPath: string;

  constructor(private memoryPath: string) {
    this.indexPath = join(memoryPath, 'index.jsonl');
    this.sessionsPath = join(memoryPath, 'sessions');
  }

  async add(memory: Memory): Promise<string> {
    await this.ensureDirectories();

    // 追加到会话文件
    const sessionPath = join(this.sessionsPath, `${memory.sessionId}.jsonl`);
    const line = JSON.stringify(memory) + '\n';
    await appendFile(sessionPath, line);

    // 更新索引
    await this.updateIndex(memory);

    return memory.id;
  }

  async get(id: string): Promise<Memory | null> {
    // 从索引查找 sessionId
    const sessionId = await this.findSessionById(id);
    if (!sessionId) return null;

    // 从会话文件读取
    const memories = await this.loadSessionFile(sessionId);
    return memories.find(m => m.id === id) || null;
  }

  // ... 其他方法
}
```

### 3.3 L3: VectorDBStore

```typescript
// src/memory/store/VectorDBStore.ts

export class VectorDBStore implements IMemoryVectorStore {
  private hnsw: HNSWIndex;
  private embeddingCache = new Map<string, number[]>();

  constructor(
    private baseStore: IMemoryStore,
    private embeddingService: IEmbeddingService,
    private vectorPath: string
  ) {
    this.hnsw = new HNSWIndex({
      dimensions: 768,
      m: 16,
      efConstruction: 200,
    });
  }

  async add(memory: Memory): Promise<string> {
    // 先添加到基础存储
    const id = await this.baseStore.add(memory);

    // 生成并存储向量
    const embedding = await this.embeddingService.embed(memory.content);
    await this.addEmbedding(id, embedding);

    return id;
  }

  async semanticSearch(query: string, topK = 10): Promise<MemorySearchResult[]> {
    // 生成查询向量
    const queryEmbedding = await this.embeddingService.embed(query);

    // HNSW 搜索
    const results = this.hnsw.search(queryEmbedding, topK);

    // 获取完整记忆
    const memories = await Promise.all(
      results.map(async ([id, score]) => ({
        memory: await this.baseStore.get(id),
        score,
      }))
    );

    return memories.filter(m => m.memory !== null);
  }

  // ... 其他方法
}
```

---

## 4. 整合引擎设计

### 4.1 ImportanceCalculator

```typescript
// src/memory/consolidation/ImportanceCalculator.ts

export class ImportanceCalculator {
  calculate(memory: Partial<Memory>): number {
    let score = 0.5;

    // 用户明确陈述
    if (memory.source === 'user') score += 0.3;

    // 重复提及
    if (memory.accessCount && memory.accessCount > 1) score += 0.2;

    // 包含具体数据
    if (this.hasSpecificData(memory.content)) score += 0.1;

    // 情感关键词
    if (this.hasEmotionalKeywords(memory.content)) score += 0.1;

    // 时间衰减
    score -= this.calculateDecay(memory);

    return Math.max(0, Math.min(1, score));
  }

  private hasSpecificData(content?: string): boolean {
    return /[0-9]+|[a-z0-9._%+-]+@[a-z0-9.-]+/i.test(content || '');
  }

  private hasEmotionalKeywords(content?: string): boolean {
    return /\b(喜欢|讨厌|重要|必须|务必)\b/.test(content || '');
  }

  private calculateDecay(memory: Partial<Memory>): number {
    const daysSinceAccess = (Date.now() - (memory.lastAccessedAt || 0)) / 86400000;
    return daysSinceAccess > 30 ? 0.2 : 0;
  }
}
```

### 4.2 MemoryConsolidator

```typescript
// src/memory/consolidation/MemoryConsolidator.ts

export class MemoryConsolidator implements IMemoryConsolidator {
  constructor(
    private store: IMemoryStore,
    private calculator: ImportanceCalculator
  ) {}

  async consolidate(sessionId: string): Promise<void> {
    // 1. 获取会话所有记忆
    const memories = await this.store.getBySession(sessionId);

    // 2. 去重
    await this.deduplicate(memories);

    // 3. 合并相似记忆
    await this.merge(memories);

    // 4. 更新重要性分数
    for (const memory of memories) {
      const importance = this.calculator.calculate(memory);
      await this.store.update(memory.id, { importance });
    }
  }

  async deduplicate(sessionId: string): Promise<number> {
    const memories = await this.store.getBySession(sessionId);
    return await this.deduplicate(memories);
  }

  private async deduplicate(memories: Memory[]): Promise<number> {
    // 基于内容相似度去重
    const toDelete = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        if (this.similarity(memories[i], memories[j]) > 0.95) {
          // 保留重要性高的
          const toKeep = memories[i].importance > memories[j].importance ? i : j;
          const toRemove = toKeep === i ? j : i;
          toDelete.add(memories[toRemove].id);
        }
      }
    }

    for (const id of toDelete) {
      await this.store.delete(id);
    }

    return toDelete.size;
  }

  private similarity(a: Memory, b: Memory): number {
    // 简单的字符串相似度
    const wordsA = new Set(a.content.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.content.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }
}
```

### 4.3 CleanupScheduler

```typescript
// src/memory/consolidation/CleanupScheduler.ts

import cron from 'node-cron';

export class CleanupScheduler implements IMemoryCleanupScheduler {
  private tasks: cron.ScheduledTask[] = [];

  constructor(
    private store: IMemoryStore,
    private consolidator: IMemoryConsolidator
  ) {}

  start(): void {
    // 每日凌晨 2 点执行整合
    this.tasks.push(
      cron.schedule('0 2 * * *', async () => {
        await this.consolidator.consolidateAll();
      })
    );

    // 每小时执行一次清理
    this.tasks.push(
      cron.schedule('0 * * * *', async () => {
        await this.cleanup();
      })
    );
  }

  stop(): void {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
  }

  async cleanup(): Promise<number> {
    // 删除低价值记忆（importance < 0.3 且超过 90 天未访问）
    const allMemories = await this.store.search({});
    const threshold = Date.now() - 90 * 86400000;
    let deleted = 0;

    for (const memory of allMemories) {
      if (
        memory.importance < 0.3 &&
        memory.lastAccessedAt < threshold
      ) {
        await this.store.delete(memory.id);
        deleted++;
      }
    }

    return deleted;
  }
}
```

---

## 5. 与 Session 集成

### 5.1 Session 接口扩展

```typescript
// src/session/types.ts (扩展)

export interface Session {
  // ... 现有字段

  // 新增：记忆管理
  memory: {
    shortTerm: Array<{ role: string; content: string; timestamp: number }>;  // 最近 20 条
    longTerm: Memory[];  // 持久化记忆
  };
}
```

### 5.2 MemoryManager 统一入口

```typescript
// src/memory/MemoryManager.ts

export class MemoryManager {
  private l1: InMemoryMapStore;
  private l2: JSONLMemoryStore;
  private l3: VectorDBStore;
  private consolidator: MemoryConsolidator;
  private scheduler: CleanupScheduler;

  constructor(private workspacePath: string) {
    const memoryPath = join(workspacePath, 'memory');

    this.l1 = new InMemoryMapStore();
    this.l2 = new JSONLMemoryStore(memoryPath);

    const embeddingService = new OpenAIEmbeddingService();
    this.l3 = new VectorDBStore(this.l2, embeddingService, memoryPath);

    const calculator = new ImportanceCalculator();
    this.consolidator = new MemoryConsolidator(this.l2, calculator);
    this.scheduler = new CleanupScheduler(this.l2, this.consolidator);
  }

  async start(): Promise<void> {
    await this.l2.init();
    await this.l3.load();
    this.scheduler.start();
  }

  // 统一接口：自动选择存储层
  async add(memory: Memory): Promise<string> {
    // L1: 立即写入缓存
    await this.l1.add(memory);

    // L2: 持久化
    await this.l2.add(memory);

    // L3: 向量索引（异步，不阻塞）
    this.l3.add(memory).catch(err => {
      console.error('Vector indexing failed:', err);
    });

    return memory.id;
  }

  async get(id: string): Promise<Memory | null> {
    // 先查 L1，未命中查 L2
    let memory = await this.l1.get(id);
    if (!memory) {
      memory = await this.l2.get(id);
      if (memory) {
        // 回填 L1
        await this.l1.add(memory);
      }
    }
    return memory;
  }

  async semanticSearch(query: string, topK = 10): Promise<MemorySearchResult[]> {
    return this.l3.semanticSearch(query, topK);
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    return this.l2.search(query);
  }

  // 整合和清理
  async consolidate(sessionId: string): Promise<void> {
    await this.consolidator.consolidate(sessionId);
  }

  async cleanup(): Promise<number> {
    return await this.scheduler.cleanup();
  }
}
```

---

## 6. 目录结构

```
src/
└── memory/
    ├── types.ts                     # 类型定义
    ├── MemoryManager.ts             # 统一入口
    │
    ├── core/                        # 核心接口
    │   ├── index.ts
    │   ├── IMemoryStore.ts
    │   ├── IMemoryVectorStore.ts
    │   └── IEmbeddingService.ts
    │
    ├── store/                       # 存储实现
    │   ├── index.ts
    │   ├── InMemoryMapStore.ts      # L1
    │   ├── JSONLMemoryStore.ts      # L2
    │   └── VectorDBStore.ts         # L3
    │
    ├── embedding/                   # 嵌入服务
    │   ├── index.ts
    │   ├── IEmbeddingService.ts
    │   ├── OpenAIEmbeddingService.ts
    │   └── EmbeddingCache.ts
    │
    ├── vector/                      # 向量索引
    │   ├── index.ts
    │   ├── HNSWIndex.ts
    │   └── VectorUtils.ts
    │
    └── consolidation/               # 整合引擎
        ├── index.ts
        ├── ImportanceCalculator.ts
        ├── MemoryConsolidator.ts
        └── CleanupScheduler.ts
```

---

## 7. 与 AgentSwarm 集成

### 7.1 Container 注册

```typescript
// src/container.ts (扩展)

export class Container {
  // ... 现有代码

  private memoryManager?: MemoryManager;

  getMemoryManager(): MemoryManager {
    if (!this.memoryManager) {
      this.memoryManager = new MemoryManager(this.workspacePath);
    }
    return this.memoryManager;
  }
}
```

### 7.2 AgentSwarm 集成

```typescript
// src/AgentSwarm.ts (扩展)

export class AgentSwarm {
  // ... 现有代码

  private get memoryManager(): MemoryManager {
    return this.container.getMemoryManager();
  }

  async start(): Promise<void> {
    // ... 现有代码

    // 启动记忆系统
    await this.memoryManager.start();
  }

  // 在消息处理中自动提取和存储记忆
  private async extractMemories(
    sessionId: string,
    agentId: string,
    content: string
  ): Promise<void> {
    // TODO: 使用 AI 提取关键信息
    // 暂时存储整段内容
    const memory: Memory = {
      id: generateId(),
      sessionId,
      agentId,
      content,
      type: 'fact',
      importance: 0.5,
      confidence: 0.8,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      relatedIds: [],
      source: 'agent',
    };

    await this.memoryManager.add(memory);
  }
}
```

---

## 8. 测试策略

### 8.1 单元测试

```typescript
// tests/memory/InMemoryMapStore.test.ts
describe('InMemoryMapStore', () => {
  it('should add and retrieve memory', async () => {
    const store = new InMemoryMapStore();
    const memory = createTestMemory();

    const id = await store.add(memory);
    const retrieved = await store.get(id);

    expect(retrieved).toEqual(memory);
  });

  it('should enforce TTL', async () => {
    // 测试过期清理
  });
});
```

### 8.2 集成测试

```typescript
// tests/memory/MemoryManager.integration.test.ts
describe('MemoryManager Integration', () => {
  it('should write through all layers', async () => {
    const manager = new MemoryManager('/tmp/test-memory');

    await manager.add(testMemory);

    // 验证 L1
    expect(await manager.l1.get(testMemory.id)).toBeDefined();

    // 验证 L2
    expect(await manager.l2.get(testMemory.id)).toBeDefined();

    // 等待 L3 异步完成
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(await manager.l3.get(testMemory.id)).toBeDefined();
  });
});
```

---

## 9. 性能指标

| 指标 | 目标 | 监控方式 |
|------|------|----------|
| L1 查询延迟 | < 1ms | 内置计时 |
| L2 查询延迟 | < 50ms | 内置计时 |
| L3 语义搜索 | < 200ms | 内置计时 |
| Embedding 生成 | < 500ms | OpenAI 计时 |
| 内存占用 | < 100MB | process.memoryUsage() |

---

## 10. 未来扩展

### 10.1 多模态记忆

- 支持图片、音频等非文本记忆
- 使用 CLIP 等多模态嵌入模型

### 10.2 分布式存储

- 支持 Redis 作为 L1 缓存
- 支持 PostgreSQL/pgvector 作为 L2

### 10.3 联邦学习

- 跨会话记忆聚合
- 隐私保护的记忆共享
