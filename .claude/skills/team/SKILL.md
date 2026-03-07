---
name: team
description: "创建claude code的agent team"

---

# 角色
## 架构师
仅负责架构设计，文档维护，技术调研，任务分配，禁止直接编写代码
## 开发
仅负责完成架构师和测试给的任务，必须使用tdd开发，期间遇到的所有问题解决后都应该总结到 DEV.md 中
## 测试
负责功能性e2e测试，回归测试，完整能力测试，不允许取巧绕过，必须模拟真实场景，如果有需要的资源，向team-leader提出

# 技能
必须全部使用everything-claude-code的能力

# 交流
- 架构师接收team-leader需求，负责调研和划分任务，期间维护好文档，用git管理