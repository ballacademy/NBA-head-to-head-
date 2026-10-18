import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import type { ComposerMode } from "./composerMode";
import { getComposerExportContext } from "./composerRecents";

export const COMPOSER_EXPORT_HISTORY_KEY = "ddgm:composer-export-history";
export const COMPOSER_EXPORT_HISTORY_EVENT = "ddgm:composer-export-history";
export const COMPOSER_EXPORT_HISTORY_MAX = 10;

export interface ComposerExportHistoryItem {
  id: string;
  filename: string;
  dataUrl: string;
  at: number;
  mode: ComposerMode | null;
}

const isItem = (value: unknown): value is ComposerExportHistoryItem =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ComposerExportHistoryItem).id === "string" &&
      typeof (value as ComposerExportHistoryItem).filename === "string" &&
      typeof (value as ComposerExportHistoryItem).dataUrl === "string" &&
      typeof (value as ComposerExportHistoryItem).at === "number" &&
      String((value as ComposerExportHistoryItem).dataUrl).startsWith(
        "data:image/png",
      ),
  );

export const parseComposerExportHistory = (
  value: unknown,
): ComposerExportHistoryItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isItem).slice(0, COMPOSER_EXPORT_HISTORY_MAX);
};

export const readComposerExportHistory = () =>
  parseComposerExportHistory(readJson<unknown>(COMPOSER_EXPORT_HISTORY_KEY));

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const recordComposerExport = async (
  filename: string,
  blob: Blob,
) => {
  try {
    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl.startsWith("data:image/png")) {
      return;
    }
    const next: ComposerExportHistoryItem[] = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename,
        dataUrl,
        at: Date.now(),
        mode: getComposerExportContext(),
      },
      ...readComposerExportHistory(),
    ].slice(0, COMPOSER_EXPORT_HISTORY_MAX);
    writeJson(COMPOSER_EXPORT_HISTORY_KEY, next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(COMPOSER_EXPORT_HISTORY_EVENT));
    }
  } catch {
    /* quota — skip history */
  }
};

export const downloadExportHistoryItem = (item: ComposerExportHistoryItem) => {
  const link = document.createElement("a");
  link.download = item.filename;
  link.href = item.dataUrl;
  link.click();
};

export function useComposerExportHistory() {
  const [items, setItems] = useState<ComposerExportHistoryItem[]>(
    readComposerExportHistory,
  );

  useEffect(() => {
    const sync = () => setItems(readComposerExportHistory());
    window.addEventListener(COMPOSER_EXPORT_HISTORY_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_EXPORT_HISTORY_EVENT, sync);
  }, []);

  return items;
}
