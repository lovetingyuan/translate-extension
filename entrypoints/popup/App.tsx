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
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Load saved settings on mount
    browser.storage.local.get(["selectedService", "theme"]).then((res) => {
      if (typeof res.selectedService === "string") {
        setSelectedService(res.selectedService as any);
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
    
    // Auto-retranslate if there's text
    if (inputText.trim()) {
      handleTranslate(newService);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : theme === "dark" ? "cupcake" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    await browser.storage.local.set({ theme: newTheme });
  };

  const handleTranslate = async (serviceOverride?: "google" | "microsoft" | "tencent" | "openrouter") => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError("");
    setTranslation("");

    try {
      const result = await translateText(inputText, serviceOverride || selectedService);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-base font-bold opacity-80">中英直译助手</span>
        <button className="btn btn-ghost btn-circle btn-sm" onClick={toggleTheme} title="切换主题">
          {theme === "light" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : theme === "dark" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
            </svg>
          )}
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Input Section */}
        <div className="form-control">
          <textarea
            autoFocus
            className="textarea textarea-bordered w-full h-28 resize-none focus:border-primary focus:outline-none transition-colors"
            placeholder="输入要翻译的文字... (Shift+Enter 快速翻译)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
        </div>

        {/* Action Section */}
        <div className="flex gap-2">
          <select
            className="select select-bordered focus:border-primary focus:outline-none flex-1"
            value={selectedService}
            onChange={handleServiceChange}
          >
            <option value="google">Google 翻译</option>
            <option value="microsoft">Microsoft 翻译</option>
            <option value="tencent">腾讯交互翻译</option>
            <option value="openrouter">OpenRouter (AI)</option>
          </select>
          <button
            className="btn btn-outline btn-primary flex-1"
            onClick={() => handleTranslate()}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : "翻译"}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error shadow-sm py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Result Section */}
        {translation && (
          <div className="card bg-base-200 shadow-inner group relative border border-base-300 overflow-hidden">
            <div className="card-body p-4 min-h-[80px] max-h-[280px] overflow-y-auto scrollbar-gutter-stable">
              <p className="text-sm whitespace-pre-wrap pr-2">{translation}</p>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity min-h-0 h-8 w-8 p-0"
              onClick={handleCopy}
              title="复制"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-3 bg-base-200 text-base-content border-t border-base-300 shrink-0 flex justify-between items-center">
        <p className="text-[10px] opacity-50">v{__APP_VERSION__} © 2026 Translate Extension</p>
        <a href="https://github.com/lovetingyuan/translate-extension" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors opacity-50 hover:opacity-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </footer>
    </div>
  );
}

export default App;
