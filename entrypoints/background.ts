import { type Browser } from 'wxt/browser';

const parseMSToken = (token: string): number => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp || 0;
  } catch (err) {
    console.error('parseMSToken error:', err);
    return 0;
  }
};

let msTokenCache: { token: string; expiresAt: number } | null = null;
const EXPIRATION_BUFFER_MS = 1000;

const getMicrosoftToken = async (): Promise<string> => {
  const now = Date.now();

  if (msTokenCache && msTokenCache.expiresAt > now + EXPIRATION_BUFFER_MS) {
    console.log('使用缓存的Microsoft token');
    return msTokenCache.token;
  }

  const storageResult = await browser.storage.local.get('msAuthToken');
  const storageToken = storageResult.msAuthToken as string | undefined;

  if (storageToken) {
    const storageExp = parseMSToken(storageToken);
    const storageExpiresAt = storageExp * 1000;

    if (storageExpiresAt > now + EXPIRATION_BUFFER_MS) {
      console.log('使用storage缓存的Microsoft token');
      msTokenCache = { token: storageToken, expiresAt: storageExpiresAt };
      return storageToken;
    }
  }

  console.log('获取新的Microsoft token');
  const response = await fetch('https://edge.microsoft.com/translate/auth');

  if (!response.ok) {
    throw new Error(`Microsoft token请求失败: ${response.status}`);
  }

  const token = await response.text();
  const exp = parseMSToken(token);
  const expiresAt = exp * 1000;

  await browser.storage.local.set({ msAuthToken: token });
  msTokenCache = { token, expiresAt };

  console.log('Microsoft token获取成功，过期时间:', new Date(expiresAt));
  return token;
};

const translateWithGoogle = async (text: string, signal?: AbortSignal, direction: 'en-to-zh' | 'zh-to-en' = 'en-to-zh'): Promise<string> => {
  const url = 'https://translate-pa.googleapis.com/v1/translateHtml';

  console.log('正在请求Google翻译API:', url);

  const [sourceLang, targetLang] = direction === 'en-to-zh' ? ['en', 'zh-CN'] : ['zh-CN', 'en'];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json+protobuf',
      'X-Goog-API-Key': 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8,ja;q=0.7,en-US;q=0.6',
    },
    body: JSON.stringify([[[text], sourceLang, targetLang], 'te']),
    signal,
  });

  console.log('GoogleHtml翻译API响应状态:', response.status, response.statusText);

  if (!response.ok) {
    throw new Error(`GoogleHtml翻译请求失败: ${response.status}`);
  }

  const data = await response.json();
  console.log('GoogleHtml翻译API返回数据类型:', typeof data);
  console.log('GoogleHtml翻译API返回数据长度:', Array.isArray(data) ? data.length : 'N/A');
  console.log('GoogleHtml翻译API返回数据:', JSON.stringify(data, null, 2));

  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'number') {
      throw new Error(`GoogleHtml翻译API错误 (${data[0]}): ${data[1] || '未知错误'}`);
    }

    if (Array.isArray(data[0]) && data[0].length > 0 && typeof data[0][0] === 'string') {
      const translation = data[0][0];
      console.log('GoogleHtml翻译成功:', translation);
      return translation;
    }

    if (typeof data[0] === 'string') {
      const translation = data[0];
      console.log('GoogleHtml翻译成功:', translation);
      return translation;
    }
  }

  throw new Error('GoogleHtml翻译返回数据格式错误');
};

const translateWithMicrosoft = async (text: string, signal?: AbortSignal, direction: 'en-to-zh' | 'zh-to-en' = 'en-to-zh'): Promise<string> => {
  const [fromLang, toLang] = direction === 'en-to-zh' ? ['', 'zh-Hans'] : ['zh-Hans', 'en'];
  const url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${fromLang}&to=${toLang}`;

  console.log('正在请求Microsoft翻译API:', url);

  const token = await getMicrosoftToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      authorization: `Bearer ${token}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      pragma: 'no-cache',
    },
    body: JSON.stringify([{ Text: text }]),
    signal,
  });

  console.log('Microsoft翻译API响应状态:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Microsoft翻译API错误响应:', errorText);
    throw new Error(`Microsoft翻译请求失败: ${response.status}`);
  }

  const data = await response.json();
  console.log('Microsoft翻译API返回数据:', data);

  if (Array.isArray(data) && data.length > 0 && data[0]?.translations && data[0].translations.length > 0) {
    const translation = data[0].translations[0].text;
    if (typeof translation === 'string') {
      console.log('Microsoft翻译成功:', translation);
      return translation;
    }
  }

  throw new Error('Microsoft翻译返回数据格式错误');
};

const translateWithTencent = async (text: string, signal?: AbortSignal, direction: 'en-to-zh' | 'zh-to-en' = 'en-to-zh'): Promise<string> => {
  const url = 'https://transmart.qq.com/api/imt';

  console.log('正在请求Tencent翻译API:', url);

  const [sourceLang, targetLang] = direction === 'en-to-zh' ? ['en', 'zh'] : ['zh', 'en'];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      'Referer': 'https://transmart.qq.com/zh-CN/index',
    },
    body: JSON.stringify({
      header: {
        fn: 'auto_translation',
        client_key: 'browser-chrome-110.0.0-Mac OS-df4bd4c5-a65d-44b2-a40f-42f34f3535f2-1677486696487',
      },
      type: 'plain',
      model_category: 'normal',
      source: {
        text_list: [text],
        lang: sourceLang,
      },
      target: {
        lang: targetLang,
      },
    }),
    signal,
  });

  console.log('Tencent翻译API响应状态:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Tencent翻译API错误响应:', errorText);
    throw new Error(`Tencent翻译请求失败: ${response.status}`);
  }

  const data = await response.json();
  console.log('Tencent翻译API返回数据:', data);

  if (data.auto_translation && Array.isArray(data.auto_translation) && data.auto_translation.length > 0) {
    const translation = data.auto_translation[0];
    if (typeof translation === 'string') {
      console.log('Tencent翻译成功:', translation);
      return translation;
    }
  }

  throw new Error('Tencent翻译返回数据格式错误');
};

  let currentAbortController: AbortController | null = null;

  const detectDirection = (text: string): 'en-to-zh' | 'zh-to-en' => {
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
    return englishCount > 0 ? 'en-to-zh' : 'zh-to-en';
  };

  const translateText = async (
    text: string,
    service?: 'google' | 'microsoft' | 'tencent',
    direction?: 'en-to-zh' | 'zh-to-en'
  ): Promise<{ translation: string; direction: 'en-to-zh' | 'zh-to-en' }> => {
    if (currentAbortController) {
      currentAbortController.abort();
    }

    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    try {
      const result = await browser.storage.local.get(['selectedService', 'translationDirection']);
      const selectedService = service || (result.selectedService as 'google' | 'microsoft' | 'tencent') || 'google';
      const translationDirection = direction || detectDirection(text);

      const translatorMap: { [key: string]: { name: string; fn: (text: string, signal?: AbortSignal, direction?: 'en-to-zh' | 'zh-to-en') => Promise<string> } } = {
        google: { name: 'Google', fn: translateWithGoogle },
        microsoft: { name: 'Microsoft', fn: translateWithMicrosoft },
        tencent: { name: 'Tencent', fn: translateWithTencent },
      };

      const translator = translatorMap[selectedService];
      if (!translator) throw new Error('未知的翻译服务');

      const translationResult = await translator.fn(text, signal, translationDirection);
      return { translation: translationResult, direction: translationDirection };
    } finally {
      if (currentAbortController?.signal === signal) {
        currentAbortController = null;
      }
    }
  };

export default defineBackground(() => {
  let currentSelection = {
    text: '',
    translation: '',
    timestamp: 0,
    success: false,
    direction: 'en-to-zh' as 'en-to-zh' | 'zh-to-en'
  };

  const pendingTranslations = new Map<string, Promise<{ translation: string; direction: 'en-to-zh' | 'zh-to-en' }>>();

  browser.contextMenus.create({
    id: 'translate-selection',
    title: '翻译',
    contexts: ['selection'],
  });

  if (browser.contextMenus && 'onShown' in browser.contextMenus) {
    const contextMenusWithOnShown = browser.contextMenus as any;

    contextMenusWithOnShown.onShown.addListener((info: any, tab: any) => {
      const selectedText = info.selectionText?.trim();

      if (selectedText && selectedText.length > 0 && selectedText.length < 200) {
        const menuTitle = selectedText.length > 30 ? `翻译: ${selectedText.substring(0, 27)}...` : `翻译: ${selectedText}`;

        browser.contextMenus.update('translate-selection', { title: menuTitle }).catch(() => {});

        if (currentSelection.text === selectedText && currentSelection.success && currentSelection.translation) {
          return;
        }

        if (!pendingTranslations.has(selectedText)) {
          const translationPromise = translateText(selectedText)
            .then((res) => {
              currentSelection = {
                text: selectedText,
                translation: res.translation,
                timestamp: Date.now(),
                success: true,
                direction: res.direction
              };
              return res;
            })
            .catch((err) => {
              currentSelection = { text: selectedText, translation: '', timestamp: Date.now(), success: false, direction: 'en-to-zh' };
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
    if (message.action === 'translate') {
      const service = message.service as 'google' | 'microsoft' | 'tencent';
      const direction = message.direction as 'en-to-zh' | 'zh-to-en';

      if (direction) {
        browser.storage.local.set({ translationDirection: direction });
      }

      translateText(message.text, service, direction)
        .then((res) => {
          sendResponse({ success: true, translation: res.translation, direction: res.direction });
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            sendResponse({ success: false, error: 'Aborted', isAbort: true });
            return;
          }
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === 'abortTranslation') {
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
      }
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'getLatestTranslation') {
      sendResponse(currentSelection);
    }

    if (message.action === 'updateMenuTitle') {
      const menuTitle = message.text.length > 30 ? `翻译: ${message.text.substring(0, 27)}...` : `翻译: ${message.text}`;
      browser.contextMenus.update('translate-selection', { title: menuTitle }).then(() => sendResponse({ success: true })).catch(() => {});
      return true;
    }

    if (message.action === 'resetMenuTitle') {
      browser.contextMenus.update('translate-selection', { title: '翻译' }).then(() => sendResponse({ success: true })).catch(() => {});
      return true;
    }
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'translate-selection' && tab?.id) {
      const textToTranslate = info.selectionText?.trim() || currentSelection.text;

      if (!textToTranslate) {
        browser.tabs.sendMessage(tab.id!, { action: 'showErrorDialog', message: '请先选中文本' }).catch(() => {});
        return;
      }

      browser.tabs.sendMessage(tab.id!, { action: 'showLoadingDialog', originalText: textToTranslate }).catch(() => {});

      translateText(textToTranslate)
        .then((res) => {
          currentSelection = { text: textToTranslate, translation: res.translation, timestamp: Date.now(), success: true, direction: res.direction };
          browser.tabs.sendMessage(tab.id!, { action: 'updateDetailDialog', translation: res.translation, direction: res.direction }).catch(() => {});
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          currentSelection = { text: textToTranslate, translation: '', timestamp: Date.now(), success: false, direction: 'en-to-zh' };
          browser.tabs.sendMessage(tab.id!, { action: 'updateDetailDialogError', message: '翻译失败，请稍后重试' }).catch(() => {});
        });
    }
  });
});
