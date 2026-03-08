/**
 * 全局配置加载器
 *
 * 支持三层配置优先级：
 * 1. 环境变量（向后兼容）
 * 2. 共享配置文件 (~/.agent-swarm/agent-swarm.json)
 * 3. Agent 专用配置 (agents/{agent-id}/config.json 中的 model.apiKey)
 */

import { getGlobalConfigPath } from './constants.js';
import * as FileOps from './utils/file-ops.js';

/**
 * 全局配置结构
 */
export interface GlobalConfig {
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    [key: string]: string | undefined;
  };
  baseUrls?: {
    anthropic?: string;
    openai?: string;
    glm?: string;
    [key: string]: string | undefined;
  };
  /**
   * 模型映射配置
   * 将请求的模型 ID 映射到实际的模型 ID
   * 例如: { "claude-sonnet-4-6": "glm-4.7" }
   */
  modelMapping?: Record<string, string>;
  workspace?: string;
}

/**
 * API 密钥来源
 */
export type ApiKeySource = 'env' | 'global' | 'agent';

/**
 * API 密钥解析结果
 */
export interface ApiKeyResult {
  key: string;
  source: ApiKeySource;
}

/**
 * Base URL 来源
 */
export type BaseUrlSource = 'env' | 'global' | 'default';

/**
 * Base URL 解析结果
 */
export interface BaseUrlResult {
  url: string;
  source: BaseUrlSource;
}

/**
 * 全局配置加载器
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: GlobalConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = getGlobalConfigPath();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * 设置配置路径（用于测试）
   */
  setConfigPath(path: string): void {
    this.configPath = path;
    this.config = null;
  }

  /**
   * 加载全局配置
   */
  async load(): Promise<GlobalConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      this.config = await FileOps.readJSON<GlobalConfig>(this.configPath);
      return this.config;
    } catch {
      // 配置文件不存在，返回空配置
      this.config = {};
      return this.config;
    }
  }

  /**
   * 获取 API 密钥（按优先级）
   *
   * 优先级：
   * 1. 环境变量 ANTHROPIC_API_KEY / OPENAI_API_KEY
   * 2. 全局配置 ~/.agent-swarm/agent-swarm.json
   * 3. Agent 专用配置（由调用方传入）
   */
  async getApiKey(provider: string, agentApiKey?: string): Promise<ApiKeyResult | null> {
    const providerKey = provider.toLowerCase();

    // 1. 检查环境变量
    const envKey = this.getEnvApiKey(providerKey);
    if (envKey) {
      return { key: envKey, source: 'env' };
    }

    // 2. 检查全局配置
    const globalConfig = await this.load();
    const globalKey = globalConfig.apiKeys?.[providerKey];
    if (globalKey) {
      return { key: globalKey, source: 'global' };
    }

    // 3. 检查 Agent 专用配置
    if (agentApiKey) {
      return { key: agentApiKey, source: 'agent' };
    }

    return null;
  }

  /**
   * 从环境变量获取 API 密钥
   */
  private getEnvApiKey(provider: string): string | undefined {
    const envMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      glm: 'GLM_API_KEY',
    };

    const envKey = envMap[provider];
    if (envKey) {
      return process.env[envKey];
    }

    // 支持自定义 provider 的环境变量
    return process.env[`${provider.toUpperCase()}_API_KEY`];
  }

  /**
   * 获取 Base URL（按优先级）
   *
   * 优先级：
   * 1. 环境变量 GLM_BASE_URL / OPENAI_BASE_URL / ANTHROPIC_BASE_URL
   * 2. 全局配置 ~/.agent-swarm/agent-swarm.json
   * 3. 默认值（如果配置了）
   */
  async getBaseUrl(provider: string, defaultUrl?: string): Promise<BaseUrlResult | null> {
    const providerKey = provider.toLowerCase();

    // 1. 检查环境变量
    const envUrl = this.getEnvBaseUrl(providerKey);
    if (envUrl) {
      return { url: envUrl, source: 'env' };
    }

    // 2. 检查全局配置
    const globalConfig = await this.load();
    const globalUrl = globalConfig.baseUrls?.[providerKey];
    if (globalUrl) {
      return { url: globalUrl, source: 'global' };
    }

    // 3. 使用默认值
    if (defaultUrl) {
      return { url: defaultUrl, source: 'default' };
    }

    return null;
  }

  /**
   * 从环境变量获取 Base URL
   */
  private getEnvBaseUrl(provider: string): string | undefined {
    const envMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_BASE_URL',
      openai: 'OPENAI_BASE_URL',
      glm: 'GLM_BASE_URL',
    };

    const envKey = envMap[provider];
    if (envKey) {
      return process.env[envKey];
    }

    // 支持自定义 provider 的环境变量
    return process.env[`${provider.toUpperCase()}_BASE_URL`];
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<GlobalConfig> {
    this.config = null;
    return this.load();
  }

  /**
   * 获取配置路径
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

/**
 * 导出单例获取函数
 */
export const getConfigLoader = (): ConfigLoader => ConfigLoader.getInstance();
