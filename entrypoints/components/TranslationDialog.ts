import { browser } from "wxt/browser";

/**
 * TranslationDialog Class
 * Encapsulates the translation result UI and interactions using Shadow DOM.
 */
export class TranslationDialog {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private dialog: HTMLDialogElement | null = null;
  private originalText: string = "";
  private translation: string = "";
  private direction: "en-to-zh" | "zh-to-en" = "en-to-zh";
  private service: "google" | "microsoft" | "tencent" = "google";
  private status: "loading" | "success" | "error" = "loading";
  private errorMessage: string = "";
  private isReadingOriginal: boolean = false;
  private isReadingTranslation: boolean = false;

  constructor() {
    // 创建一个宿主元素并附加 Shadow DOM
    this.container = document.createElement("div");
    this.container.id = "translation-extension-root";
    this.shadowRoot = this.container.attachShadow({ mode: "open" });
    document.body.appendChild(this.container);
    this.render();
  }

  /**
   * Initialize or update the dialog with loading state
   */
  public showLoading(originalText: string) {
    this.status = "loading";
    this.originalText = originalText;
    this.translation = "";
    this.direction = this.detectDirection(originalText);
    this.stopReading();
    this.loadSettings().then(() => {
      this.ensureInDocument();
      this.render();
      if (this.dialog && !this.dialog.open) {
        this.dialog.showModal();
        this.animateIn();
      }
    });
  }

  public updateSuccess(translation: string, direction?: "en-to-zh" | "zh-to-en") {
    this.status = "success";
    this.translation = translation;
    if (direction) this.direction = direction;
    this.ensureInDocument();
    this.render();
    if (this.dialog && !this.dialog.open) {
      this.dialog.showModal();
      this.animateIn();
    }
  }

  public updateError(message: string) {
    this.status = "error";
    this.errorMessage = message;
    this.ensureInDocument();
    this.render();
    if (this.dialog && !this.dialog.open) {
      this.dialog.showModal();
      this.animateIn();
    }
  }

  public showError(message: string) {
    this.status = "error";
    this.errorMessage = message;
    this.translation = "";
    this.ensureInDocument();
    this.render();
    if (this.dialog && !this.dialog.open) {
      this.dialog.showModal();
      this.animateIn();
    }
  }

  public showDetail(
    originalText: string,
    translation: string,
    direction?: "en-to-zh" | "zh-to-en",
  ) {
    this.status = "success";
    this.originalText = originalText;
    this.translation = translation;
    this.direction = direction || this.detectDirection(originalText);
    this.loadSettings().then(() => {
      this.ensureInDocument();
      this.render();
      if (this.dialog && !this.dialog.open) {
        this.dialog.showModal();
        this.animateIn();
      }
    });
  }

  private async loadSettings() {
    try {
      const result = await browser.storage.local.get(["selectedService"]);
      this.service = (result.selectedService as "google" | "microsoft" | "tencent") || "google";
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to load settings:", err);
    }
  }

  private detectDirection(text: string): "en-to-zh" | "zh-to-en" {
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
    return englishCount > 0 ? "en-to-zh" : "zh-to-en";
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private animateIn() {
    if (!this.dialog) return;
    this.dialog.style.transform = "scale(0.8)";
    this.dialog.style.opacity = "0";
    setTimeout(() => {
      if (this.dialog) {
        this.dialog.style.transition =
          "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out";
        this.dialog.style.transform = "scale(1)";
        this.dialog.style.opacity = "1";
      }
    }, 10);
  }

  private ensureInDocument() {
    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }
  }

  private closeDialog() {
    if (!this.dialog) return;
    this.abortOngoingTranslation();
    this.stopReading();

    this.dialog.style.transition = "transform 0.3s ease-in, opacity 0.3s ease-in";
    this.dialog.style.transform = "scale(0.8)";
    this.dialog.style.opacity = "0";
    setTimeout(() => {
      this.dialog?.close();
      // 不要移除 container，只移除 innerHTML 或让它保持原样
      // this.container.remove();
    }, 300);
  }

  private abortOngoingTranslation() {
    browser.runtime.sendMessage({ action: "abortTranslation" }).catch(() => {});
  }

  private async copyToClipboard(text: string, btn: HTMLButtonElement) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const originalInner = btn.innerHTML;
      btn.innerHTML = "✅";
      setTimeout(() => {
        btn.innerHTML = originalInner;
      }, 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      this.shadowRoot.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        if (document.execCommand("copy")) {
          const originalInner = btn.innerHTML;
          btn.innerHTML = "✅";
          setTimeout(() => {
            btn.innerHTML = originalInner;
          }, 2000);
        }
      } catch (copyErr) {
        if (import.meta.env.DEV) console.error("Fallback copy failed:", copyErr);
      }
      this.shadowRoot.removeChild(textArea);
    }
  }

  private stopReading() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isReadingOriginal = false;
    this.isReadingTranslation = false;
  }

  private async performTranslation() {
    this.abortOngoingTranslation();
    this.stopReading();
    this.status = "loading";
    this.render();

    try {
      const response = await browser.runtime.sendMessage({
        action: "translate",
        text: this.originalText,
        service: this.service,
        direction: this.direction,
      });

      if (response.success) {
        this.updateSuccess(response.translation, this.direction);
      } else if (!response.isAbort) {
        this.updateError(response.error || "翻译失败");
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes("AbortError") || err.message.includes("message channel closed"))
      )
        return;
      this.updateError("翻译失败，请重试");
    }
  }

  private render() {
    const isError = this.status === "error" && !this.translation;
    const bgGradient = isError
      ? "linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)"
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

    if (!this.dialog) {
      this.shadowRoot.innerHTML = `
        <style>
          dialog {
            border: none; border-radius: 12px; padding: 0; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 500px; width: 90%; color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: fixed; margin: auto; inset: 0;
            user-select: none; -webkit-user-select: none; outline: none;
            max-height: 90vh; overflow-y: auto;
          }
          dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
          .container { padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .header h3 { margin: 0; font-size: 18px; font-weight: 600; }
          .close-btn {
            background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px;
            border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;
            transition: background 0.2s;
          }
          .close-btn:hover { background: rgba(255,255,255,0.4); }
          .settings-row { display: flex; gap: 16px; margin-bottom: 16px; }
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
          }
          select option { background: #667eea; color: white; }
          .content-box { background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px; }
          .content-box.translation { background: rgba(255,255,255,0.15); margin-bottom: 0; }
          .box-header { font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
           .text-content { font-size: 16px; line-height: 1.5; user-select: text; -webkit-user-select: text; }
            .icon-btn {
              background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px;
              border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
              transition: all 0.2s;
            }
            .icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.4); }
            .icon-btn:active:not(:disabled) { background: rgba(255,255,255,0.5); }
            .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
           .footer-btn { flex: 1; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
           .btn-outline { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; }
           .btn-primary { background: white; color: #667eea; }
           @keyframes spin { to { transform: rotate(360deg); } }
         </style>
        <dialog id="translation-dialog">
          <div id="dialog-inner-content"></div>
        </dialog>
      `;
      this.dialog = this.shadowRoot.getElementById("translation-dialog") as HTMLDialogElement;
    }

    this.dialog.style.background = bgGradient;
    const innerContent = this.shadowRoot.getElementById("dialog-inner-content");
    if (innerContent) {
      innerContent.innerHTML = `
        <div class="container">
          <div class="header">
            <h3>${this.status === "error" && !this.translation ? "翻译失败" : "翻译结果"}</h3>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          ${
            this.status !== "error" || this.translation
              ? `
            <div class="settings-row">
              <div class="setting-item">
                <div class="direction-btns">
                  <button class="direction-btn ${
                    this.direction === "zh-to-en" ? "active" : ""
                  }" data-direction="zh-to-en">中译英</button>
                  <button class="direction-btn ${
                    this.direction === "en-to-zh" ? "active" : ""
                  }" data-direction="en-to-zh">英译中</button>
                </div>
              </div>
              <div class="setting-item" style="width: 50%;">
                <select id="service-select">
                  <option value="google" ${
                    this.service === "google" ? "selected" : ""
                  }>Google 翻译</option>
                  <option value="microsoft" ${
                    this.service === "microsoft" ? "selected" : ""
                  }>Microsoft 翻译</option>
                  <option value="tencent" ${
                    this.service === "tencent" ? "selected" : ""
                  }>腾讯翻译</option>
                </select>
              </div>
            </div>
            <div class="content-box">
              <div class="box-header"><span>原文</span><button class="icon-btn" id="tts-btn">${
                this.isReadingOriginal ? "⏹" : "🔊"
              }</button></div>
              <div class="text-content">${this.escapeHtml(this.originalText)}</div>
            </div>
            <div class="content-box translation">
              <div class="box-header">
                <span>翻译</span>
                <div style="display: flex; gap: 8px;">
                  <button class="icon-btn" id="tts-translation-btn" ${
                    this.status === "loading" || !this.translation ? "disabled" : ""
                  }>${this.isReadingTranslation ? "⏹" : "🔊"}</button>
                  <button class="icon-btn" id="quick-copy-btn" ${
                    this.status === "loading" || !this.translation ? "disabled" : ""
                  }>📋</button>
                </div>
              </div>
              <div id="translation-body">
                ${
                  this.status === "loading"
                    ? `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span>正在翻译...</span>
                  </div>
                `
                    : this.status === "success"
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
          `
              : `
            <div class="content-box">
              <div style="color: #ff6b6b; display: flex; align-items: center; gap: 8px;">
                <span>✕</span><span>${this.escapeHtml(this.errorMessage)}</span>
              </div>
            </div>
          `
          }
        </div>
      `;
    }
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.dialog) return;
    this.shadowRoot
      .querySelectorAll("#close-btn, #close-btn-2, #close-btn-error")
      .forEach((btn) => {
        btn.addEventListener("click", () => this.closeDialog());
      });
    this.dialog.onclick = (e) => {
      if (e.target === this.dialog) this.closeDialog();
    };
    this.dialog.onclose = () => {
      this.closeDialog();
    };
    this.shadowRoot.querySelectorAll(".direction-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const newDir = (e.currentTarget as HTMLElement).getAttribute("data-direction") as any;
        if (newDir !== this.direction) {
          this.direction = newDir;
          this.performTranslation();
        }
      });
    });
    const select = this.shadowRoot.getElementById("service-select") as HTMLSelectElement;
    if (select)
      select.onchange = (e) => {
        this.service = (e.target as any).value;
        browser.storage.local.set({ selectedService: this.service });
        this.performTranslation();
      };
    const ttsBtn = this.shadowRoot.getElementById("tts-btn");
    if (ttsBtn)
      ttsBtn.onclick = () => {
        const synthesis = window.speechSynthesis;
        if (this.isReadingOriginal) {
          synthesis.cancel();
          this.isReadingOriginal = false;
          this.isReadingTranslation = false;
          this.render();
        } else {
          synthesis.cancel();
          this.isReadingTranslation = false;
          const u = new SpeechSynthesisUtterance(this.originalText);
          u.lang = this.direction === "en-to-zh" ? "en-US" : "zh-CN";
          u.onstart = () => {
            this.isReadingOriginal = true;
            this.render();
          };
          u.onend = () => {
            this.isReadingOriginal = false;
            this.render();
          };
          u.onerror = () => {
            this.isReadingOriginal = false;
            this.render();
          };
          synthesis.speak(u);
        }
      };

    const ttsTranslationBtn = this.shadowRoot.getElementById("tts-translation-btn");
    if (ttsTranslationBtn)
      ttsTranslationBtn.onclick = () => {
        if (this.status === "loading" || !this.translation) return;
        const synthesis = window.speechSynthesis;
        if (this.isReadingTranslation) {
          synthesis.cancel();
          this.isReadingTranslation = false;
          this.isReadingOriginal = false;
          this.render();
        } else {
          synthesis.cancel();
          this.isReadingOriginal = false;
          const u = new SpeechSynthesisUtterance(this.translation);
          u.lang = this.direction === "en-to-zh" ? "zh-CN" : "en-US";
          u.onstart = () => {
            this.isReadingTranslation = true;
            this.render();
          };
          u.onend = () => {
            this.isReadingTranslation = false;
            this.render();
          };
          u.onerror = () => {
            this.isReadingTranslation = false;
            this.render();
          };
          synthesis.speak(u);
        }
      };

    const copyBtn = this.shadowRoot.getElementById("copy-btn");
    const quickCopyBtn = this.shadowRoot.getElementById("quick-copy-btn");
    [copyBtn, quickCopyBtn].forEach((btn) => {
      if (btn) btn.onclick = () => this.copyToClipboard(this.translation, btn as HTMLButtonElement);
    });
  }
}
