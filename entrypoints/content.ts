export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    if (import.meta.env.DEV) console.log('Translation content script loaded.');

    let lastSelectedText = '';

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText !== lastSelectedText && selectedText.length < 200) {
        lastSelectedText = selectedText;
        browser.runtime.sendMessage({
          action: 'updateMenuTitle',
          text: selectedText
        }).catch(err => {
          if (import.meta.env.DEV) console.error('发送更新菜单消息失败:', err);
        });
      } else if (!selectedText && lastSelectedText) {
        setTimeout(() => {
          const newSelection = window.getSelection();
          const newSelectedText = newSelection?.toString().trim();
          if (!newSelectedText && lastSelectedText) {
            lastSelectedText = '';
            browser.runtime.sendMessage({
              action: 'resetMenuTitle'
            }).catch(err => {
              if (import.meta.env.DEV) console.error('发送重置菜单消息失败:', err);
            });
          }
        }, 100);
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('selectionchange', handleSelectionChange);

    const copyToClipboard = async (text: string, btn: HTMLButtonElement) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '✅';
        setTimeout(() => {
          btn.innerHTML = '📋';
        }, 2000);
      } catch (err) {
        if (import.meta.env.DEV) console.error('复制失败:', err);
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            btn.innerHTML = '✅';
            setTimeout(() => {
              btn.innerHTML = '📋';
            }, 2000);
          }
        } catch (copyErr) {
          if (import.meta.env.DEV) console.error('Fallback copy failed:', copyErr);
        }
        document.body.removeChild(textArea);
      }
    };

    const abortOngoingTranslation = () => {
      browser.runtime.sendMessage({ action: 'abortTranslation' }).catch(() => {});
    };

    const detectDirection = (text: string): 'en-to-zh' | 'zh-to-en' => {
      const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
      return englishCount > 0 ? 'en-to-zh' : 'zh-to-en';
    };

    const updateDirectionButtons = (dialog: HTMLElement, direction: 'en-to-zh' | 'zh-to-en') => {
      const directionBtns = dialog.querySelectorAll('[id^="direction-"]');
      directionBtns.forEach((b) => {
        if (b instanceof HTMLButtonElement) {
          const btnDirection = b.getAttribute('data-direction') as 'en-to-zh' | 'zh-to-en';
          if (btnDirection === direction) {
            b.style.background = 'rgba(255,255,255,0.3)';
            b.style.border = '1px solid rgba(255,255,255,0.5)';
          } else {
            b.style.background = 'rgba(255,255,255,0.1)';
            b.style.border = '1px solid rgba(255,255,255,0.2)';
          }
        }
      });
    };

    const showLoadingDialog = (originalText: string) => {
      if (import.meta.env.DEV) console.log('显示翻译中弹窗:', originalText);

      const existingDialog = document.querySelector('dialog[data-loading-dialog]');
      if (existingDialog) {
        existingDialog.remove();
      }

      browser.storage.local.get(['selectedService', 'translationDirection']).then((result) => {
        const selectedService = (result.selectedService as 'google' | 'microsoft' | 'tencent') || 'google';
        const translationDirection = detectDirection(originalText);

        const dialog = document.createElement('dialog');
        dialog.setAttribute('data-loading-dialog', 'true');

        dialog.style.cssText = `
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          max-width: 500px;
          width: 90%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0;
          user-select: none;
          -webkit-user-select: none;
        `;

        dialog.innerHTML = `
          <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">翻译结果</h3>
              <button id="close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>

            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <label style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 1px;">翻译方向</label>
                <div style="display: flex; gap: 8px;">
                  <button id="direction-zh-to-en" data-direction="zh-to-en" style="flex: 1; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; ${translationDirection === 'zh-to-en' ? 'background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5);' : 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);'}">中译英</button>
                  <button id="direction-en-to-zh" data-direction="en-to-zh" style="flex: 1; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; ${translationDirection === 'en-to-zh' ? 'background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5);' : 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);'}">英译中</button>
                </div>
              </div>

              <div style="width: 50%;">
                <label style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 1px;">翻译服务</label>
                <select id="service-select" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: none; background: rgba(255,255,255,0.2); color: white; font-size: 14px; cursor: pointer; outline: none;">
                  <option value="google" ${selectedService === 'google' ? 'selected' : ''}>Google 翻译</option>
                  <option value="microsoft" ${selectedService === 'microsoft' ? 'selected' : ''}>Microsoft 翻译</option>
                  <option value="tencent" ${selectedService === 'tencent' ? 'selected' : ''}>腾讯翻译</option>
                </select>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">原文</div>
              <div style="font-size: 16px; line-height: 1.5; user-select: text; -webkit-user-select: text;">${escapeHtml(originalText)}</div>
            </div>

            <div style="background: rgba(255,255,255,0.15); padding: 16px; border-radius: 8px;">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;">
                <span>翻译</span>
                <button id="quick-copy-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="复制翻译结果">📋</button>
              </div>
              <div id="loading-content" style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span style="font-size: 16px; line-height: 1.5;">正在翻译...</span>
              </div>
            </div>
          </div>
            <style>
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            select option {
              background: #667eea;
              color: white;
            }
          </style>
        `;

        const directionBtns = dialog.querySelectorAll('[id^="direction-"]');
        let currentDirection = translationDirection;

        directionBtns.forEach((btn) => {
          if (btn instanceof HTMLButtonElement) {
            btn.addEventListener('click', async (e) => {
              const newDirection = (e.currentTarget as HTMLButtonElement).getAttribute('data-direction') as 'en-to-zh' | 'zh-to-en';

              if (newDirection === currentDirection) return;

              currentDirection = newDirection;
              updateDirectionButtons(dialog, newDirection);
              abortOngoingTranslation();

              const loadingContent = dialog.querySelector('#loading-content');
              if (loadingContent) {
                loadingContent.innerHTML = `
                  <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                  <span style="font-size: 16px; line-height: 1.5;">正在翻译...</span>
                `;
              }

              const serviceSelect = dialog.querySelector('#service-select') as HTMLSelectElement;
              const selectedService = serviceSelect?.value as 'google' | 'microsoft' | 'tencent';

              browser.runtime.sendMessage({
                action: 'translate',
                text: originalText,
                service: selectedService,
                direction: newDirection
              }).then((response) => {
                if (response.success) {
                  const loadingContent = dialog.querySelector('#loading-content');
                  if (loadingContent) {
                    loadingContent.innerHTML = `
                      <div class="translation-text-content" style="font-size: 16px; line-height: 1.5; font-weight: 500; user-select: text; -webkit-user-select: text;">
${escapeHtml(response.translation)}</div>
                    `;
                  }
                } else if (!response.isAbort) {
                  const loadingContent = dialog.querySelector('#loading-content');
                  if (loadingContent) {
                    loadingContent.innerHTML = `
                      <div style="display: flex; align-items: center; gap: 8px; color: #ff6b6b;">
                        <span style="font-size: 20px;">✕</span>
                        <span style="font-size: 16px; line-height: 1.5;">${escapeHtml(response.error || '翻译失败')}</span>
                      </div>
                    `;
                  }
                }
              }).catch((err) => {
                if (err.message && (err.message.includes('AbortError') || err.message.includes('message channel closed'))) return;
                if (import.meta.env.DEV) console.error('翻译请求失败:', err);
                const loadingContent = dialog.querySelector('#loading-content');
                if (loadingContent) {
                  loadingContent.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; color: #ff6b6b;">
                      <span style="font-size: 20px;">✕</span>
                      <span style="font-size: 16px; line-height: 1.5;">翻译失败，请重试</span>
                    </div>
                  `;
                }
              });
            });
          }
        });

        const serviceSelect = dialog.querySelector('#service-select') as HTMLSelectElement;
        if (serviceSelect) {
          serviceSelect.addEventListener('change', async (e) => {
            const newService = (e.target as HTMLSelectElement).value as 'google' | 'microsoft' | 'tencent';
            await browser.storage.local.set({ selectedService: newService });
            abortOngoingTranslation();

            const loadingContent = dialog.querySelector('#loading-content');
            if (loadingContent) {
              loadingContent.innerHTML = `
                <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span style="font-size: 16px; line-height: 1.5;">正在翻译...</span>
              `;
            }

            browser.runtime.sendMessage({
              action: 'translate',
              text: originalText,
              service: newService,
              direction: currentDirection
            }).then((response) => {
              if (response.success) {
                const loadingContent = dialog.querySelector('#loading-content');
                if (loadingContent) {
                  loadingContent.innerHTML = `
                    <div class="translation-text-content" style="font-size: 16px; line-height: 1.5; font-weight: 500; user-select: text; -webkit-user-select: text;">
${escapeHtml(response.translation)}</div>
                  `;
                }
              } else if (!response.isAbort) {
                const loadingContent = dialog.querySelector('#loading-content');
                if (loadingContent) {
                  loadingContent.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; color: #ff6b6b;">
                      <span style="font-size: 20px;">✕</span>
                      <span style="font-size: 16px; line-height: 1.5;">${escapeHtml(response.error || '翻译失败')}</span>
                    </div>
                  `;
                }
              }
            }).catch((err) => {
              if (err.message && (err.message.includes('AbortError') || err.message.includes('message channel closed'))) return;
              if (import.meta.env.DEV) console.error('翻译请求失败:', err);
              const loadingContent = dialog.querySelector('#loading-content');
              if (loadingContent) {
                loadingContent.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 8px; color: #ff6b6b;">
                    <span style="font-size: 20px;">✕</span>
                    <span style="font-size: 16px; line-height: 1.5;">翻译失败，请重试</span>
                  </div>
                `;
              }
            });
          });
        }

        const quickCopyBtn = dialog.querySelector('#quick-copy-btn') as HTMLButtonElement;
        if (quickCopyBtn) {
          quickCopyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textEl = dialog.querySelector('.translation-text-content');
            if (textEl) copyToClipboard(textEl.textContent || '', quickCopyBtn);
          });
        }

        document.body.appendChild(dialog);

        const setupCloseEvents = () => {
          const closeBtn1 = dialog.querySelector('#close-btn');
          if (closeBtn1) {
            closeBtn1.addEventListener('click', () => {
              abortOngoingTranslation();
              dialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
              dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
              dialog.style.opacity = '0';
              setTimeout(() => { dialog.close(); }, 300);
            });
          }

          dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
              abortOngoingTranslation();
              dialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
              dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
              dialog.style.opacity = '0';
              setTimeout(() => { dialog.close(); }, 300);
            }
          });
        };

        setupCloseEvents();

        dialog.addEventListener('close', () => {
          abortOngoingTranslation();
          setTimeout(() => { dialog.remove(); }, 200);
        });

        dialog.showModal();

        setTimeout(() => {
          dialog.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out';
          dialog.style.transform = 'translate(-50%, -50%) scale(1)';
          dialog.style.opacity = '1';
        }, 10);
      });
    };

    const showErrorDialog = (message: string) => {
      const existingDialog = document.querySelector('dialog[data-error-dialog]');
      if (existingDialog) existingDialog.remove();

      const dialog = document.createElement('dialog');
      dialog.setAttribute('data-error-dialog', 'true');

      dialog.style.cssText = `
        border: none;
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0;
      `;

      dialog.innerHTML = `
        <div style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">翻译失败</h3>
            <button id="close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;">×</button>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px;">
            <div style="font-size: 16px; line-height: 1.5;">${escapeHtml(message)}</div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const closeBtn = dialog.querySelector('#close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          dialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
          dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
          dialog.style.opacity = '0';
          setTimeout(() => { dialog.close(); }, 300);
        });
      }

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
          dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
          dialog.style.opacity = '0';
          setTimeout(() => { dialog.close(); }, 300);
        }
      });

      dialog.addEventListener('close', () => { setTimeout(() => { dialog.remove(); }, 200); });
      dialog.showModal();

      setTimeout(() => {
        dialog.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out';
        dialog.style.transform = 'translate(-50%, -50%) scale(1)';
        dialog.style.opacity = '1';
      }, 10);
    };

    const showDetailDialog = (originalText: string, translation: string, direction?: 'en-to-zh' | 'zh-to-en') => {
      const existingDialog = document.querySelector('dialog[data-translation-dialog]');
      if (existingDialog) existingDialog.remove();

      browser.storage.local.get(['selectedService', 'translationDirection']).then((result) => {
        const selectedService = (result.selectedService as 'google' | 'microsoft' | 'tencent') || 'google';
        const translationDirection = direction || detectDirection(originalText);

        const dialog = document.createElement('dialog');
        dialog.setAttribute('data-translation-dialog', 'true');

        dialog.style.cssText = `
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          max-width: 500px;
          width: 90%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0;
          user-select: none;
          -webkit-user-select: none;
        `;

        dialog.innerHTML = `
          <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">翻译结果</h3>
              <button id="close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>

            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <label style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 1px;">翻译方向</label>
                <div style="display: flex; gap: 8px;">
                  <button id="direction-zh-to-en" data-direction="zh-to-en" style="flex: 1; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; ${translationDirection === 'zh-to-en' ? 'background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5);' : 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);'}">中译英</button>
                  <button id="direction-en-to-zh" data-direction="en-to-zh" style="flex: 1; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; ${translationDirection === 'en-to-zh' ? 'background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5);' : 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);'}">英译中</button>
                </div>
              </div>

              <div style="width: 50%;">
                <label style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 1px;">翻译服务</label>
                <select id="service-select" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: none; background: rgba(255,255,255,0.2); color: white; font-size: 14px; cursor: pointer; outline: none;">
                  <option value="google" ${selectedService === 'google' ? 'selected' : ''}>Google 翻译</option>
                  <option value="microsoft" ${selectedService === 'microsoft' ? 'selected' : ''}>Microsoft 翻译</option>
                  <option value="tencent" ${selectedService === 'tencent' ? 'selected' : ''}>腾讯翻译</option>
                </select>
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;">
                <span>原文</span>
                <button id="tts-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;" title="朗读原文">🔊</button>
              </div>
              <div style="font-size: 16px; line-height: 1.5; user-select: text; -webkit-user-select: text;">${escapeHtml(originalText)}</div>
            </div>

            <div style="background: rgba(255,255,255,0.15); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;">
                <span>翻译</span>
                <button id="quick-copy-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="复制翻译结果">📋</button>
              </div>
              <div class="translation-text-content" style="font-size: 16px; line-height: 1.5; font-weight: 500; user-select: text; -webkit-user-select: text;">
${escapeHtml(translation)}</div>
            </div>

            <div style="display: flex; gap: 12px;">
              <button id="copy-btn" style="flex: 1; border: none; color: white; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);">复制翻译</button>
              <button id="close-btn-2" style="flex: 1; border: none; color: white; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; background: white; color: #667eea;">关闭</button>
            </div>
          </div>
          <style>
            select option { background: #667eea; color: white; }
          </style>
        `;

        const directionBtns = dialog.querySelectorAll('[id^="direction-"]');
        let currentDirection = translationDirection;

        directionBtns.forEach((btn) => {
          if (btn instanceof HTMLButtonElement) {
            btn.addEventListener('click', async (e) => {
              const newDirection = (e.currentTarget as HTMLButtonElement).getAttribute('data-direction') as 'en-to-zh' | 'zh-to-en';
              if (newDirection === currentDirection) return;
              currentDirection = newDirection;
              updateDirectionButtons(dialog, newDirection);
              abortOngoingTranslation();

              const translationDiv = dialog.querySelector('.translation-text-content') as HTMLElement;
              if (translationDiv) {
                translationDiv.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span style="font-size: 16px; line-height: 1.5;">正在翻译...</span>
                  </div>
                `;
              }

              browser.runtime.sendMessage({
                action: 'translate',
                text: originalText,
                service: selectedService,
                direction: newDirection
              }).then((response) => {
                if (response.success && translationDiv) translationDiv.textContent = response.translation;
                else if (translationDiv) translationDiv.textContent = '翻译失败';
              }).catch((err) => {
                if (import.meta.env.DEV) console.error('翻译请求失败:', err);
                if (translationDiv) translationDiv.textContent = '翻译失败，请重试';
              });
            });
          }
        });

        const serviceSelect = dialog.querySelector('#service-select') as HTMLSelectElement;
        if (serviceSelect) {
          serviceSelect.addEventListener('change', async (e) => {
            const newService = (e.target as HTMLSelectElement).value as 'google' | 'microsoft' | 'tencent';
            await browser.storage.local.set({ selectedService: newService });
            const translationDiv = dialog.querySelector('.translation-text-content') as HTMLElement;
            if (translationDiv) {
              translationDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                  <span style="font-size: 16px; line-height: 1.5;">正在翻译...</span>
                </div>
              `;
            }

            browser.runtime.sendMessage({
              action: 'translate',
              text: originalText,
              service: newService,
              direction: currentDirection
            }).then((response) => {
              if (response.success && translationDiv) translationDiv.textContent = response.translation;
              else if (translationDiv) translationDiv.textContent = '翻译失败';
            }).catch((err) => {
              if (import.meta.env.DEV) console.error('翻译请求失败:', err);
              if (translationDiv) translationDiv.textContent = '翻译失败，请重试';
            });
          });
        }

        const ttsBtn = dialog.querySelector('#tts-btn');
        if (ttsBtn) {
          ttsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!('speechSynthesis' in window)) { alert('您的浏览器不支持语音合成功能'); return; }
            const synthesis = window.speechSynthesis;
            if (synthesis.paused) { synthesis.resume(); (ttsBtn as HTMLButtonElement).textContent = '⏸'; }
            else if (synthesis.speaking) { synthesis.pause(); (ttsBtn as HTMLButtonElement).textContent = '▶️'; }
            else {
              const utterance = new SpeechSynthesisUtterance(originalText);
              utterance.lang = 'en-US';
              utterance.onend = () => { (ttsBtn as HTMLButtonElement).textContent = '🔊'; };
              utterance.onerror = () => { (ttsBtn as HTMLButtonElement).textContent = '🔊'; };
              synthesis.speak(utterance);
              (ttsBtn as HTMLButtonElement).textContent = '⏸';
            }
          });
        }

        const copyBtn = dialog.querySelector('#copy-btn') as HTMLButtonElement;
        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            const textEl = dialog.querySelector('.translation-text-content');
            if (textEl) await copyToClipboard(textEl.textContent || '', copyBtn);
          });
        }

        const quickCopyBtn = dialog.querySelector('#quick-copy-btn') as HTMLButtonElement;
        if (quickCopyBtn) {
          quickCopyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textEl = dialog.querySelector('.translation-text-content');
            if (textEl) copyToClipboard(textEl.textContent || '', quickCopyBtn);
          });
        }

        document.body.appendChild(dialog);

        const setupCloseEvents = () => {
          const closeBtn1 = dialog.querySelector('#close-btn');
          const closeBtn2 = dialog.querySelector('#close-btn-2');
          [closeBtn1, closeBtn2].forEach((btn) => {
            if (btn) {
              btn.addEventListener('click', () => {
                abortOngoingTranslation();
                dialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
                dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
                dialog.style.opacity = '0';
                setTimeout(() => { dialog.close(); }, 300);
              });
            }
          });
          dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
              abortOngoingTranslation();
              dialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
              dialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
              dialog.style.opacity = '0';
              setTimeout(() => { dialog.close(); }, 300);
            }
          });
        };

        setupCloseEvents();
        dialog.addEventListener('close', () => {
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          abortOngoingTranslation();
          setTimeout(() => { dialog.remove(); }, 200);
        });
        dialog.showModal();
        setTimeout(() => {
          dialog.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out';
          dialog.style.transform = 'translate(-50%, -50%) scale(1)';
          dialog.style.opacity = '1';
        }, 10);
      });
    };

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'showLoadingDialog') {
        showLoadingDialog(message.originalText);
        sendResponse({ success: true });
      } else if (message.action === 'updateDetailDialog') {
        const loadingDialog = document.querySelector('dialog[data-loading-dialog]') as HTMLDialogElement;
        if (loadingDialog) {
          loadingDialog.setAttribute('data-translation-dialog', 'true');
          loadingDialog.removeAttribute('data-loading-dialog');
          const loadingContent = loadingDialog.querySelector('#loading-content');
          if (loadingContent) {
            loadingContent.innerHTML = `
              <div class="translation-text-content" style="font-size: 16px; line-height: 1.5; font-weight: 500; user-select: text; -webkit-user-select: text;">
${escapeHtml(message.translation)}</div>
            `;
          }
          if (message.direction) updateDirectionButtons(loadingDialog, message.direction);
          const closeBtn = loadingDialog.querySelector('#close-btn');
          if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
              abortOngoingTranslation();
              loadingDialog.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
              loadingDialog.style.transform = 'translate(-50%, -50%) scale(0.8)';
              loadingDialog.style.opacity = '0';
              setTimeout(() => { loadingDialog.close(); }, 300);
            });
          }
        } else {
          showDetailDialog(message.originalText || '', message.translation, message.direction);
        }
        sendResponse({ success: true });
      } else if (message.action === 'updateDetailDialogError') {
        const loadingDialog = document.querySelector('dialog[data-loading-dialog]') as HTMLDialogElement;
        if (loadingDialog) {
          const loadingContent = loadingDialog.querySelector('#loading-content');
          if (loadingContent) {
            loadingContent.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px; color: #ff6b6b;">
                <span style="font-size: 20px;">✕</span>
                <span style="font-size: 16px; line-height: 1.5;">${escapeHtml(message.message)}</span>
              </div>
            `;
          }
        }
        sendResponse({ success: true });
      } else if (message.action === 'showDetailDialog') {
        showDetailDialog(message.originalText, message.translation, message.direction);
        sendResponse({ success: true });
      } else if (message.action === 'showErrorDialog') {
        showErrorDialog(message.message);
        sendResponse({ success: true });
      }
    });

    function escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  },
});
