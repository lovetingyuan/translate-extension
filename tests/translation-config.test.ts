import { describe, expect, it } from 'vitest'

import {
  TRANSLATION_SERVICE_IDS,
  TRANSLATION_SERVICE_OPTIONS,
  getVisibleTranslationServiceOptions,
} from '../utils/translation'

describe('translation service configuration', () => {
  it('exposes only the supported service ids', () => {
    expect(TRANSLATION_SERVICE_IDS).toEqual([
      'google',
      'microsoft',
      'deepl',
      'openrouter',
    ])
  })

  it('exposes only the visible service options', () => {
    const visibleOptions = getVisibleTranslationServiceOptions([])
    const expectedServiceIds = ['google', 'microsoft', 'deepl', 'openrouter']

    expect(visibleOptions.map(option => option.id)).toEqual(expectedServiceIds)
    expect(TRANSLATION_SERVICE_OPTIONS.map(option => option.id)).toEqual(expectedServiceIds)
  })
})
