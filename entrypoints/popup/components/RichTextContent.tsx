import { sanitizeRichTextHtml } from '../../../utils/richTextDom'
import type { TranslationContentFormat } from '../../../utils/richText'

interface RichTextContentProps {
  className?: string
  format: TranslationContentFormat
  html: string | undefined
  text: string
}

/**
 * Keeps popup result rendering aligned with the in-page dialog by preferring
 * sanitized rich-text HTML and falling back to plain text with preserved
 * newlines when providers do not return structured markup.
 */
export const RichTextContent = ({
  className = '',
  format,
  html,
  text,
}: RichTextContentProps) => {
  const baseClassName =
    'text-sm leading-6 break-words [&_a]:link [&_blockquote]:border-l-2 [&_blockquote]:border-base-300 [&_blockquote]:pl-3 [&_blockquote]:text-base-content/75 [&_blockquote]:my-3 [&_em]:italic [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_li]:ml-5 [&_li]:list-item [&_li+li]:mt-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-1 [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-1'
  const contentClassName = `${baseClassName} ${className}`.trim()

  if (format === 'html' && html) {
    return (
      <div
        className={contentClassName}
        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(html) }}
      />
    )
  }

  return <p className={`${contentClassName} whitespace-pre-wrap`}>{text}</p>
}
