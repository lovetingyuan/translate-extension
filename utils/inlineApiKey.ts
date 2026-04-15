import type { TranslationServiceId } from './translation'

export type InlineApiKeyService = 'deepl' | 'openrouter'

interface InlineApiKeyStorage {
  set: (items: Record<string, string>) => Promise<void>
}

interface SaveInlineApiKeyOptions {
  service: InlineApiKeyService
  value: string
  storage: InlineApiKeyStorage
  retry: (service: InlineApiKeyService) => Promise<void>
}

export interface InlineApiKeyPrompt {
  keyUrl: string
  service: InlineApiKeyService
  storageKey: 'deeplApiKey' | 'openRouterApiKey'
  placeholder: string
  saveButtonText: string
}

const INLINE_API_KEY_PROMPTS: Record<InlineApiKeyService, InlineApiKeyPrompt> = {
  deepl: {
    keyUrl: 'https://www.deepl.com/zh/your-account/keys',
    service: 'deepl',
    storageKey: 'deeplApiKey',
    placeholder: 'deepl-api-key',
    saveButtonText: '保存',
  },
  openrouter: {
    keyUrl: 'https://openrouter.ai/keys',
    service: 'openrouter',
    storageKey: 'openRouterApiKey',
    placeholder: 'sk-or-...',
    saveButtonText: '保存',
  },
}

/**
 * 只把已知的“缺少 API Key” provider 错误提升为可内联修复状态，避免普通网络
 * 或鉴权错误错误地显示输入框，导致用户在错误的上下文里修改配置。
 */
export const getInlineApiKeyPrompt = (
  service: TranslationServiceId,
  errorMessage: string,
): InlineApiKeyPrompt | null => {
  if (service === 'deepl' && errorMessage.includes('DeepL API Key 未配置')) {
    return INLINE_API_KEY_PROMPTS.deepl
  }

  if (service === 'openrouter' && errorMessage.includes('OpenRouter API Key 未配置')) {
    return INLINE_API_KEY_PROMPTS.openrouter
  }

  return null
}

/**
 * 将 dialog 内联表单与 popup 使用的同一份存储键对齐，并在保存成功后只重试
 * 当前缺 key 的 provider，避免刷新其它已经成功的结果卡片。
 */
export const saveInlineApiKeyAndRetry = async ({
  service,
  value,
  storage,
  retry,
}: SaveInlineApiKeyOptions): Promise<void> => {
  const prompt = INLINE_API_KEY_PROMPTS[service]
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    throw new Error('请输入 API Key')
  }

  await storage.set({ [prompt.storageKey]: normalizedValue })
  await retry(service)
}
