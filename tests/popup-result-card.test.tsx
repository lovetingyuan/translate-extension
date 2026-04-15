import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ResultCard } from '../entrypoints/popup/components/ResultCard'
import type { TranslationResultItem } from '../utils/translation'

const sanitizeRichTextHtmlMock = vi.fn((value: string) => value)

vi.mock('../utils/richTextDom', () => ({
  sanitizeRichTextHtml: (value: string) => sanitizeRichTextHtmlMock(value),
}))

const buildSuccessResult = (
  overrides: Partial<TranslationResultItem> = {},
): TranslationResultItem => ({
  service: 'google',
  serviceLabel: 'Google',
  status: 'success',
  translation: '第一段\n第二段',
  translationHtml: '<p>第一段</p><p><strong>第二段</strong></p>',
  contentFormat: 'html',
  error: '',
  direction: 'zh',
  ...overrides,
})

describe('ResultCard', () => {
  beforeEach(() => {
    sanitizeRichTextHtmlMock.mockClear()
  })

  it('renders rich-text translation html instead of flattening popup results to plain text', () => {
    const markup = renderToStaticMarkup(
      <ResultCard
        result={buildSuccessResult()}
        service="google"
        copiedService={null}
        speakingService={null}
        onRetry={() => undefined}
        onCopy={() => undefined}
        onSpeak={() => undefined}
      />,
    )

    expect(sanitizeRichTextHtmlMock).toHaveBeenCalledWith(
      '<p>第一段</p><p><strong>第二段</strong></p>',
    )
    expect(markup).toContain('<strong>第二段</strong>')
    expect(markup).toContain('<p>第一段</p>')
  })

  it('keeps plain-text fallback rendering with preserved newlines when no html result exists', () => {
    const markup = renderToStaticMarkup(
      <ResultCard
        result={buildSuccessResult({
          translation: '第一行\n第二行',
          translationHtml: undefined,
          contentFormat: 'plain',
        })}
        service="google"
        copiedService={null}
        speakingService={null}
        onRetry={() => undefined}
        onCopy={() => undefined}
        onSpeak={() => undefined}
      />,
    )

    expect(sanitizeRichTextHtmlMock).not.toHaveBeenCalled()
    expect(markup).toContain('whitespace-pre-wrap')
    expect(markup).toContain('第一行')
    expect(markup).toContain('第二行')
  })
})
