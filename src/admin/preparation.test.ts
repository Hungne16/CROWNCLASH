import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyPreparation,
  fromPreparationGame,
  installPreparation,
  parsePreparation,
  preparationGame,
} from "./preparation";
import { initialGame } from "../game";
import { STORE, UNDO_STORE } from "../controller";
import { testQuestions } from "../testQuestions";
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
describe("account preparation data", () => {
  it("keeps cloud drafts empty until the admin authors content", () => {
    expect(emptyPreparation().questions).toEqual([]);
    expect(parsePreparation(emptyPreparation()).teamNames).toHaveLength(4);
  });
  it("stores preparation only, without copying live scores, cards or history", () => {
    const g = { ...initialGame(), questions: testQuestions };
    g.teams[0].score = 500;
    g.teams[0].cards.double = 0;
    g.history = [{ label: "old result", delta: [500, 0, 0, 0], time: 1 }];
    const p = fromPreparationGame(g);
    expect(p.questions).toEqual(testQuestions);
    expect(p).not.toHaveProperty("history");
    expect(p).not.toHaveProperty("teams");
    const loaded = preparationGame(p);
    expect(loaded.teams[0].score).toBe(0);
    expect(loaded.teams[0].cards.double).toBe(1);
    expect(loaded.rulesConfirmed).toBe(false);
  });
  it("rejects invalid versions, duplicate questions and invalid settings before upload", () => {
    const p = {
      ...emptyPreparation(),
      questions: [testQuestions[0], testQuestions[0]],
    };
    expect(() => parsePreparation(p)).toThrow();
    expect(() =>
      parsePreparation({ ...emptyPreparation(), schemaVersion: 2 }),
    ).toThrow();
    expect(() =>
      parsePreparation({
        ...emptyPreparation(),
        settings: { ...emptyPreparation().settings, stealSeconds: 1.5 },
      }),
    ).toThrow();
  });
  it("does not replace a question currently being played", () => {
    const g = {
      ...initialGame(),
      questions: testQuestions,
      phase: "question",
      host: 0,
      questionIndex: 0,
      startedAt: 1000,
    };
    const stored = JSON.stringify(g);
    localStorage.setItem(STORE, stored);
    expect(() =>
      installPreparation({
        ...emptyPreparation(),
        questions: [testQuestions[0]],
      }),
    ).toThrow("đang có câu hỏi");
    expect(localStorage.getItem(STORE)).toBe(stored);
    expect(localStorage.getItem(UNDO_STORE)).toBeNull();
  });
  it("starts a new local match only when explicitly installed and keeps a checkpoint", () => {
    const g = { ...initialGame(), questions: testQuestions };
    g.teams[0].score = 40;
    localStorage.setItem(STORE, JSON.stringify(g));
    const p = {
      ...emptyPreparation(),
      questions: [testQuestions[0]],
      teamNames: ["A", "B", "C", "D"],
    };
    installPreparation(p);
    const match = JSON.parse(localStorage.getItem(STORE)!);
    expect(match.teams[0].name).toBe("A");
    expect(match.teams[0].score).toBe(0);
    expect(match.questionIndex).toBe(0);
    expect(
      JSON.parse(localStorage.getItem(UNDO_STORE)!)[0].teams[0].score,
    ).toBe(40);
  });
  it("requires round-one content before starting an event", () => {
    expect(() => installPreparation(emptyPreparation())).toThrow("vòng 1");
  });
});
