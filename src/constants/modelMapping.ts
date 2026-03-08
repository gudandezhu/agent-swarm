/**
 * 模型映射常量
 */

/**
 * 默认模型映射配置
 */
export const DEFAULT_MODEL_MAPPING: Record<string, string> = {
  // Claude → GLM 默认映射
  'claude-opus-4-5': 'glm-5',
  'claude-sonnet-4-6': 'glm-4.7',
  'claude-haiku-4-5': 'glm-4-flash',
};

/**
 * 支持的模型提供商
 */
export const SUPPORTED_PROVIDERS = ['anthropic', 'openai', 'zhipu'] as const;

/**
 * 智谱 AI 可用的模型
 */
export const ZHIPU_AVAILABLE_MODELS = [
  'glm-5',
  'glm-4.7',
  'glm-4',
  'glm-4-flash',
  'glm-4-plus',
] as const;
