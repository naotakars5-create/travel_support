import AsyncStorage from "@react-native-async-storage/async-storage";
import { MailItem } from "./types";

const STORAGE_KEY = "tabinavi.state.v1";

export interface PersistedState {
  version: 1;
  mails: MailItem[];
  currentNodeKey: string | null;
  seedGeneratedAt: string;
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ストレージ書き込み失敗は無視
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}
