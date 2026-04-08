import { useCallback, useEffect, useState } from "react";
import {
  addTranslationHistoryItem,
  getTranslationHistory,
  type TranslationHistoryItem,
} from "../../../utils/translation";

/**
 * 管理 Popup 翻译历史的读取与写入。
 *
 * 历史记录只在 Popup 内消费，但需要跨弹窗实例持久化，因此每次写入都同步更新
 * React state 与 browser.storage.local，避免重新打开 Popup 后出现短暂不一致。
 */
export const useTranslationHistory = () => {
  const [historyItems, setHistoryItems] = useState<TranslationHistoryItem[]>([]);

  const refreshHistory = useCallback(async () => {
    const items = await getTranslationHistory();
    setHistoryItems(items);
    return items;
  }, []);

  const recordHistory = useCallback(async (text: string) => {
    const items = await addTranslationHistoryItem(text);
    setHistoryItems(items);
    return items;
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  return {
    historyItems,
    recordHistory,
    refreshHistory,
  };
};
