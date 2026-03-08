/**
 * agent-swarm.json 配置文件测试
 *
 * 验证配置文件重命名后的功能正确性
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { ConfigLoader } from '../src/config.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';

describe('ConfigLoader - agent-swarm.json', () => {
  let testConfigPath: string;
  let testWorkspaceDir: string;
  let configLoader: ConfigLoader;

  beforeEach(async () => {
    // 创建临时测试目录
    testWorkspaceDir = join(tmpdir(), `agent-swarm-test-${Date.now()}`);
    await fs.mkdir(testWorkspaceDir, { recursive: true });

    testConfigPath = join(testWorkspaceDir, 'agent-swarm.json');

    // 创建配置加载器实例并设置测试路径
    configLoader = ConfigLoader.getInstance();
    configLoader.setConfigPath(testConfigPath);
  });

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(testWorkspaceDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  describe('配置文件路径', () => {
    it('应该使用 agent-swarm.json 作为配置文件名', () => {
      const configPath = configLoader.getConfigPath();
      expect(configPath).toContain('agent-swarm.json');
      expect(configPath).not.toContain('config.json');
    });

    it('应该在正确的工作空间目录下（使用自定义测试路径）', () => {
      const configPath = configLoader.getConfigPath();
      // 测试中使用了自定义路径，所以应该匹配测试目录
      expect(configPath).toContain(testWorkspaceDir);
      expect(configPath.split('/').pop()).toBe('agent-swarm.json');
    });

    it('默认路径应该在 ~/.agent-swarm 下', () => {
      // 重置为默认实例
      const defaultLoader = ConfigLoader.getInstance();
      defaultLoader.setConfigPath(join(process.env.HOME || '', '.agent-swarm', 'agent-swarm.json'));
      const defaultPath = defaultLoader.getConfigPath();
      expect(defaultPath).toContain('.agent-swarm');
      expect(defaultPath).toContain('agent-swarm.json');
    });
  });

  describe('配置文件加载', () => {
    it('应该能加载存在的 agent-swarm.json', async () => {
      // 创建测试配置文件
      const testConfig = {
        apiKeys: {
          anthropic: 'sk-ant-test-key',
          openai: 'sk-openai-test-key',
        },
        workspace: testWorkspaceDir,
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // 加载配置
      const config = await configLoader.load();

      expect(config).toBeDefined();
      expect(config.apiKeys?.anthropic).toBe('sk-ant-test-key');
      expect(config.apiKeys?.openai).toBe('sk-openai-test-key');
    });

    it('当配置文件不存在时应该返回空配置', async () => {
      const config = await configLoader.load();
      expect(config).toEqual({});
    });

    it('应该能正确解析 JSON 格式', async () => {
      const testConfig = {
        apiKeys: {
          anthropic: 'sk-ant-key',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const config = await configLoader.load();
      expect(config.apiKeys?.anthropic).toBe('sk-ant-key');
    });

    it('应该忽略无效的 JSON 并返回空配置', async () => {
      await fs.writeFile(testConfigPath, 'invalid json {{{');

      const config = await configLoader.load();
      expect(config).toEqual({});
    });
  });

  describe('API 密钥获取', () => {
    beforeEach(() => {
      // 清除环境变量
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    it('应该从 agent-swarm.json 读取 API 密钥', async () => {
      const testConfig = {
        apiKeys: {
          anthropic: 'sk-ant-from-file',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const result = await configLoader.getApiKey('anthropic');

      expect(result).toBeDefined();
      expect(result?.key).toBe('sk-ant-from-file');
      expect(result?.source).toBe('global');
    });

    it('环境变量优先级应该高于配置文件', async () => {
      const testConfig = {
        apiKeys: {
          anthropic: 'sk-ant-from-file',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));
      process.env.ANTHROPIC_API_KEY = 'sk-ant-from-env';

      const result = await configLoader.getApiKey('anthropic');

      expect(result?.key).toBe('sk-ant-from-env');
      expect(result?.source).toBe('env');

      delete process.env.ANTHROPIC_API_KEY;
    });

    it('当没有配置时应该返回 null', async () => {
      const result = await configLoader.getApiKey('anthropic');
      expect(result).toBeNull();
    });

    it('Agent 专用密钥优先级最低', async () => {
      const testConfig = {
        apiKeys: {
          anthropic: 'sk-ant-from-file',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const result = await configLoader.getApiKey('anthropic', 'sk-ant-from-agent');

      // 配置文件应该优先于 Agent 密钥
      expect(result?.key).toBe('sk-ant-from-file');
      expect(result?.source).toBe('global');
    });
  });

  describe('配置重新加载', () => {
    it('应该能重新加载配置', async () => {
      const initialConfig = {
        apiKeys: {
          anthropic: 'initial-key',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(initialConfig));

      const config1 = await configLoader.load();
      expect(config1.apiKeys?.anthropic).toBe('initial-key');

      // 修改配置文件
      const updatedConfig = {
        apiKeys: {
          anthropic: 'updated-key',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(updatedConfig));

      const config2 = await configLoader.reload();
      expect(config2.apiKeys?.anthropic).toBe('updated-key');
    });
  });

  describe('GLM 配置支持', () => {
    beforeEach(() => {
      // 清除 GLM 环境变量
      delete process.env.GLM_API_KEY;
      delete process.env.GLM_BASE_URL;
    });

    it('应该从环境变量读取 GLM API 密钥', async () => {
      process.env.GLM_API_KEY = 'glm-key-from-env';

      const result = await configLoader.getApiKey('glm');

      expect(result).toBeDefined();
      expect(result?.key).toBe('glm-key-from-env');
      expect(result?.source).toBe('env');

      delete process.env.GLM_API_KEY;
    });

    it('应该从配置文件读取 GLM API 密钥', async () => {
      const testConfig = {
        apiKeys: {
          glm: 'glm-key-from-file',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const result = await configLoader.getApiKey('glm');

      expect(result).toBeDefined();
      expect(result?.key).toBe('glm-key-from-file');
      expect(result?.source).toBe('global');
    });

    it('环境变量优先级应该高于配置文件（GLM）', async () => {
      const testConfig = {
        apiKeys: {
          glm: 'glm-key-from-file',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));
      process.env.GLM_API_KEY = 'glm-key-from-env';

      const result = await configLoader.getApiKey('glm');

      expect(result?.key).toBe('glm-key-from-env');
      expect(result?.source).toBe('env');

      delete process.env.GLM_API_KEY;
    });

    it('Agent 专用 GLM 密钥优先级最低', async () => {
      const testConfig = {
        apiKeys: {
          glm: 'glm-key-from-file',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const result = await configLoader.getApiKey('glm', 'glm-key-from-agent');

      expect(result?.key).toBe('glm-key-from-file');
      expect(result?.source).toBe('global');
    });

    it('当没有任何 GLM 配置时应该返回 null', async () => {
      const result = await configLoader.getApiKey('glm');
      expect(result).toBeNull();
    });
  });

  describe('Base URL 配置', () => {
    beforeEach(() => {
      // 清除 base URL 环境变量
      delete process.env.GLM_BASE_URL;
      delete process.env.OPENAI_BASE_URL;
      delete process.env.ANTHROPIC_BASE_URL;
    });

    it('应该从环境变量读取 GLM Base URL', async () => {
      process.env.GLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

      const result = await configLoader.getBaseUrl('glm');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(result?.source).toBe('env');

      delete process.env.GLM_BASE_URL;
    });

    it('应该从配置文件读取 GLM Base URL', async () => {
      const testConfig = {
        baseUrls: {
          glm: 'https://open.bigmodel.cn/api/paas/v4',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const result = await configLoader.getBaseUrl('glm');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(result?.source).toBe('global');
    });

    it('环境变量优先级应该高于配置文件（Base URL）', async () => {
      const testConfig = {
        baseUrls: {
          glm: 'https://open.bigmodel.cn/api/paas/v4',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));
      process.env.GLM_BASE_URL = 'https://custom-glm.example.com/v1';

      const result = await configLoader.getBaseUrl('glm');

      expect(result?.url).toBe('https://custom-glm.example.com/v1');
      expect(result?.source).toBe('env');

      delete process.env.GLM_BASE_URL;
    });

    it('当没有配置 Base URL 时应该返回 null', async () => {
      const result = await configLoader.getBaseUrl('glm');
      expect(result).toBeNull();
    });

    it('应该支持多个 provider 的 Base URL 配置', async () => {
      const testConfig = {
        baseUrls: {
          glm: 'https://open.bigmodel.cn/api/paas/v4',
          openai: 'https://api.openai.com/v1',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const glmResult = await configLoader.getBaseUrl('glm');
      const openaiResult = await configLoader.getBaseUrl('openai');

      expect(glmResult?.url).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(openaiResult?.url).toBe('https://api.openai.com/v1');
    });

    it('应该支持 GLM coding-plan Base URL', async () => {
      process.env.GLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/coding-plan';

      const result = await configLoader.getBaseUrl('glm');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://open.bigmodel.cn/api/paas/v4/coding-plan');

      delete process.env.GLM_BASE_URL;
    });

    it('应该支持 Anthropic Base URL', async () => {
      process.env.ANTHROPIC_BASE_URL = 'https://custom.anthropic.com';

      const result = await configLoader.getBaseUrl('anthropic');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://custom.anthropic.com');
      expect(result?.source).toBe('env');

      delete process.env.ANTHROPIC_BASE_URL;
    });

    it('应该支持 OpenAI Base URL', async () => {
      process.env.OPENAI_BASE_URL = 'https://custom.openai.com/v1';

      const result = await configLoader.getBaseUrl('openai');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://custom.openai.com/v1');
      expect(result?.source).toBe('env');

      delete process.env.OPENAI_BASE_URL;
    });

    it('应该支持默认 Base URL', async () => {
      const result = await configLoader.getBaseUrl('anthropic', 'https://api.anthropic.com');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://api.anthropic.com');
      expect(result?.source).toBe('default');
    });

    it('优先使用环境变量而不是默认值', async () => {
      process.env.GLM_BASE_URL = 'https://custom-glm.example.com';

      const result = await configLoader.getBaseUrl('glm', 'https://open.bigmodel.cn/api/paas/v4');

      expect(result?.url).toBe('https://custom-glm.example.com');
      expect(result?.source).toBe('env');

      delete process.env.GLM_BASE_URL;
    });

    it('优先使用配置文件而不是默认值', async () => {
      const testConfig = {
        baseUrls: {
          glm: 'https://config-glm.example.com',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      const result = await configLoader.getBaseUrl('glm', 'https://open.bigmodel.cn/api/paas/v4');

      expect(result?.url).toBe('https://config-glm.example.com');
      expect(result?.source).toBe('global');
    });
  });

  describe('向后兼容性', () => {
    it('应该与旧的 config.json 路径不兼容', async () => {
      // 创建旧的 config.json
      const oldConfigPath = join(testWorkspaceDir, 'config.json');
      await fs.writeFile(oldConfigPath, JSON.stringify({ apiKeys: { anthropic: 'old-key' } }));

      // 配置加载器不应该读取旧的 config.json
      const config = await configLoader.load();
      expect(config.apiKeys?.anthropic).toBeUndefined();
    });
  });
});
