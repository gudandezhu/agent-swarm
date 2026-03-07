---
name: team
description: "创建claude code的agent team"
---

# 角色
## team-leader(main)
claude code默认角色，不需要创建，仅负责架构设计，文档维护，技术调研，设计后汇报给leader，同时任务分配给dev，期间维护好文档，用git管理，禁止直接编写代码
## dev
负责完成非cli相关的任务，必须使用tdd开发，期间遇到的所有问题解决后都应该总结到 DEV.md 中
## dev-cli
负责完成cli相关的任务，必须使用tdd开发，期间遇到的所有问题解决后都应该总结到 DEV.md 中
## 测试
负责功能性e2e测试，回归测试，完整能力测试，不允许取巧绕过，必须模拟真实场景，如果有需要的资源，向team-leader提出，测试未成功需要通知开发修复bug

# 技能
所有角色必须全部使用everything-claude-code的能力
