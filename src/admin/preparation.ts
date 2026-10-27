import { initialGame, type Game, type Question, type Settings } from "../game";
import {
  isLive,
  normalizeGame,
  STORE,
  UNDO_STORE,
  validateQuestions,
} from "../controller";

export type Preparation = {
  schemaVersion: 1;
  questions: Question[];
  teamNames: string[];
  settings: Settings;
};
export const emptyPreparation = (): Preparation => ({
  schemaVersion: 1,
  questions: [],
  teamNames: initialGame().teams.map((t) => t.name),
  settings: { ...initialGame().settings },
});
export function parsePreparation(input: unknown): Preparation {
  if (!input || typeof input !== "object")
    throw new Error("Bộ đề trên tài khoản không đúng định dạng.");
  const p = input as Preparation;
  if (
    p.schemaVersion !== 1 ||
    !Array.isArray(p.questions) ||
    p.questions.length > 1000 ||
    !Array.isArray(p.teamNames) ||
    p.teamNames.length !== 4 ||
    !p.teamNames.every(
      (n) => typeof n === "string" && n.trim().length > 0 && n.length <= 35,
    ) ||
    !p.settings
  )
    throw new Error("Bộ đề thiếu tên đội hoặc nội dung hợp lệ.");
  const s = p.settings;
  if (
    !["manual", "rotate", "random"].includes(s.hostMode) ||
    !["end", "host"].includes(s.challengeCorrect) ||
    !["end", "host"].includes(s.noSteal) ||
    !["bracket", "shared"].includes(s.multiTie) ||
    !Number.isInteger(s.stealSeconds) ||
    s.stealSeconds < 0 ||
    s.stealSeconds > 120
  )
    throw new Error("Quy ước trong bộ đề không hợp lệ.");
  if (
    p.questions.some((q) => typeof q?.id !== "string" || !q.id) ||
    new Set(p.questions.map((q) => q.id)).size !== p.questions.length
  )
    throw new Error("Mã câu hỏi bị thiếu hoặc trùng lặp.");
  return {
    schemaVersion: 1,
    questions: p.questions.length ? validateQuestions(p.questions) : [],
    teamNames: p.teamNames.map((n) => n.trim()),
    settings: {
      hostMode: s.hostMode,
      challengeCorrect: s.challengeCorrect,
      stealSeconds: s.stealSeconds,
      noSteal: s.noSteal,
      multiTie: s.multiTie,
    },
  };
}
export function preparationGame(input: Preparation): Game {
  const p = parsePreparation(input),
    base = initialGame();
  return {
    ...base,
    questions: p.questions,
    teams: base.teams.map((t, i) => ({ ...t, name: p.teamNames[i] })),
    settings: p.settings,
  };
}
export function fromPreparationGame(g: Game): Preparation {
  return parsePreparation({
    schemaVersion: 1,
    questions: g.questions,
    teamNames: g.teams.map((t) => t.name),
    settings: g.settings,
  });
}
export const fingerprint = (p: Preparation) => JSON.stringify(p);
export function installPreparation(p: Preparation): void {
  const previous = normalizeGame(
    JSON.parse(localStorage.getItem(STORE) ?? "null"),
  );
  if (isLive(previous))
    throw new Error(
      "Máy này đang có câu hỏi thi đấu. Hoàn tất câu đó trước khi dùng bộ đề mới.",
    );
  const next = preparationGame(p),
    first = next.questions.findIndex((q) => q.round === 1);
  if (first < 0)
    throw new Error("Bộ đề cần ít nhất một câu hỏi ở vòng 1 để bắt đầu.");
  next.questionIndex = first;
  let undo: Game[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem(UNDO_STORE) ?? "[]");
    if (Array.isArray(stored)) undo = stored.map(normalizeGame);
  } catch {}
  localStorage.setItem(
    UNDO_STORE,
    JSON.stringify([...undo.slice(-29), previous]),
  );
  localStorage.setItem(STORE, JSON.stringify(next));
}
