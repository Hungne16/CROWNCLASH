import { useCallback, useEffect, useRef, useState } from "react";
import {
  buzz,
  closeSteal,
  createPracticeGame,
  loadGame,
  normalizeGame,
  STORE,
  UNDO_STORE,
} from "./controller";
import type { Game } from "./game";

export function useGame(presentation: boolean, practice = false) {
  const storageKey = practice ? `${STORE}-practice` : STORE;
  const undoKey = practice ? `${UNDO_STORE}-practice` : UNDO_STORE;
  const [game, setGame] = useState<Game>(() =>
    practice && !localStorage.getItem(storageKey)
      ? createPracticeGame(loadGame(STORE).questions)
      : loadGame(storageKey),
  );
  const current = useRef(game),
    channel = useRef<BroadcastChannel | null>(null);
  const [undoCount, setUndoCount] = useState(0),
    undoRef = useRef<Game[]>([]);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    if (current.current.questionBankVersion !== 2) {
      const next = normalizeGame(current.current);
      current.current = next;
      setGame(next);
      undoRef.current = undoRef.current.map(normalizeGame);
      try {
        localStorage.setItem(undoKey, JSON.stringify(undoRef.current));
      } catch {}
    }
  }, [game.questionBankVersion]);
  const commit = useCallback(
    (action: (g: Game) => Game) => {
      if (presentation) return;
      const previous = current.current,
        next = action(previous);
      if (next === previous) return;
      undoRef.current = [...undoRef.current.slice(-29), previous];
      setUndoCount(undoRef.current.length);
      current.current = next;
      setGame(next);
      try {
        localStorage.setItem(undoKey, JSON.stringify(undoRef.current));
      } catch {}
    },
    [presentation, undoKey],
  );
  const undo = useCallback(() => {
    if (presentation) return;
    const checkpoint = undoRef.current.pop();
    if (!checkpoint) return;
    const previous = normalizeGame(checkpoint);
    current.current = previous;
    setGame(previous);
    setUndoCount(undoRef.current.length);
    try {
      localStorage.setItem(undoKey, JSON.stringify(undoRef.current));
    } catch {}
  }, [presentation, undoKey]);
  useEffect(() => {
    if (presentation) return;
    try {
      const stored = JSON.parse(localStorage.getItem(undoKey) ?? "[]");
      if (Array.isArray(stored)) {
        undoRef.current = stored.slice(-30).map(normalizeGame);
        setUndoCount(undoRef.current.length);
        localStorage.setItem(undoKey, JSON.stringify(undoRef.current));
      }
    } catch {}
  }, [presentation, undoKey]);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const c = new BroadcastChannel(
      practice ? "dautri-practice-sync" : "dautri-sync",
    );
    channel.current = c;
    c.onmessage = ({ data }) => {
      if (presentation && data?.type === "state") {
        const next = normalizeGame(data.game);
        current.current = next;
        setGame(next);
      }
      if (!presentation && data?.type === "request-state")
        c.postMessage({ type: "state", game: current.current });
      if (!presentation && data?.type === "buzz" && Number.isInteger(data.team))
        commit((g) => buzz(g, data.team));
    };
    if (presentation) c.postMessage({ type: "request-state" });
    return () => {
      if (channel.current === c) channel.current = null;
      c.close();
    };
  }, [presentation, commit, practice]);
  useEffect(() => {
    if (presentation) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(game));
      setStorageError("");
    } catch {
      setStorageError(
        "Không thể lưu trên trình duyệt. Hãy kiểm tra dung lượng lưu trữ.",
      );
    }
    channel.current?.postMessage({ type: "state", game });
  }, [game, presentation, storageKey]);
  useEffect(() => {
    if (!presentation) return;
    const handle = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const next = normalizeGame(JSON.parse(e.newValue));
          current.current = next;
          setGame(next);
        } catch {}
      }
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [presentation, storageKey]);
  useEffect(() => {
    if (presentation || game.phase !== "steal-window" || !game.stealDeadline)
      return;
    const timeout = setTimeout(
      () => commit(closeSteal),
      Math.max(0, game.stealDeadline - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [presentation, game.phase, game.stealDeadline, commit]);
  const sendBuzz = (team: number) =>
    channel.current?.postMessage({ type: "buzz", team });
  return { game, commit, undo, undoCount, sendBuzz, storageError };
}
export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return now;
}
