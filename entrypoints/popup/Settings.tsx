import { useState, useEffect } from 'react';
import { CheckIcon } from '../components/icons';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    browser.storage.local.get(['openRouterApiKey', 'openRouterModelId']).then((res) => {
      if (res.openRouterApiKey) setApiKey(res.openRouterApiKey as string);
      if (res.openRouterModelId) setModelId(res.openRouterModelId as string);
    });
  }, []);

  const handleSave = async () => {
    await browser.storage.local.set({
      openRouterApiKey: apiKey,
      openRouterModelId: modelId,
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-base-100 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-base-300">
        <h2 className="text-base font-semibold opacity-80">设置</h2>
        <div className="flex gap-2">
          <button className="btn btn-xs btn-ghost font-normal" onClick={onClose}>
            返回
          </button>
          <button className="btn btn-xs btn-soft text-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium mb-1">OpenRouter API Key</span>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="label-text-alt link link-primary mb-1"
            >
              Get Key ↗
            </a>
          </label>
          <input
            type="text"
            placeholder="sk-or-..."
            className="input input-bordered input-sm w-full"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          {/* <label className="label">
            <span className="label-text-alt text-xs opacity-60">优先使用此Key，未设置则使用默认值</span>
          </label> */}
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium mb-1">OpenRouter Model ID</span>
            <a
              href="https://openrouter.ai/models"
              target="_blank"
              rel="noopener noreferrer"
              className="label-text-alt link link-primary mb-1"
            >
              Models ↗
            </a>
          </label>
          <input
            type="text"
            placeholder="xiaomi/mimo-v2-flash:free"
            className="input input-bordered input-sm w-full"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          />
          {/* <label className="label">
            <span className="label-text-alt text-xs opacity-60">例如: google/gemini-2.0-flash-exp:free</span>
          </label> */}
        </div>
      </div>
    </div>
  );
}
