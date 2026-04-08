import { useState } from "react";
import type { TranslationHistoryItem } from "../../../utils/translation";

interface TranslationHistoryProps {
  items: TranslationHistoryItem[];
  onSelect: (text: string) => void;
}

export const TranslationHistory = ({ items, onSelect }: TranslationHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <details
      open={isOpen}
      className="collapse collapse-arrow rounded-box border border-base-300 bg-base-200/60"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="collapse-title min-h-0 py-2 pr-8 text-xs font-normal select-none">
        最近翻译
      </summary>
      <div className="collapse-content px-2 pb-2">
        <div className="flex flex-col">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className="btn btn-ghost btn-xs h-auto min-h-0 justify-start px-2 py-1 text-left font-normal normal-case opacity-70"
              title={item}
              onClick={() => {
                setIsOpen(false);
                onSelect(item);
              }}
            >
              <span className="block w-full truncate text-xs font-normal">{item}</span>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
};
