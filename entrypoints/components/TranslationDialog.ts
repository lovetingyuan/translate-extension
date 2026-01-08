/**
 * 翻译结果弹窗自定义元素
 */
export class TranslationDialog extends HTMLElement {
  private originalText: string;
  private translation: string;

  constructor(originalText: string, translation: string) {
    super();
    this.originalText = originalText;
    this.translation = translation;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  private render() {
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.3s ease-out;
        }

        dialog {
          position: relative;
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          max-width: 500px;
          width: 90%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transform: scale(0.8);
          opacity: 0;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out;
          user-select: none;
          -webkit-user-select: none;
        }


        dialog.show {
          transform: scale(1);
          opacity: 1;
        }

        .content {
          padding: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .original-section, .translation-section {
          background: rgba(255,255,255,0.1);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .translation-section {
          background: rgba(255,255,255,0.15);
        }

        .section-label {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .text {
          font-size: 16px;
          line-height: 1.5;
          user-select: text;
          -webkit-user-select: text;
        }


        .translation-text {
          font-weight: 500;
        }

        .tts-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .tts-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          flex: 1;
          border: none;
          color: white;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .copy-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
        }

        .copy-btn:hover {
          background: rgba(255,255,255,0.25);
        }

        .close-action-btn {
          background: white;
          color: #667eea;
          font-weight: 600;
        }

        .close-action-btn:hover {
          background: rgba(255,255,255,0.9);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>

      <div class="overlay"></div>
      <dialog>
        <div class="content">
          <div class="header">
            <h3 class="title">翻译结果</h3>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          
          <div class="original-section">
            <div class="section-label">
              <span>原文</span>
              <button class="tts-btn" id="tts-btn" title="朗读原文">🔊</button>
            </div>
            <div class="text" id="original-text"></div>
          </div>
          
          <div class="translation-section">
            <div class="section-label">翻译</div>
            <div class="text translation-text" id="translation-text"></div>
          </div>
          
          <div class="actions">
            <button class="action-btn copy-btn" id="copy-btn">复制翻译</button>
            <button class="action-btn close-action-btn" id="close-btn-2">关闭</button>
          </div>
        </div>
      </dialog>
    `;

    // 设置文本内容（使用textContent避免XSS）
    const originalEl = shadow.getElementById('original-text');
    const translationEl = shadow.getElementById('translation-text');
    if (originalEl) originalEl.textContent = this.originalText;
    if (translationEl) translationEl.textContent = this.translation;
  }

  private bindEvents() {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const dialog = shadow.querySelector('dialog');
    const closeBtn1 = shadow.getElementById('close-btn');
    const closeBtn2 = shadow.getElementById('close-btn-2');
    const overlay = shadow.querySelector('.overlay');
    const copyBtn = shadow.getElementById('copy-btn');
    const ttsBtn = shadow.getElementById('tts-btn');

    // 显示对话框
    if (dialog) {
      dialog.showModal();
      setTimeout(() => {
        dialog.classList.add('show');
      }, 10);
    }

    // 关闭对话框
    const closeDialog = () => {
      if (dialog) {
        dialog.classList.remove('show');
        setTimeout(() => {
          this.remove();
        }, 300);
      }
    };

    closeBtn1?.addEventListener('click', closeDialog);
    closeBtn2?.addEventListener('click', closeDialog);
    overlay?.addEventListener('click', closeDialog);

    // 点击对话框内部不关闭
    dialog?.addEventListener('click', (e: Event) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });

    // 复制按钮
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.translation);
        (copyBtn as HTMLButtonElement).textContent = '已复制！';
        setTimeout(() => {
          (copyBtn as HTMLButtonElement).textContent = '复制翻译';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    });

    // 朗读按钮
    ttsBtn?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.handleTTS(ttsBtn as HTMLButtonElement);
    });
  }

  private handleTTS(btn: HTMLButtonElement) {
    if (!('speechSynthesis' in window)) {
      alert('您的浏览器不支持语音合成功能');
      return;
    }

    const synthesis = window.speechSynthesis;

    if (synthesis.paused) {
      // 暂停中 -> 继续播放
      synthesis.resume();
      btn.textContent = '⏸';
    } else if (synthesis.speaking) {
      // 播放中 -> 暂停
      synthesis.pause();
      btn.textContent = '▶️';
    } else {
      // 空闲中 -> 开始播放
      const utterance = new SpeechSynthesisUtterance(this.originalText);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = () => {
        btn.textContent = '🔊';
      };

      utterance.onerror = () => {
        btn.textContent = '🔊';
      };

      synthesis.speak(utterance);
      btn.textContent = '⏸';
    }
  }

  disconnectedCallback() {
    // 组件被移除时停止语音播放
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

// 注册自定义元素
if (typeof window !== 'undefined' && window.customElements && !customElements.get('translation-dialog')) {
  customElements.define('translation-dialog', TranslationDialog);
}
