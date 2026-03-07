# 长期记忆系统实现任务清单

## 任务分配说明

本文档将长期记忆系统实现拆分为可执行的任务，每个任务包含：
- 输入（依赖的前置任务）
- 输出（交付物）
- 验收标准
- 预估工作量

---

## Phase 1: 基础设施（P0 - 必须实现）

### 任务 1.1：创建 memory 模块目录结构

**负责人**: developer
**预估**: 30 分钟

**输入**:
- 项目根目录 `/home/pyf/project/agent-swarm`

**输出**:
```
src/memory/
├── types.ts
├── MemoryManager.ts
├── core/
│   ├── index.ts
│   ├── IMemoryStore.ts
│   ├── IMemoryVectorStore.ts
│   └── IEmbeddingService.ts
├── store/
│   ├── index.ts
│   ├── InMemoryMapStore.ts
│   ├── JSONLMemoryStore.ts
│   └── VectorDBStore.ts
├── embedding/
│   ├── index.ts
│   ├── IEmbeddingService.ts
│   ├── OpenAIEmbeddingService.ts
│   └── EmbeddingCache.ts
├── vector/
│   ├── index.ts
│   ├── HNSWIndex.ts
│   └── VectorUtils.ts
└── consolidation/
    ├── index.ts
    ├── ImportanceCalculator.ts
    ├── MemoryConsolidator.ts
    └── CleanupScheduler.ts
```

**验收标准**:
- [ ] 所有目录创建成功
- [ ] 所有 index.ts 文件导出正确
- [ ] TypeScript 编译无错误

---

### 任务 1.2：实现 Memory 类型定义

**负责人**: developer
**预估**: 1 小时

**输入**: 任务 1.1
**输出**: `src/memory/types.ts`

**实现内容**:
```typescript
export type MemoryType = 'fact' | 'preference' | 'event' | 'skill';
export type MemorySource = 'user' | 'agent' | 'system';

export interface Memory {
  id: string;
  sessionId: string;
  agentId?: string;
  content: string;
  embedding?: number[];
  type: MemoryType;
  importance: number;
  confidence: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
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
  score: number;
}

export interface MemoryStoreStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  bySession: Record<string, number>;
}
```

**验收标准**:
- [ ] 类型定义完整
- [ ] 导出正确
- [ ] TypeScript 类型检查通过

---

### 任务 1.3：实现核心接口定义

**负责人**: developer
**预估**: 1.5 小时

**输入**: 任务 1.2
**输出**:
- `src/memory/core/IMemoryStore.ts`
- `src/memory/core/IMemoryVectorStore.ts`
- `src/memory/core/IEmbeddingService.ts`

**验收标准**:
- [ ] 接口定义符合架构设计文档
- [ ] JSDoc 注释完整
- [ ] 导出正确

---

### 任务 1.4：实现 InMemoryMapStore（L1）

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 1.3
**输出**: `src/memory/store/InMemoryMapStore.ts`

**实现要点**:
- 使用 Map 存储记忆
- 使用 Map 建立 sessionId 和 agentId 索引
- 实现 TTL 自动清理
- 更新访问统计（lastAccessedAt, accessCount）

**验收标准**:
- [ ] 实现 IMemoryStore 接口
- [ ] 通过单元测试
- [ ] TTL 清理正常工作

---

## Phase 2: 持久化（P0 - 必须实现）

### 任务 2.1：实现 JSONLMemoryStore（L2）

**负责人**: developer
**预估**: 3 小时

**输入**: 任务 1.3
**输出**: `src/memory/store/JSONLMemoryStore.ts`

**实现要点**:
- 目录结构：`memory/index.jsonl`, `memory/sessions/<sessionId>.jsonl`
- 原子写入：使用临时文件 + 重命名
- 索引维护：index.jsonl 记录所有记忆位置

**验收标准**:
- [ ] 实现 IMemoryStore 接口
- [ ] 通过单元测试
- [ ] 数据可正确恢复

---

### 任务 2.2：实现 OpenAI Embedding 服务

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 1.3
**输出**:
- `src/memory/embedding/OpenAIEmbeddingService.ts`
- `src/memory/embedding/EmbeddingCache.ts`

**实现要点**:
- 使用 OpenAI API 生成 768 维向量
- 批量请求优化
- LRU 缓存减少重复调用

**依赖安装**:
```bash
npm install openai
npm install --save-dev @types/openai
```

**验收标准**:
- [ ] 实现 IEmbeddingService 接口
- [ ] 正确调用 OpenAI API
- [ ] 缓存正常工作

---

### 任务 2.3：实现向量工具函数

**负责人**: developer
**预估**: 1.5 小时

**输入**: 任务 2.2
**输出**: `src/memory/vector/VectorUtils.ts`

**实现内容**:
- 余弦相似度计算
- 欧氏距离计算
- 向量归一化

**验收标准**:
- [ ] 数学计算正确
- [ ] 通过单元测试

---

## Phase 3: 语义检索（P1 - 重要）

### 任务 3.1：实现 HNSW 索引

**负责人**: developer
**预估**: 4 小时

**输入**: 任务 2.3
**输出**: `src/memory/vector/HNSWIndex.ts`

**实现要点**:
- 图结构：多层邻接表
- 插入算法：贪婪搜索最近邻
- 查询算法：从顶层向下搜索
- 持久化：序列化到文件

**验收标准**:
- [ ] 正确实现 HNSW 算法
- [ ] 通过单元测试
- [ ] 可保存和加载

---

### 任务 3.2：实现 VectorDBStore（L3）

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 3.1, 任务 2.1
**输出**: `src/memory/store/VectorDBStore.ts`

**实现要点**:
- 组合 L2 存储和 HNSW 索引
- 异步生成向量
- 语义搜索接口

**验收标准**:
- [ ] 实现 IMemoryVectorStore 接口
- [ ] 通过集成测试

---

## Phase 4: 整合引擎（P1 - 重要）

### 任务 4.1：实现 ImportanceCalculator

**负责人**: developer
**预估**: 1.5 小时

**输入**: 任务 1.2
**输出**: `src/memory/consolidation/ImportanceCalculator.ts`

**实现要点**:
- 实现 5 个评分因子
- 时间衰减计算
- 结果归一化到 [0, 1]

**验收标准**:
- [ ] 评分逻辑正确
- [ ] 通过单元测试

---

### 任务 4.2：实现 MemoryConsolidator

**负责人**: developer
**预估**: 2.5 小时

**输入**: 任务 4.1, 任务 1.3
**输出**: `src/memory/consolidation/MemoryConsolidator.ts`

**实现要点**:
- 基于相似度去重
- 合并相似记忆
- 更新重要性分数

**验收标准**:
- [ ] 实现 IMemoryConsolidator 接口
- [ ] 通过集成测试

---

### 任务 4.3：实现 CleanupScheduler

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 4.2, 任务 1.3
**输出**: `src/memory/consolidation/CleanupScheduler.ts`

**依赖安装**:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

**实现要点**:
- 使用 node-cron 定时执行
- 删除低价值记忆
- 可启动和停止

**验收标准**:
- [ ] 实现 IMemoryCleanupScheduler 接口
- [ ] 定时任务正常工作

---

## Phase 5: 统一入口（P0 - 必须实现）

### 任务 5.1：实现 MemoryManager

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 1.4, 任务 2.1, 任务 3.2, 任务 4.3
**输出**: `src/memory/MemoryManager.ts`

**实现要点**:
- 组合三层存储
- 统一接口
- 自动回填 L1 缓存
- 异步向量索引

**验收标准**:
- [ ] 提供统一接口
- [ ] 通过集成测试
- [ ] 性能满足要求

---

## Phase 6: Session 集成（P0 - 必须实现）

### 任务 6.1：扩展 Session 接口

**负责人**: developer
**预估**: 1 小时

**输入**: 任务 1.2
**输出**: 更新 `src/session/types.ts`

**实现内容**:
```typescript
import type { Memory } from '../memory/types.js';

export interface Session {
  // ... 现有字段

  memory: {
    shortTerm: Array<{ role: string; content: string; timestamp: number }>;
    longTerm: Memory[];
  };
}
```

**验收标准**:
- [ ] 类型定义正确
- [ ] 不破坏现有代码

---

### 任务 6.2：扩展 SessionStore

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 6.1, 任务 5.1
**输出**: 更新 `src/session/JSONLSessionStore.ts`

**实现要点**:
- 持久化 shortTerm 和 longTerm
- 加载时恢复记忆数据

**验收标准**:
- [ ] 记忆数据正确保存和加载
- [ ] 向后兼容旧数据

---

### 任务 6.3：集成到 AgentSwarm

**负责人**: developer
**预估**: 2 小时

**输入**: 任务 5.1
**输出**: 更新 `src/AgentSwarm.ts`, `src/container.ts`

**实现要点**:
- Container 注册 MemoryManager
- 启动时初始化记忆系统
- 消息处理中提取和存储记忆

**验收标准**:
- [ ] 系统正常启动
- [ ] 记忆自动创建
- [ ] 不影响现有功能

---

## Phase 7: 测试（P0 - 必须实现）

### 任务 7.1：单元测试

**负责人**: developer + tester
**预估**: 4 小时

**输出**:
- `tests/memory/InMemoryMapStore.test.ts`
- `tests/memory/JSONLMemoryStore.test.ts`
- `tests/memory/VectorDBStore.test.ts`
- `tests/memory/ImportanceCalculator.test.ts`
- `tests/memory/MemoryConsolidator.test.ts`

**验收标准**:
- [ ] 覆盖率 > 80%
- [ ] 所有测试通过

---

### 任务 7.2：集成测试

**负责人**: tester
**预估**: 3 小时

**输出**: `tests/memory/MemoryManager.integration.test.ts`

**验收标准**:
- [ ] 覆盖主要场景
- [ ] 三层存储协同正常

---

### 任务 7.3：E2E 测试

**负责人**: tester
**预估**: 2 小时

**输出**: 更新 `tests/E2E_TEST_GUIDE.md`

**验收标准**:
- [ ] 添加记忆相关测试用例
- [ ] 通过 E2E 测试

---

## 任务依赖图

```
Phase 1: 基础设施
├── 1.1 目录结构
│   ├── 1.2 类型定义
│   │   ├── 1.3 核心接口
│   │   │   ├── 1.4 InMemoryMapStore ✓
│   │   │   └── 2.1 JSONLMemoryStore ✓
│   │   └── 2.2 OpenAI Embedding
│   │       └── 2.3 VectorUtils
│   │           └── 3.1 HNSWIndex
│   │               └── 3.2 VectorDBStore
│   └── 4.1 ImportanceCalculator
│       └── 4.2 MemoryConsolidator
│           └── 4.3 CleanupScheduler
│
└── 5.1 MemoryManager
    ├── 6.1 Session 接口扩展
    ├── 6.2 SessionStore 扩展
    ├── 6.3 AgentSwarm 集成
    └── 7.1-7.3 测试
```

---

## 优先级说明

| 优先级 | 说明 | 任务 |
|--------|------|------|
| P0 | 必须实现，核心功能 | Phase 1, 2, 5, 6, 7 |
| P1 | 重要，增强体验 | Phase 3, 4 |

---

## 风险和缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| OpenAI API 限流 | 嵌入生成失败 | 实现重试和缓存 |
| HNSW 实现复杂 | 开发延期 | 使用简化的 KNN 替代 |
| 性能不达标 | 用户体验差 | 优化索引和缓存策略 |
| 数据迁移困难 | 向后兼容问题 | 提供数据迁移工具 |

---

## 总预估工作量

| Phase | 预估时间 |
|-------|----------|
| Phase 1 | 5 小时 |
| Phase 2 | 6.5 小时 |
| Phase 3 | 6 小时 |
| Phase 4 | 6 小时 |
| Phase 5 | 2 小时 |
| Phase 6 | 5 小时 |
| Phase 7 | 9 小时 |
| **总计** | **39.5 小时** |

---

## 完成标准

1. [ ] 所有 P0 任务完成
2. [ ] 单元测试覆盖率 > 80%
3. [ ] 集成测试通过
4. [ ] E2E 测试通过
5. [ ] 性能指标达标
6. [ ] 文档完整
