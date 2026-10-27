import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyPreparation,
  fingerprint,
  parsePreparation,
  type Preparation,
} from "./preparation";
import {
  loadPreparation,
  savePreparation,
  PreparationConflict,
  type SavedPreparation,
} from "./preparationRepository";
import { accountError } from "./firebase";

export type SaveStatus =
  "loading" | "saved" | "unsaved" | "saving" | "error" | "conflict";
type Model = {
  draft: Preparation | null;
  baseline: string;
  revision: number | null;
  savedAt: string | null;
  status: SaveStatus;
  error: string;
  latest: SavedPreparation | null;
};
type DraftCache = {
  ownerId: string;
  payload: Preparation;
  revision: number | null;
  dirty: boolean;
  baseline: string;
};
const initial: Model = {
  draft: null,
  baseline: "",
  revision: null,
  savedAt: null,
  status: "loading",
  error: "",
  latest: null,
};
const cacheKey = (id: string) => `crownclash-preparation-draft:${id}`;
export function usePreparation(ownerId: string) {
  const [model, setModel] = useState<Model>(initial),
    ref = useRef(model),
    generation = useRef(0),
    saving = useRef(false);
  ref.current = model;
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    saving.current = false;
    setModel((old) => ({ ...old, status: "loading", error: "" }));
    let cache: DraftCache | null = null;
    try {
      const value = JSON.parse(
        localStorage.getItem(cacheKey(ownerId)) ?? "null",
      );
      if (value?.ownerId === ownerId)
        cache = { ...value, payload: parsePreparation(value.payload) };
    } catch {}
    try {
      const remote = await loadPreparation(ownerId);
      if (ticket !== generation.current) return;
      const serverPayload = remote?.payload ?? emptyPreparation(),
        baseline = fingerprint(serverPayload),
        revision = remote?.revision ?? null;
      if (cache?.dirty && cache.revision !== revision) {
        setModel({
          draft: cache.payload,
          baseline,
          revision,
          savedAt: remote?.updatedAt ?? null,
          status: "conflict",
          error:
            "Bản đang soạn trên máy và bản trên tài khoản khác nhau. Chọn bản bạn muốn tiếp tục.",
          latest: remote,
        });
        return;
      }
      const draft = cache?.dirty ? cache.payload : serverPayload;
      setModel({
        draft,
        baseline,
        revision,
        savedAt: remote?.updatedAt ?? null,
        status: fingerprint(draft) === baseline ? "saved" : "unsaved",
        error: "",
        latest: null,
      });
    } catch (error) {
      if (ticket !== generation.current) return;
      setModel({
        draft: cache?.payload ?? emptyPreparation(),
        baseline: cache?.baseline ?? "",
        revision: cache?.revision ?? null,
        savedAt: null,
        status: "error",
        error: accountError(error),
        latest: null,
      });
    }
  }, [ownerId]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!model.draft || model.status === "loading") return;
    try {
      localStorage.setItem(
        cacheKey(ownerId),
        JSON.stringify({
          ownerId,
          payload: model.draft,
          revision: model.revision,
          dirty: fingerprint(model.draft) !== model.baseline,
          baseline: model.baseline,
        } satisfies DraftCache),
      );
    } catch {}
  }, [ownerId, model.draft, model.revision, model.baseline, model.status]);
  const save = useCallback(async () => {
    const current = ref.current;
    if (
      !current.draft ||
      saving.current ||
      !["unsaved", "saved"].includes(current.status) ||
      fingerprint(current.draft) === current.baseline
    )
      return;
    const ticket = generation.current,
      payload = current.draft;
    saving.current = true;
    setModel((old) => ({ ...old, status: "saving", error: "" }));
    try {
      const record = await savePreparation(ownerId, payload, current.revision);
      if (ticket !== generation.current) return;
      const baseline = fingerprint(record.payload);
      setModel((old) => ({
        ...old,
        revision: record.revision,
        baseline,
        savedAt: record.updatedAt,
        status:
          old.draft && fingerprint(old.draft) !== baseline
            ? "unsaved"
            : "saved",
        error: "",
        latest: null,
      }));
    } catch (error) {
      if (ticket !== generation.current) return;
      if (error instanceof PreparationConflict)
        setModel((old) => ({
          ...old,
          status: "conflict",
          error: error.message,
          latest: error.latest,
        }));
      else
        setModel((old) => ({
          ...old,
          status: "error",
          error: accountError(error),
        }));
    } finally {
      if (ticket === generation.current) saving.current = false;
    }
  }, [ownerId]);
  useEffect(() => {
    if (!model.draft || model.status !== "unsaved") return;
    const timer = setTimeout(() => {
      void save();
    }, 900);
    return () => clearTimeout(timer);
  }, [model.draft, model.status, model.revision, save]);
  const dirty = !!model.draft && fingerprint(model.draft) !== model.baseline;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    const online = () => {
      if (ref.current.status === "error") void load();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [load]);
  const edit = (fn: (p: Preparation) => Preparation) =>
    setModel((old) => {
      if (!old.draft || old.status === "loading") return old;
      const draft = fn(old.draft),
        same = fingerprint(draft) === old.baseline;
      return {
        ...old,
        draft,
        status: ["error", "conflict", "saving"].includes(old.status)
          ? old.status
          : same
            ? "saved"
            : "unsaved",
      };
    });
  const resolve = (choice: "remote" | "local") =>
    setModel((old) => {
      if (old.status !== "conflict") return old;
      const remote = old.latest?.payload ?? emptyPreparation(),
        baseline = fingerprint(remote),
        draft = choice === "remote" ? remote : old.draft!;
      return {
        ...old,
        draft,
        baseline,
        revision: old.latest?.revision ?? null,
        savedAt: old.latest?.updatedAt ?? null,
        status: fingerprint(draft) === baseline ? "saved" : "unsaved",
        error: "",
        latest: null,
      };
    });
  return { ...model, dirty, edit, reload: load, save, resolve };
}

