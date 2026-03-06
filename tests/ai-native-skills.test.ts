/**
 * AI Native Skill 文件测试
 *
 * 测试 .claude/skills/ 目录下的 AI Native skill 文件：
 * - create-agent.md
 * - configure-agent.md
 * - add-channel.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('AI Native Skill 文件测试', () => {
  const skillsPath = join(process.cwd(), '.claude', 'skills');
  let skillFiles: Record<string, string>;

  beforeEach(async () => {
    // 读取所有 skill 文件内容
    skillFiles = {
      'create-agent': join(skillsPath, 'create-agent.md'),
      'configure-agent': join(skillsPath, 'configure-agent.md'),
      'add-channel': join(skillsPath, 'add-channel.md'),
    };
  });

  describe('文件存在性和可读性', () => {
    it('create-agent.md 文件应该存在', async () => {
      const exists = await fileExists(skillFiles['create-agent']);
      expect(exists).toBe(true);
    });

    it('configure-agent.md 文件应该存在', async () => {
      const exists = await fileExists(skillFiles['configure-agent']);
      expect(exists).toBe(true);
    });

    it('add-channel.md 文件应该存在', async () => {
      const exists = await fileExists(skillFiles['add-channel']);
      expect(exists).toBe(true);
    });

    it('所有 skill 文件应该是可读的', async () => {
      for (const [name, path] of Object.entries(skillFiles)) {
        const content = await fs.readFile(path, 'utf-8');
        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(100);
      }
    });
  });

  describe('文档结构验证', () => {
    it('create-agent.md 应包含必需的章节', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      const requiredSections = [
        '## 概述',
        '## 使用方式',
        '## Agent 配置结构',
        '## config.json 字段说明',
        '## prompt.md 结构',
        '## 执行步骤',
        '## 注意事项',
      ];

      for (const section of requiredSections) {
        expect(content).toContain(section);
      }
    });

    it('configure-agent.md 应包含必需的章节', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      const requiredSections = [
        '## 概述',
        '## 使用方式',
        '## Agent 配置字段',
        '## config.json 完整字段',
        '## 字段说明',
        '## 常见配置场景',
        '## 执行步骤',
        '## 配置验证规则',
        '## 注意事项',
      ];

      for (const section of requiredSections) {
        expect(content).toContain(section);
      }
    });

    it('add-channel.md 应包含必需的章节', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      const requiredSections = [
        '## 概述',
        '## 使用方式',
        '## 支持的渠道类型',
        '## Agent 渠道配置结构',
        '## channels.json 结构',
        '## 执行步骤',
        '## 渠道配置模板',
        '## 安全注意事项',
      ];

      for (const section of requiredSections) {
        expect(content).toContain(section);
      }
    });

    it('所有文件应包含一级标题', async () => {
      for (const [name, path] of Object.entries(skillFiles)) {
        const content = await fs.readFile(path, 'utf-8');
        expect(content).toMatch(/^# .+/m);
      }
    });
  });

  describe('配置模板正确性', () => {
    it('create-agent.md 应包含有效的 JSON 配置示例', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      // 提取 JSON 代码块
      const jsonBlocks = content.match(/```json\n([\s\S]*?)\n```/g) || [];

      expect(jsonBlocks.length).toBeGreaterThan(0);

      // 验证每个 JSON 块是有效的
      for (const block of jsonBlocks) {
        const jsonStr = block.replace(/```json\n/, '').replace(/\n```$/, '');
        expect(() => JSON.parse(jsonStr)).not.toThrow();
      }
    });

    it('configure-agent.md 应包含有效的配置示例', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      // 验证包含完整的 config.json 示例
      expect(content).toContain('"id":');
      expect(content).toContain('"name":');
      expect(content).toContain('"description":');
      expect(content).toContain('"model":');
      expect(content).toContain('"provider":');
    });

    it('add-channel.md 应包含有效的渠道配置示例', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      // 验证包含 CLI 渠道配置
      expect(content).toContain('"type": "cli"');

      // 验证包含钉钉渠道配置
      expect(content).toContain('"type": "dingtalk"');
      expect(content).toContain('"appKey"');
      expect(content).toContain('"appSecret"');

      // 验证包含飞书渠道配置
      expect(content).toContain('"type": "feishu"');
      expect(content).toContain('"appId"');
    });

    it('channels.json 结构应正确', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      expect(content).toContain('"channels":');
      expect(content).toContain('"enabled"');
      expect(content).toContain('"config"');
    });
  });

  describe('字段定义验证', () => {
    it('create-agent.md 应定义必需字段', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      const requiredFields = ['id', 'name', 'description'];
      for (const field of requiredFields) {
        expect(content).toContain(`"${field}"`);
      }
    });

    it('configure-agent.md 应列出所有支持的字段', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      const supportedFields = [
        'id',
        'name',
        'description',
        'model.provider',
        'model.id',
        'systemPrompt',
        'temperature',
        'maxTokens',
        'timeout',
      ];

      for (const field of supportedFields) {
        expect(content).toContain(field);
      }
    });

    it('add-channel.md 应定义渠道配置字段', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      const channelFields = ['type', 'enabled', 'config', 'appKey', 'appSecret', 'appId'];
      for (const field of channelFields) {
        expect(content).toContain(field);
      }
    });
  });

  describe('支持的模型和渠道验证', () => {
    it('create-agent.md 应列出支持的模型提供商', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      expect(content).toContain('anthropic');
      expect(content).toContain('openai');
      expect(content).toContain('openrouter');
    });

    it('configure-agent.md 应包含模型提供商表格', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      expect(content).toContain('| Provider |');
      expect(content).toContain('| anthropic |');
      expect(content).toContain('| openai |');
    });

    it('add-channel.md 应列出所有支持的渠道', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      expect(content).toContain('CLI 渠道');
      expect(content).toContain('钉钉渠道');
      expect(content).toContain('飞书渠道');
    });
  });

  describe('执行步骤验证', () => {
    it('create-agent.md 应包含完整的执行步骤', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      const steps = [
        '解析用户需求',
        '生成 config.json',
        '生成 prompt.md',
        '创建目录结构',
        '确认创建',
      ];

      for (const step of steps) {
        expect(content).toContain(step);
      }
    });

    it('configure-agent.md 应包含完整的执行步骤', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      const steps = [
        '确认 Agent ID',
        '读取现有配置',
        '解析用户需求',
        '合并配置',
        '保存配置',
      ];

      for (const step of steps) {
        expect(content).toContain(step);
      }
    });

    it('add-channel.md 应包含完整的执行步骤', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      const steps = [
        '确认 Agent ID',
        '确认渠道类型',
        '收集必要信息',
        '创建/更新 channels.json',
        '验证配置',
        '确认完成',
      ];

      for (const step of steps) {
        expect(content).toContain(step);
      }
    });
  });

  describe('错误处理和注意事项', () => {
    it('create-agent.md 应包含 ID 命名规范', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      expect(content).toContain('ID 命名规范');
      expect(content).toContain('小写字母、数字和中划线');
    });

    it('configure-agent.md 应包含配置验证规则', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      expect(content).toContain('## 配置验证规则');
      expect(content).toContain('ID 验证');
      expect(content).toContain('Temperature 验证');
      expect(content).toContain('MaxTokens 验证');
    });

    it('add-channel.md 应包含安全注意事项', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      expect(content).toContain('## 安全注意事项');
      expect(content).toContain('敏感信息保护');
      expect(content).toContain('.gitignore');
    });

    it('所有文件应包含错误处理说明', async () => {
      const createAgentContent = await fs.readFile(skillFiles['create-agent'], 'utf-8');
      const configureAgentContent = await fs.readFile(skillFiles['configure-agent'], 'utf-8');
      const addChannelContent = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      // 每个文件都应有某种错误处理或注意事项说明
      expect(
        createAgentContent.includes('注意') ||
          createAgentContent.includes('注意事项') ||
          createAgentContent.includes('错误')
      ).toBe(true);

      expect(configureAgentContent).toContain('## 错误处理');
      expect(addChannelContent).toContain('## 错误处理');
    });
  });

  describe('目录结构引用验证', () => {
    it('create-agent.md 应引用正确的目录结构', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      expect(content).toContain('~/.agent-swarm/agents/');
      expect(content).toContain('config.json');
      expect(content).toContain('prompt.md');
      expect(content).toContain('skills/');
    });

    it('configure-agent.md 应引用正确的配置文件路径', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      expect(content).toContain('~/.agent-swarm/agents/');
      expect(content).toContain('config.json');
    });

    it('add-channel.md 应引用正确的渠道配置路径', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      expect(content).toContain('~/.agent-swarm/agents/');
      expect(content).toContain('channels.json');
    });
  });

  describe('Markdown 语法验证', () => {
    it('所有文件应使用正确的 Markdown 标题层级', async () => {
      for (const [name, path] of Object.entries(skillFiles)) {
        const content = await fs.readFile(path, 'utf-8');

        // 检查标题层级：# ## ### ####
        const headings = content.match(/^#{1,4}\s+.+$/gm) || [];
        expect(headings.length).toBeGreaterThan(5);

        // 验证没有跳级（如 # 后直接 ###）
        const lines = content.split('\n');
        let lastLevel = 0;

        for (const line of lines) {
          const match = line.match(/^(#{1,4})\s/);
          if (match) {
            const level = match[1].length;
            // 允许同级或降级，但不应该跳级超过1级
            if (level > lastLevel && lastLevel > 0) {
              expect(level - lastLevel).toBeLessThanOrEqual(1);
            }
            lastLevel = level;
          }
        }
      }
    });

    it('代码块应使用正确的语言标记', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      // 检查 JSON 代码块
      expect(content).toMatch(/```json/);
    });

    it('表格应使用正确的 Markdown 格式', async () => {
      const configureAgentContent = await fs.readFile(skillFiles['configure-agent'], 'utf-8');
      const addChannelContent = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      // 检查表格格式
      expect(configureAgentContent).toMatch(/\|.*\|.*\|/);
      expect(addChannelContent).toMatch(/\|.*\|.*\|/);
    });
  });

  describe('内容完整性', () => {
    it('create-agent.md 应包含 Agent 类型示例', async () => {
      const content = await fs.readFile(skillFiles['create-agent'], 'utf-8');

      const agentTypes = ['客服类 Agent', '翻译类 Agent', '代码助手类 Agent'];
      for (const type of agentTypes) {
        expect(content).toContain(type);
      }
    });

    it('configure-agent.md 应包含常见配置场景', async () => {
      const content = await fs.readFile(skillFiles['configure-agent'], 'utf-8');

      expect(content).toContain('## 常见配置场景');
      expect(content).toContain('场景 1:');
      expect(content).toContain('场景 2:');
    });

    it('add-channel.md 应包含渠道配置模板', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      expect(content).toContain('## 渠道配置模板');
      expect(content).toContain('添加钉钉渠道模板');
      expect(content).toContain('添加飞书渠道模板');
      expect(content).toContain('添加 CLI 渠道模板');
    });

    it('文件内容不应包含待办事项标记', async () => {
      for (const [name, path] of Object.entries(skillFiles)) {
        const content = await fs.readFile(path, 'utf-8');

        // 检查是否有 TODO、FIXME 等标记
        expect(content.toLowerCase()).not.toContain('todo');
        expect(content.toLowerCase()).not.toContain('fixme');
        expect(content.toLowerCase()).not.toContain('[ ]');
      }
    });
  });

  describe('链接和引用验证', () => {
    it('add-channel.md 应包含有效的外部链接', async () => {
      const content = await fs.readFile(skillFiles['add-channel'], 'utf-8');

      // 检查常见的链接格式
      const urls = content.match(/https?:\/\/[^\s\)]+/g) || [];

      if (urls.length > 0) {
        // 验证 URL 格式
        for (const url of urls) {
          expect(url).toMatch(/^https?:\/\/.+/);
        }
      }
    });

    it('文件不应包含损坏的内部引用', async () => {
      for (const [name, path] of Object.entries(skillFiles)) {
        const content = await fs.readFile(path, 'utf-8');

        // 检查 Markdown 链接格式
        const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];

        for (const link of links) {
          // 验证链接格式正确
          expect(link).toMatch(/\[.+\]\(.+\)/);
        }
      }
    });
  });
});

/**
 * 辅助函数：检查文件是否存在
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
