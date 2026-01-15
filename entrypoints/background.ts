import { translateText, abortCurrentTranslation } from "../utils/translation";

export default defineBackground(() => {
  // Store selection state per tab ID
  const tabSelections = new Map<
    number,
    {
      text: string;
      translation: string;
      timestamp: number;
      success: boolean;
      direction: "zh" | "en";
    }
  >();

  const pendingTranslations = new Map<
    string,
    Promise<{ translation: string; direction: "zh" | "en" }>
  >();

  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "translate-selection",
      title: "翻译",
      contexts: ["selection"],
      documentUrlPatterns: ["http://*/*", "https://*/*"],
    });
  });

  // Helper to get or initialize tab selection
  const getTabSelection = (tabId: number) => {
    if (!tabSelections.has(tabId)) {
      tabSelections.set(tabId, {
        text: "",
        translation: "",
        timestamp: 0,
        success: false,
        direction: "zh",
      });
    }
    return tabSelections.get(tabId)!;
  };

  // Clear selection on tab remove
  browser.tabs.onRemoved.addListener((tabId) => {
    tabSelections.delete(tabId);
  });

  // Clear selection on tab navigation/refresh
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading") {
      tabSelections.delete(tabId);
    }
  });

  // Restore context menu state when switching tabs
  browser.tabs.onActivated.addListener(({ tabId }) => {
    const selection = tabSelections.get(tabId);
    if (selection && selection.text) {
      const menuTitle =
        selection.text.length > 30
          ? `翻译: ${selection.text.substring(0, 27)}...`
          : `翻译: ${selection.text}`;
      browser.contextMenus.update("translate-selection", { title: menuTitle }).catch(() => {});
    } else {
      browser.contextMenus.update("translate-selection", { title: "翻译" }).catch(() => {});
    }
  });

  if (browser.contextMenus && "onShown" in browser.contextMenus) {
    const contextMenusWithOnShown = browser.contextMenus as any;

    contextMenusWithOnShown.onShown.addListener((info: any, tab: any) => {
      const selectedText = info.selectionText?.trim();
      const tabId = tab?.id;

      if (selectedText && selectedText.length > 0 && selectedText.length < 200) {
        const menuTitle =
          selectedText.length > 30
            ? `翻译: ${selectedText.substring(0, 27)}...`
            : `翻译: ${selectedText}`;

        browser.contextMenus.update("translate-selection", { title: menuTitle }).catch(() => {});

        if (tabId) {
          const currentSelection = getTabSelection(tabId);
          if (
            currentSelection.text === selectedText &&
            currentSelection.success &&
            currentSelection.translation
          ) {
            return;
          }
        }

        if (!pendingTranslations.has(selectedText)) {
          const translationPromise = translateText(selectedText)
            .then((res) => {
              if (tabId) {
                tabSelections.set(tabId, {
                  text: selectedText,
                  translation: res.translation,
                  timestamp: Date.now(),
                  success: true,
                  direction: res.direction,
                });
              }
              return res;
            })
            .catch((err) => {
              if (tabId) {
                tabSelections.set(tabId, {
                  text: selectedText,
                  translation: "",
                  timestamp: Date.now(),
                  success: false,
                  direction: "zh",
                });
              }
              throw err;
            })
            .finally(() => {
              pendingTranslations.delete(selectedText);
            });

          pendingTranslations.set(selectedText, translationPromise);
        }
      }
    });
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.action === "translate") {
      const service = message.service as "google" | "microsoft" | "tencent" | "openrouter";
      const direction = message.direction as "zh" | "en";

      if (direction) {
        browser.storage.local.set({ translationDirection: direction });
      }

      translateText(message.text, service, direction)
        .then((res) => {
          sendResponse({ success: true, translation: res.translation, direction: res.direction });
        })
        .catch((err) => {
          if (
            err.name === "AbortError" ||
            err.message?.includes("signal is aborted") ||
            err.message?.includes("aborted")
          ) {
            sendResponse({ success: false, error: "Aborted", isAbort: true });
            return;
          }
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "abortTranslation") {
      abortCurrentTranslation();
      sendResponse({ success: true });
      return true;
    }

    if (message.action === "getLatestTranslation") {
      // If called from a tab, return that tab's selection.
      // If called from popup (no sender.tab.id usually), we might need another strategy,
      // but for now let's assume it's requesting for the active tab or handle specific logic.
      // The original code returned a global currentSelection.
      // For safety, if tabId exists, return it.
      if (tabId) {
        sendResponse(getTabSelection(tabId));
      } else {
        // Fallback for popup: query active tab
        browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          const activeTabId = tabs[0]?.id;
          if (activeTabId) {
            sendResponse(getTabSelection(activeTabId));
          } else {
            sendResponse(null);
          }
        });
        return true; // async response
      }
    }

    if (message.action === "updateMenuTitle") {
      const menuTitle =
        message.text.length > 30
          ? `翻译: ${message.text.substring(0, 27)}...`
          : `翻译: ${message.text}`;

      // Update the stored text for this tab so fallback works
      if (tabId) {
        const current = getTabSelection(tabId);
        // Only update text, preserve translation if it matches (though unlikely if text changed)
        if (current.text !== message.text) {
          tabSelections.set(tabId, {
            ...current,
            text: message.text,
            success: false, // Reset success as text changed
            translation: "",
          });
        }
      }

      browser.contextMenus
        .update("translate-selection", { title: menuTitle })
        .then(() => sendResponse({ success: true }))
        .catch(() => {});
      return true;
    }

    if (message.action === "resetMenuTitle") {
      browser.contextMenus
        .update("translate-selection", { title: "翻译" })
        .then(() => sendResponse({ success: true }))
        .catch(() => {});
      return true;
    }
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "translate-selection" && tab?.id) {
      const currentSelection = getTabSelection(tab.id);
      const textToTranslate = info.selectionText?.trim() || currentSelection.text;

      if (!textToTranslate) {
        browser.tabs
          .sendMessage(tab.id!, { action: "showErrorDialog", message: "请先选中文本" })
          .catch(() => {});
        return;
      }

      browser.tabs
        .sendMessage(tab.id!, { action: "showLoadingDialog", originalText: textToTranslate })
        .catch(() => {});

      translateText(textToTranslate)
        .then((res) => {
          tabSelections.set(tab.id!, {
            text: textToTranslate,
            translation: res.translation,
            timestamp: Date.now(),
            success: true,
            direction: res.direction,
          });
          browser.tabs
            .sendMessage(tab.id!, {
              action: "updateDetailDialog",
              translation: res.translation,
              direction: res.direction,
            })
            .catch(() => {});
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          tabSelections.set(tab.id!, {
            text: textToTranslate,
            translation: "",
            timestamp: Date.now(),
            success: false,
            direction: "zh",
          });
          browser.tabs
            .sendMessage(tab.id!, {
              action: "updateDetailDialogError",
              message: "翻译失败，请稍后重试",
            })
            .catch(() => {});
        });
    }
  });
});
