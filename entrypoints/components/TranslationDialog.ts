import { browser } from 'wxt/browser'
import { detectDirection } from '../../utils/translation'

/**
 * TranslationDialog Class
 * Encapsulates the translation result UI and interactions using Shadow DOM.
 */
export class TranslationDialog {
  private container: HTMLElement
  private shadowRoot: ShadowRoot
  private dialog: HTMLDialogElement | null = null
  private originalText: string = ''
  private translation: string = ''
  private direction: 'zh' | 'en' = 'zh'
  private service: 'google' | 'microsoft' | 'tencent' | 'openrouter' = 'google'
  private status: 'loading' | 'success' | 'error' = 'loading'
  private errorMessage: string = ''
  private isReadingOriginal: boolean = false
  private isReadingTranslation: boolean = false
  private isDialogExpanded: boolean = false
  private closingTimer: number | null = null
  public onClose?: () => void

  constructor() {
    // 创建一个宿主元素并附加 Shadow DOM
    this.container = document.createElement('div')
    this.container.id = 'translation-extension-root'
    this.shadowRoot = this.container.attachShadow({ mode: 'open' })
    document.body.appendChild(this.container)
    this.render()
  }

  /**
   * Initialize or update the dialog with loading state
   */
  public showLoading(originalText: string) {
    this.status = 'loading'
    this.originalText = originalText
    this.translation = ''
    this.isDialogExpanded = false
    this.direction = detectDirection(originalText)
    this.stopReading()
    this.loadSettings().then(() => {
      this.ensureInDocument()
      this.render()
      this.presentDialog()
    })
  }

  public updateSuccess(translation: string, direction?: 'zh' | 'en') {
    this.status = 'success'
    this.translation = translation
    if (direction) this.direction = direction
    this.ensureInDocument()
    this.render()
    this.presentDialog()
  }

  public updateError(message: string) {
    this.status = 'error'
    this.errorMessage = message
    this.ensureInDocument()
    this.render()
    this.presentDialog()
  }

  public showError(message: string) {
    this.status = 'error'
    this.errorMessage = message
    this.translation = ''
    this.ensureInDocument()
    this.render()
    this.presentDialog()
  }

  public showDetail(
    originalText: string,
    translation: string,
    direction?: 'zh' | 'en'
  ) {
    this.status = 'success'
    this.originalText = originalText
    this.translation = translation
    this.isDialogExpanded = false
    this.direction = direction || detectDirection(originalText)
    this.loadSettings().then(() => {
      this.ensureInDocument()
      this.render()
      this.presentDialog()
    })
  }

  private presentDialog() {
    const isClosing = this.closingTimer !== null
    if (this.closingTimer) {
      clearTimeout(this.closingTimer)
      this.closingTimer = null
    }
    if (this.dialog) {
      if (!this.dialog.open) {
        this.dialog.showModal()
        this.animateIn()
      } else if (isClosing) {
        this.animateIn()
      }
    }
  }

  private async loadSettings() {
    try {
      const result = await browser.storage.local.get(['selectedService'])
      this.service =
        (result.selectedService as 'google' | 'microsoft' | 'tencent' | 'openrouter') || 'google'
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load settings:', err)
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private animateIn() {
    if (!this.dialog) return
    this.dialog.style.transform = 'scale(0.8)'
    this.dialog.style.opacity = '0'
    this.dialog.classList.remove('backdrop-active')
    setTimeout(() => {
      if (this.dialog) {
        this.dialog.style.transition =
          'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out'
        this.dialog.style.transform = 'scale(1)'
        this.dialog.style.opacity = '1'
        this.dialog.classList.add('backdrop-active')
      }
    }, 10)
  }

  private ensureInDocument() {
    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container)
    }
  }

  private closeDialog() {
    if (!this.dialog) return
    this.abortOngoingTranslation()
    this.stopReading()

    if (this.closingTimer) {
      clearTimeout(this.closingTimer)
    }

    this.dialog.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in'
    this.dialog.style.transform = 'scale(0.8)'
    this.dialog.style.opacity = '0'
    this.dialog.classList.remove('backdrop-active')
    this.closingTimer = window.setTimeout(() => {
      this.dialog?.close()
      this.closingTimer = null
      this.onClose?.()
    }, 150)
  }

  private abortOngoingTranslation() {
    browser.runtime.sendMessage({ action: 'abortTranslation' }).catch(() => {})
  }

  private async copyToClipboard(text: string, btn: HTMLButtonElement) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      const originalInner = btn.innerHTML
      btn.innerHTML = '✅'
      setTimeout(() => {
        btn.innerHTML = originalInner
      }, 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '0'
      this.shadowRoot.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        if (document.execCommand('copy')) {
          const originalInner = btn.innerHTML
          btn.innerHTML = '✅'
          setTimeout(() => {
            btn.innerHTML = originalInner
          }, 2000)
        }
      } catch (copyErr) {
        if (import.meta.env.DEV) console.error('Fallback copy failed:', copyErr)
      }
      this.shadowRoot.removeChild(textArea)
    }
  }

  private stopReading() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    this.isReadingOriginal = false
    this.isReadingTranslation = false
  }

  private async performTranslation() {
    this.abortOngoingTranslation()
    this.stopReading()
    this.status = 'loading'
    this.render()

    try {
      const response = await browser.runtime.sendMessage({
        action: 'translate',
        text: this.originalText,
        service: this.service,
        direction: this.direction,
      })

      if (response.success) {
        this.updateSuccess(response.translation, this.direction)
      } else if (!response.isAbort) {
        this.updateError(response.error || '翻译失败')
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('AbortError') || err.message.includes('message channel closed'))
      )
        return
      this.updateError('翻译失败，请重试')
    }
  }

  private render() {
    const bgColor = '#222222'

    if (!this.dialog) {
      this.shadowRoot.innerHTML = `
        <style>
          dialog {
            border: none; border-radius: 12px; padding: 0; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 500px; width: 90%; color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: fixed; margin: auto; inset: 0;
            user-select: none; -webkit-user-select: none; outline: none;
            max-height: 85vh; overflow: hidden !important;
            transition: all 0.3s ease;
          }
          dialog.expanded {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100vh;
            border-radius: 0;
          }
          dialog.expanded .container {
            max-height: 100vh;
          }
          dialog[open] {
            display: flex; flex-direction: column;
          }
          dialog::backdrop {
            background: rgba(0, 0, 0, 0);
            transition: background 0.15s ease-in;
          }
          dialog.backdrop-active::backdrop {
            background: rgba(0, 0, 0, 0.5);
            transition: background 0.4s ease-out;
          }
          .container {
            padding: 20px;
            height: 100%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
          }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
          .title-container { display: flex; align-items: center; gap: 8px; }
          .app-icon { width: 24px; height: 24px; border-radius: 6px; }
          .header h3 { margin: 0; font-size: 18px; font-weight: 600; }
          .expand-btn {
            background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px;
            border-radius: 50%; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center;
            transition: background 0.2s;
          }
          .expand-btn:hover { background: rgba(255,255,255,0.4); }
          .close-btn {
            background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px;
            border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;
            transition: background 0.2s;
          }
          .close-btn:hover { background: rgba(255,255,255,0.4); }
          .settings-row { display: flex; gap: 16px; margin-bottom: 16px; flex-shrink: 0; }
          .setting-item { flex: 1; }
          .label { font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 1px; }
          .direction-btns { display: flex; gap: 8px; }
          .direction-btn {
            flex: 1; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer;
            font-size: 14px; font-weight: 500; transition: all 0.2s; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          }
          .direction-btn:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); }
          .direction-btn.active { background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5); }
          .direction-btn.active:hover { background: rgba(255,255,255,0.4); }
          select {
            width: 100%; padding: 8px 12px; border-radius: 6px; border: none; background: rgba(255,255,255,0.2);
            color: white; font-size: 14px; cursor: pointer; outline: none;
            user-select: none;
          }
          select option { background: #333; color: white; }
          .content-box {
            background: rgba(255,255,255,0.1);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          .content-box.original {
            flex: 0 0 auto;
            max-height: 20vh;
            margin-bottom: 12px;
          }
          .content-box.translation {
            background: rgba(255,255,255,0.15);
            margin-bottom: 0;
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .box-header { font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
          .text-content { font-size: 16px; line-height: 1.5; user-select: text; -webkit-user-select: text; word-break: break-word; flex-grow: 1; overflow-y: auto; }
          .text-content.scrollable {
            overflow-y: auto;
          }
          .text-container {
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
          }
          /* Custom scrollbar */
          .text-content::-webkit-scrollbar { width: 6px; }
          .text-content::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
          .text-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
          .text-content::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
          .icon-btn {
            background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px;
            border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
          }
          .icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.4); }
          .icon-btn:active:not(:disabled) { background: rgba(255,255,255,0.5); }
          .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .footer-btn { flex: 1; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
          .btn-outline { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; }
          .btn-primary { background: white; color: #667eea; }
          @keyframes spin { to { transform: rotate(360deg); } }
          #translation-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
          }
          #dialog-inner-content {
            height: 100%;
          }
        </style>
        <dialog id="translation-dialog">
          <div id="dialog-inner-content"></div>
        </dialog>
      `
      this.dialog = this.shadowRoot.getElementById('translation-dialog') as HTMLDialogElement
    }

    this.dialog.style.background = bgColor
    if (this.isDialogExpanded) {
      this.dialog.classList.add('expanded')
    } else {
      this.dialog.classList.remove('expanded')
    }
    const innerContent = this.shadowRoot.getElementById('dialog-inner-content')
    if (innerContent) {
      innerContent.innerHTML = `
        <div class="container">
          <div class="header">
            <div class="title-container">
              <img src="${browser.runtime.getURL('/icon.svg')}" class="app-icon" alt="icon" />
              <h3>${this.status === 'error' && !this.translation ? '翻译失败' : '中英直译'}</h3>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="expand-btn" id="expand-btn" title="${
                this.isDialogExpanded ? '还原' : '全屏'
              }">
                ${this.isDialogExpanded ? '⇲' : '⤢'}
              </button>
              <button class="close-btn" id="close-btn">×</button>
            </div>
          </div>
          <div class="settings-row">
            <div class="setting-item">
              <div class="direction-btns">
                <button class="direction-btn ${
                  this.direction === 'en' ? 'active' : ''
                }" data-direction="en">到英文</button>
                <button class="direction-btn ${
                  this.direction === 'zh' ? 'active' : ''
                }" data-direction="zh">到中文</button>
              </div>
            </div>
            <div class="setting-item" style="width: 50%;">
              <select id="service-select">
                <option value="google" ${
                  this.service === 'google' ? 'selected' : ''
                }>Google 翻译</option>
                <option value="microsoft" ${
                  this.service === 'microsoft' ? 'selected' : ''
                }>Microsoft 翻译</option>
                <option value="tencent" ${
                  this.service === 'tencent' ? 'selected' : ''
                }>腾讯翻译</option>
                <option value="openrouter" ${
                  this.service === 'openrouter' ? 'selected' : ''
                }>OpenRouter</option>
              </select>
            </div>
          </div>
          <div class="content-box original">
            <div class="box-header">
              <span>原文</span>
              <div style="display: flex; gap: 8px;">
                <button class="icon-btn" id="tts-btn">${
                  this.isReadingOriginal ? '⏹' : '🔊'
                }</button>
                <button class="icon-btn" id="youdao-btn" title="在有道词典中查看">🔍</button>
              </div>
            </div>
            <div class="text-container">
              <div id="original-text-content" class="text-content scrollable">${this.escapeHtml(
                this.originalText
              )}</div>
            </div>
          </div>
          <div class="content-box translation">
            <div class="box-header">
              <span>翻译</span>
              <div style="display: flex; gap: 8px;">
                <button class="icon-btn" id="tts-translation-btn" ${
                  this.status === 'loading' || !this.translation ? 'disabled' : ''
                }>${this.isReadingTranslation ? '⏹' : '🔊'}</button>
                <button class="icon-btn" id="quick-copy-btn" ${
                  this.status === 'loading' || !this.translation ? 'disabled' : ''
                }>📋</button>
              </div>
            </div>
            <div id="translation-body">
              ${
                this.status === 'loading'
                  ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                  <span>正在翻译...</span>
                </div>
              `
                  : this.status === 'success'
                  ? `
                <div class="text-content">${this.escapeHtml(this.translation)}</div>
              `
                  : `
                <div style="color: #ff6b6b; display: flex; align-items: center; gap: 8px;">
                  <span>✕</span><span>${this.escapeHtml(this.errorMessage)}</span>
                </div>
              `
              }
            </div>
          </div>
        </div>
      `
    }
    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.dialog) return

    const expandBtn = this.shadowRoot.getElementById('expand-btn')
    if (expandBtn) {
      expandBtn.onclick = () => {
        this.isDialogExpanded = !this.isDialogExpanded
        this.render()
      }
    }

    this.shadowRoot.querySelectorAll('#close-btn, #close-btn-2, #close-btn-error').forEach(btn => {
      btn.addEventListener('click', () => this.closeDialog())
    })
    this.dialog.onclick = e => {
      if (e.target === this.dialog) this.closeDialog()
    }
    this.dialog.onclose = () => {
      this.closeDialog()
    }
    this.shadowRoot.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const newDir = (e.currentTarget as HTMLElement).getAttribute('data-direction') as any
        if (newDir !== this.direction) {
          this.direction = newDir
          this.performTranslation()
        }
      })
    })
    const select = this.shadowRoot.getElementById('service-select') as HTMLSelectElement
    if (select)
      select.onchange = e => {
        this.service = (e.target as any).value
        browser.storage.local.set({ selectedService: this.service })
        this.performTranslation()
      }
    const youdaoBtn = this.shadowRoot.getElementById('youdao-btn')
    if (youdaoBtn)
      youdaoBtn.onclick = () => {
        window.open(
          `https://www.youdao.com/result?word=${encodeURIComponent(this.originalText)}&lang=en`,
          '_blank'
        )
      }

    const ttsBtn = this.shadowRoot.getElementById('tts-btn')
    if (ttsBtn)
      ttsBtn.onclick = () => {
        const synthesis = window.speechSynthesis
        if (this.isReadingOriginal) {
          synthesis.cancel()
          this.isReadingOriginal = false
          this.isReadingTranslation = false
          this.render()
        } else {
          synthesis.cancel()
          this.isReadingTranslation = false
          const u = new SpeechSynthesisUtterance(this.originalText)
          u.lang = this.direction === 'zh' ? 'en-US' : 'zh-CN'
          u.onstart = () => {
            this.isReadingOriginal = true
            this.render()
          }
          u.onend = () => {
            this.isReadingOriginal = false
            this.render()
          }
          u.onerror = () => {
            this.isReadingOriginal = false
            this.render()
          }
          synthesis.speak(u)
        }
      }

    const ttsTranslationBtn = this.shadowRoot.getElementById('tts-translation-btn')
    if (ttsTranslationBtn)
      ttsTranslationBtn.onclick = () => {
        if (this.status === 'loading' || !this.translation) return
        const synthesis = window.speechSynthesis
        if (this.isReadingTranslation) {
          synthesis.cancel()
          this.isReadingTranslation = false
          this.isReadingOriginal = false
          this.render()
        } else {
          synthesis.cancel()
          this.isReadingOriginal = false
          const u = new SpeechSynthesisUtterance(this.translation)
          u.lang = this.direction === 'zh' ? 'zh-CN' : 'en-US'
          u.onstart = () => {
            this.isReadingTranslation = true
            this.render()
          }
          u.onend = () => {
            this.isReadingTranslation = false
            this.render()
          }
          u.onerror = () => {
            this.isReadingTranslation = false
            this.render()
          }
          synthesis.speak(u)
        }
      }

    const copyBtn = this.shadowRoot.getElementById('copy-btn')
    const quickCopyBtn = this.shadowRoot.getElementById('quick-copy-btn')
    ;[copyBtn, quickCopyBtn].forEach(btn => {
      if (btn) btn.onclick = () => this.copyToClipboard(this.translation, btn as HTMLButtonElement)
    })
  }
}
