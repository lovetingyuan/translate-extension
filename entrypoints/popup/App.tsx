import { useState, useEffect } from "react";
import { translateText } from "../../utils/translation";

function App() {
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedService, setSelectedService] = useState<
    "google" | "microsoft" | "tencent" | "openrouter"
  >("google");
  const [apiKey, setApiKey] = useState("");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Load saved settings on mount
    browser.storage.local.get(["selectedService", "openRouterApiKey", "theme"]).then((res) => {
      if (typeof res.selectedService === "string") {
        setSelectedService(res.selectedService as any);
      }
      if (typeof res.openRouterApiKey === "string") {
        setApiKey(res.openRouterApiKey);
      }
      if (typeof res.theme === "string") {
        setTheme(res.theme);
        // Apply theme to both html and body to ensure coverage
        document.documentElement.setAttribute("data-theme", res.theme);
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    });
  }, []);

  const handleServiceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newService = e.target.value as any;
    setSelectedService(newService);
    await browser.storage.local.set({ selectedService: newService });
  };

  const handleApiKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    await browser.storage.local.set({ openRouterApiKey: newKey });
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : theme === "dark" ? "cupcake" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    await browser.storage.local.set({ theme: newTheme });
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError("");
    setTranslation("");

    try {
      const result = await translateText(inputText, selectedService);
      setTranslation(result.translation);
    } catch (err: any) {
      setError(err.message || "翻译出错");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (translation) {
      navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearInput = () => {
    setInputText("");
    setTranslation("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col font-sans">
      {/* Navbar */}
      <div className="navbar bg-primary text-primary-content shadow-lg shrink-0">
        <div className="flex-1 px-2">
          <span className="text-lg font-bold">中英直译助手</span>
        </div>
        <div className="flex-none">
          <button className="btn btn-ghost btn-circle" onClick={toggleTheme} title="切换主题">
            {theme === "light" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Input Section */}
        <div className="form-control relative">
          <textarea
            className="textarea textarea-bordered h-28 pr-10 resize-none focus:border-primary focus:outline-none transition-colors"
            placeholder="输入要翻译的文字..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          {inputText && (
            <button 
              className="btn btn-ghost btn-circle btn-xs absolute top-2 right-2"
              onClick={clearInput}
              title="清除"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Section */}
        <div className="flex gap-0 shadow-sm rounded-lg overflow-hidden border border-base-300">
          <select
            className="select select-ghost focus:bg-transparent focus:outline-none flex-1 rounded-none border-r border-base-300"
            value={selectedService}
            onChange={handleServiceChange}
          >
            <option value="google">Google 翻译</option>
            <option value="microsoft">Microsoft 翻译</option>
            <option value="tencent">腾讯交互翻译</option>
            <option value="openrouter">OpenRouter (AI)</option>
          </select>
          <button
            className="btn btn-primary rounded-none px-6"
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : "翻译"}
          </button>
        </div>

        {/* API Key for OpenRouter */}
        {selectedService === "openrouter" && (
          <div className="card bg-warning/10 border border-warning/20 p-3 space-y-2">
            <label className="text-xs font-bold text-warning-content opacity-70">OpenRouter API Key</label>
            <input
              type="password"
              placeholder="输入你的 API Key..."
              className="input input-bordered input-sm w-full focus:border-warning focus:outline-none"
              value={apiKey}
              onChange={handleApiKeyChange}
            />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error shadow-sm py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Result Section */}
        {translation && (
          <div className="card bg-base-200 shadow-inner group relative border border-base-300">
            <div className="card-body p-4 min-h-[80px]">
              <p className="text-sm whitespace-pre-wrap">{translation}</p>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
              title="复制"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer items-center p-4 bg-base-200 text-base-content border-t border-base-300 shrink-0">
        <aside className="items-center grid-flow-col">
          <p className="text-[10px] opacity-50">v{__APP_VERSION__} © 2026 Translate Extension</p>
        </aside> 
        <nav className="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
          <a href="https://github.com/lovetingyuan/translate-extension" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors opacity-50 hover:opacity-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </nav>
      </footer>
    </div>
  );
}

export default App;
