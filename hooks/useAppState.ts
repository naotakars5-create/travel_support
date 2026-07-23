"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MailItem, ParseApiResponse } from "@/lib/types";
import { buildSeedMails } from "@/lib/seedMails";
import { loadState, saveState } from "@/lib/storage";
import { buildRail, railNodes, RailItem } from "@/lib/itinerary";
import { getDayOfState, DayOfState } from "@/lib/dayof";
import { ManualEventInput, manualInputToEvent } from "@/lib/manualEntry";

export type Tab = "inbox" | "itin" | "today";

interface FlashState {
  visible: boolean;
  text: string;
}

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAppState() {
  const [mails, setMails] = useState<MailItem[] | null>(null);
  const [currentNodeKey, setCurrentNodeKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashState>({ visible: false, text: "" });
  const [justAddedEventId, setJustAddedEventId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const initializedRef = useRef(false);
  const autoSeedInitRef = useRef<MailItem[] | null>(null);

  // 初期化：localStorageはSSRで参照できないため、マウント後の一度きりの副作用として復元する。
  /* eslint-disable react-hooks/set-state-in-effect -- 外部ストレージ(localStorage)からのハイドレーションのため意図的 */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const persisted = loadState();
    if (persisted) {
      setMails(persisted.mails);
      setCurrentNodeKey(persisted.currentNodeKey);
    } else {
      const seeded = buildSeedMails(new Date());
      setMails(seeded);
      autoSeedInitRef.current = seeded;
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 永続化
  useEffect(() => {
    if (!mails) return;
    saveState({ version: 1, mails, currentNodeKey, seedGeneratedAt: new Date().toISOString() });
  }, [mails, currentNodeKey]);

  // 現在時刻の更新（当日画面のカウントダウン用）
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parseMail = useCallback(async (mail: MailItem, opts?: { isInitialSeed?: boolean }) => {
    setMails((prev) => (prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "parsing" as const } : m)) : prev));

    let result: ParseApiResponse;
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: mail.body, source: mail.source, referenceDate: new Date().toISOString() }),
      });
      result = (await res.json()) as ParseApiResponse;
    } catch (err) {
      result = { kind: "error", message: err instanceof Error ? err.message : "ネットワークエラーが発生しました" };
    }

    if (result.kind === "events") {
      setMails((prev) =>
        prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "done" as const, events: result.events, errorMessage: undefined } : m)) : prev
      );
      const firstId = result.events[0]?.id ?? null;
      setJustAddedEventId(firstId);
      window.setTimeout(() => setJustAddedEventId(null), 600);

      if (opts?.isInitialSeed) {
        setCurrentNodeKey((prevKey) => {
          if (prevKey !== null) return prevKey;
          const rail = buildRail(result.kind === "events" ? result.events : [], false);
          const nodes = railNodes(rail);
          const arrival = nodes[nodes.length - 1] ?? nodes[0];
          return arrival ? arrival.key : prevKey;
        });
      }
    } else if (result.kind === "skip") {
      setMails((prev) => (prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "skip" as const, events: [] } : m)) : prev));
    } else {
      setMails((prev) =>
        prev ? prev.map((m) => (m.id === mail.id ? { ...m, status: "error" as const, errorMessage: result.kind === "error" ? result.message : "解析に失敗しました" } : m)) : prev
      );
    }
  }, []);

  // 初回シード後：JAL・一休・週末特集は自動解析（ホテルだけ「未解析」で残す＝受信箱の起点デモ）
  useEffect(() => {
    const seeded = autoSeedInitRef.current;
    if (!seeded) return;
    autoSeedInitRef.current = null;
    const jal = seeded.find((m) => m.id === "jal");
    const ikyu = seeded.find((m) => m.id === "ikyu");
    const promo = seeded.find((m) => m.id === "promo");
    if (jal) void parseMail(jal, { isInitialSeed: true });
    if (ikyu) void parseMail(ikyu);
    if (promo) void parseMail(promo);
  }, [mails, parseMail]);

  const events = useMemo(() => (mails ?? []).filter((m) => m.status === "done").flatMap((m) => m.events), [mails]);
  const hasPendingReservation = useMemo(
    () => (mails ?? []).some((m) => m.status === "new" || m.status === "parsing" || m.status === "error"),
    [mails]
  );
  const rail: RailItem[] = useMemo(() => buildRail(events, hasPendingReservation), [events, hasPendingReservation]);
  const dayOfState: DayOfState = useMemo(() => getDayOfState(rail, currentNodeKey), [rail, currentNodeKey]);

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const addPastedMail = useCallback((body: string, source: string) => {
    const mail: MailItem = {
      id: genId("mail"),
      source: source.trim() || "貼り付けメール",
      subject: body.trim().slice(0, 40) || "（本文なし）",
      body: body.trim(),
      status: "new",
      events: [],
    };
    setMails((prev) => [...(prev ?? []), mail]);
    return mail;
  }, []);

  const addManualEvent = useCallback((mailId: string, input: ManualEventInput) => {
    const event = manualInputToEvent(genId("evt"), input);
    if (!event) return false;
    setMails((prev) =>
      prev
        ? prev.map((m) => (m.id === mailId ? { ...m, status: "done" as const, manual: true, events: [event], errorMessage: undefined } : m))
        : prev
    );
    return true;
  }, []);

  const recordArrival = useCallback((nodeKey: string, place: string) => {
    setCurrentNodeKey(nodeKey);
    setFlash({ visible: true, text: `${place} に到着\n到着を記録しました` });
    window.setTimeout(() => setFlash({ visible: false, text: "" }), 1700);
  }, []);

  return {
    mails,
    tab,
    setTab,
    sheetOpen,
    selectedId,
    openSheet,
    closeSheet,
    flash,
    justAddedEventId,
    now,
    events,
    hasPendingReservation,
    rail,
    dayOfState,
    currentNodeKey,
    parseMail,
    addPastedMail,
    addManualEvent,
    recordArrival,
  };
}

export type AppState = ReturnType<typeof useAppState>;
