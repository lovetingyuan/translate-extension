import { describe, expect, it, vi } from 'vitest'

import { getInlineApiKeyPrompt, saveInlineApiKeyAndRetry } from '../utils/inlineApiKey'

describe('getInlineApiKeyPrompt', () => {
  it('recognizes DeepL missing-key errors as inline-fixable', () => {
    expect(getInlineApiKeyPrompt('deepl', 'DeepL API Key 未配置，请先在设置中填写')).toEqual({
      keyUrl: 'https://www.deepl.com/zh/your-account/keys',
      service: 'deepl',
      storageKey: 'deeplApiKey',
      placeholder: 'deepl-api-key',
      saveButtonText: '保存',
    })
  })

  it('recognizes OpenRouter missing-key errors as inline-fixable', () => {
    expect(
      getInlineApiKeyPrompt('openrouter', 'OpenRouter API Key 未配置，请先输入并保存'),
    ).toEqual({
      keyUrl: 'https://openrouter.ai/keys',
      service: 'openrouter',
      storageKey: 'openRouterApiKey',
      placeholder: 'sk-or-...',
      saveButtonText: '保存',
    })
  })

  it('does not treat ordinary provider failures as inline key prompts', () => {
    expect(getInlineApiKeyPrompt('deepl', 'DeepL请求失败: 403')).toBeNull()
    expect(getInlineApiKeyPrompt('google', 'GoogleHtml翻译请求失败: 500')).toBeNull()
  })
})

describe('saveInlineApiKeyAndRetry', () => {
  it('saves the trimmed DeepL key and retries only that service', async () => {
    const storage = {
      set: vi.fn<(items: Record<string, string>) => Promise<void>>().mockResolvedValue(undefined),
    }
    const retry = vi.fn<(service: string) => Promise<void>>().mockResolvedValue(undefined)

    await saveInlineApiKeyAndRetry({
      service: 'deepl',
      value: '  deepl-key  ',
      storage,
      retry,
    })

    expect(storage.set).toHaveBeenCalledWith({ deeplApiKey: 'deepl-key' })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(retry).toHaveBeenCalledWith('deepl')
  })

  it('saves the trimmed OpenRouter key and retries only that service', async () => {
    const storage = {
      set: vi.fn<(items: Record<string, string>) => Promise<void>>().mockResolvedValue(undefined),
    }
    const retry = vi.fn<(service: string) => Promise<void>>().mockResolvedValue(undefined)

    await saveInlineApiKeyAndRetry({
      service: 'openrouter',
      value: '  sk-or-test  ',
      storage,
      retry,
    })

    expect(storage.set).toHaveBeenCalledWith({ openRouterApiKey: 'sk-or-test' })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(retry).toHaveBeenCalledWith('openrouter')
  })

  it('does not retry when persistence fails', async () => {
    const storage = {
      set: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('保存失败')),
    }
    const retry = vi.fn<(service: string) => Promise<void>>().mockResolvedValue(undefined)

    await expect(
      saveInlineApiKeyAndRetry({
        service: 'openrouter',
        value: 'sk-or-test',
        storage,
        retry,
      }),
    ).rejects.toThrow('保存失败')

    expect(retry).not.toHaveBeenCalled()
  })
})
