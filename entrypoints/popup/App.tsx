import { useState, useEffect, useRef } from 'react'
import { translateText } from '../../utils/translation'
import Settings from './Settings'
import {
  SunIcon,
  MoonIcon,
  ErrorIcon,
  SpeakerIcon,
  StopIcon,
  CopyIcon,
  CheckIcon,
  GithubIcon,
  SettingsIcon,
} from '../components/icons'

function App() {
  const [inputText, setInputText] = useState('')
  const [translation, setTranslation] = useState('')
  const [direction, setDirection] = useState<'zh' | 'en'>('zh')
  const [targetLang, setTargetLang] = useState<'zh' | 'en'>('en')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedService, setSelectedService] = useState<
    'google' | 'microsoft' | 'tencent' | 'openrouter'
  >('google')
  const [theme, setTheme] = useState('lemonade')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus textarea when '/' is pressed and no input is focused
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        e.preventDefault()
        textareaRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      // Stop speech if popup is closed
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    // Stop speech when translation changes
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [translation])

  useEffect(() => {
    // Load saved settings on mount
    browser.storage.local.get(['selectedService', 'theme']).then(res => {
      if (typeof res.selectedService === 'string') {
        setSelectedService(res.selectedService as any)
      }
      if (typeof res.theme === 'string') {
        setTheme(res.theme)
        // Apply theme to both html and body to ensure coverage
        document.documentElement.setAttribute('data-theme', res.theme)
      } else {
        document.documentElement.setAttribute('data-theme', 'lemonade')
      }
    })
  }, [])

  const handleServiceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newService = e.target.value as any
    setSelectedService(newService)
    await browser.storage.local.set({ selectedService: newService })

    // Auto-retranslate if there's text
    if (inputText.trim()) {
      handleTranslate(newService)
    }
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLang = e.target.checked ? 'zh' : 'en'
    setTargetLang(newLang)

    // Auto-retranslate if there's text
    if (inputText.trim()) {
      handleTranslate(undefined, newLang)
    }
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'lemonade' ? 'dracula' : 'lemonade'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    await browser.storage.local.set({ theme: newTheme })
  }

  const handleTranslate = async (
    serviceOverride?: 'google' | 'microsoft' | 'tencent' | 'openrouter',
    targetLangOverride?: 'zh' | 'en'
  ) => {
    if (!inputText.trim()) return

    setIsLoading(true)
    setError('')
    setTranslation('')

    try {
      const result = await translateText(
        inputText,
        serviceOverride || selectedService,
        targetLangOverride || targetLang
      )
      setTranslation(result.translation)
      setDirection(result.direction)
    } catch (err: any) {
      setError(err.message || '翻译出错')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (translation) {
      navigator.clipboard.writeText(translation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSpeak = () => {
    if (!translation) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(translation)
    // Target language is the result of the translation
    // If direction is en-to-zh, speak zh
    // If direction is zh-to-en, speak en
    utterance.lang = direction === 'zh' ? 'zh-CN' : 'en-US'

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleTranslate()
    }
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col font-sans relative shadow-inner">
      {/* Settings Overlay */}
      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4 shrink-0">
        <span className="text-base font-semibold opacity-80">中英直译助手</span>
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-circle btn-xs"
            onClick={toggleTheme}
            title="切换主题"
          >
            {theme === 'lemonade' ? (
              <SunIcon className="h-3 w-3" />
            ) : (
              <MoonIcon className="h-3 w-3" />
            )}
          </button>
          <button
            className="btn btn-ghost btn-circle btn-xs"
            onClick={() => setIsSettingsOpen(true)}
            title="设置"
          >
            <SettingsIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="p-4 pt-1 space-y-4 flex-1 overflow-y-auto">
        {/* Input Section */}
        <div className="form-control">
          <textarea
            autoFocus
            ref={textareaRef}
            className="textarea textarea-bordered w-full h-28 resize-none transition-colors"
            placeholder={`输入要翻译的文字到${
              targetLang === 'zh' ? '中文' : '英文'
            }... (Shift+Enter 快速翻译)`}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
        </div>

        {/* Action Section */}
        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm flex-1"
            value={selectedService}
            onChange={handleServiceChange}
          >
            <option value="google">Google 翻译</option>
            <option value="microsoft">Microsoft 翻译</option>
            <option value="tencent">腾讯交互翻译</option>
            <option value="openrouter">OpenRouter</option>
          </select>
          <button
            className="btn btn-outline btn-primary btn-sm flex-1"
            onClick={() => handleTranslate()}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : '翻译'}
          </button>
          <label className="swap swap-flip" title="切换目标语言">
            {/* this hidden checkbox controls the state */}
            <input type="checkbox" checked={targetLang === 'zh'} onChange={handleLanguageChange} />
            <div className="badge badge-accent swap-on text-sm">中</div>
            <div className="badge badge-info swap-off text-xs">EN</div>
          </label>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error shadow-sm py-2">
            <ErrorIcon className="stroke-current shrink-0 h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Result Section */}
        {translation && (
          <div className="card bg-base-200 shadow-inner group relative border border-base-300 overflow-hidden rounded-xl">
            <div className="card-body p-4 min-h-20 max-h-70 overflow-y-auto scrollbar-gutter-stable">
              <p className="text-sm whitespace-pre-wrap pr-2">{translation}</p>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className={`btn btn-ghost btn-xs btn-circle min-h-0 h-6 w-6 p-0 ${
                  isSpeaking ? 'text-primary' : ''
                }`}
                onClick={handleSpeak}
                title={isSpeaking ? '停止朗读' : '朗读'}
              >
                {isSpeaking ? (
                  <StopIcon className="h-3 w-3" />
                ) : (
                  <SpeakerIcon className="h-3 w-3" />
                )}
              </button>
              <button
                className="btn btn-ghost btn-xs btn-circle min-h-0 h-6 w-6 p-0"
                onClick={handleCopy}
                title="复制"
              >
                {copied ? (
                  <CheckIcon className="h-3 w-3 text-green-500 shrink-0" />
                ) : (
                  <CopyIcon className="h-3 w-3 shrink-0" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-2 bg-base-200 text-base-content border-t border-base-300 shrink-0 flex justify-between items-center">
        <p className="text-[10px] opacity-50">v{__APP_VERSION__} © 2026 Translate Extension</p>
        <a
          href="https://github.com/lovetingyuan/translate-extension"
          target="_blank"
          rel="noopener noreferrer"
          title="Github"
          className="hover:text-primary transition-colors opacity-50 hover:opacity-100 flex items-center"
        >
          <GithubIcon className="h-3.5 w-3.5" />
        </a>
      </footer>
    </div>
  )
}

export default App
