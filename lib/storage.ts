import { MailItem } from "./types";

const STORAGE_KEY = "tabinavi.state.v1";

export interface PersistedState {
  version: 1;
  mails: MailItem[];
  currentNodeKey: string | null;
  seedGeneratedAt: string;
}

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ストレージ書き込み失敗は無視（プライベートモード等）
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
