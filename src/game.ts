export type Difficulty = "easy" | "medium" | "hard";
export type Phase =
  | "setup"
  | "hint"
  | "question"
  | "challenge"
  | "host-answer"
  | "steal-window"
  | "steal-answer"
  | "result"
  | "round-summary"
  | "sudden-death"
  | "finished";
export type CardType = "double" | "safe" | "challenge" | "steal";
export type Question = {
  id: string;
  round: 1 | 2 | 3;
  difficulty: Difficulty;
  hint: string;
  text: string;
  answer: string;
  image?: string;
};
export type Team = {
  name: string;
  score: number;
  cards: { double: number; safe: number; challenge: number; steal: number };
};
export type Settings = {
  hostMode: "manual" | "rotate" | "random";
  challengeCorrect: "end" | "host";
  stealSeconds: number;
  noSteal: "end" | "host";
  multiTie: "bracket" | "shared";
};
export type Game = {
  teams: Team[];
  questions: Question[];
  questionBankVersion?: number;
  hintRead?: boolean;
  rulesConfirmed?: boolean;
  round: 1 | 2 | 3;
  phase: Phase;
  questionIndex: number | null;
  host: number | null;
  answering: number | null;
  usedCard: CardType | null;
  challengeAt: number | null;
  startedAt: number | null;
  remainingMs: number | null;
  paused: boolean;
  stealUsed: boolean;
  lastDelta: number[] | null;
  history: { label: string; delta: number[]; time: number }[];
  settings: Settings;
  notice: string;
  suddenTeams: number[];
  suddenWinner: number | null;
  playedQuestionIds?: string[];
  questionHistoryStart?: number;
  answerRevealed?: boolean;
  stealDeadline?: number | null;
  suddenQueue?: number[];
  suddenQuestion?: string;
  suddenAnswer?: string;
};
export const DIFFICULTY: Record<
  Difficulty,
  { points: number; seconds: number; challenge: number; label: string }
> = {
  easy: { points: 10, seconds: 30, challenge: 15, label: "Dễ" },
  medium: { points: 20, seconds: 45, challenge: 20, label: "Trung bình" },
  hard: { points: 30, seconds: 60, challenge: 30, label: "Khó" },
};
export const initialGame = (): Game => ({
  teams: ["Đội 1", "Đội 2", "Đội 3", "Đội 4"].map((name) => ({
    name,
    score: 0,
    cards: { double: 1, safe: 1, challenge: 1, steal: 2 },
  })),
  questions: [],
  questionBankVersion: 2,
  hintRead: false,
  rulesConfirmed: false,
  round: 1,
  phase: "setup",
  questionIndex: null,
  host: null,
  answering: null,
  usedCard: null,
  challengeAt: null,
  startedAt: null,
  remainingMs: null,
  paused: false,
  stealUsed: false,
  lastDelta: null,
  history: [],
  settings: {
    hostMode: "manual",
    challengeCorrect: "end",
    stealSeconds: 10,
    noSteal: "end",
    multiTie: "bracket",
  },
  notice: "",
  suddenTeams: [],
  suddenWinner: null,
});
export const pointsFor = (q: Question) => DIFFICULTY[q.difficulty].points;
export function rankTeams(teams: Team[]) {
  return teams
    .map((team, index) => ({ index, team }))
    .sort(
      (a, b) =>
        b.team.score - a.team.score ||
        remainingCards(b.team) - remainingCards(a.team),
    );
}
export function remainingCards(team: Team) {
  return (
    team.cards.double +
    team.cards.safe +
    team.cards.challenge +
    team.cards.steal
  );
}
export function applyOutcome(
  g: Game,
  teamIndex: number,
  correct: boolean,
  kind: "host" | "challenge" | "steal",
): { game: Game; delta: number } {
  const q = g.questions[g.questionIndex!],
    base = pointsFor(q);
  let amount = correct ? base : -base;
  if (kind === "host" && g.usedCard === "double") amount *= 2;
  if (kind === "host" && g.usedCard === "safe" && !correct) amount = 0;
  const teams = g.teams.map((t, i) =>
    i === teamIndex ? { ...t, score: t.score + amount } : t,
  );
  const delta = Array(4).fill(0);
  delta[teamIndex] = amount;
  const history = [
    ...g.history,
    {
      label: `${teams[teamIndex].name} · ${correct ? "đúng" : "sai"} · ${kind === "host" ? "chủ nhà" : kind === "challenge" ? "Challenge" : "Steal"}`,
      delta,
      time: Date.now(),
    },
  ];
  return { game: { ...g, teams, history, lastDelta: delta }, delta: amount };
}
export function useCard(
  g: Game,
  team: number,
  card: CardType,
  now = Date.now(),
): { ok: boolean; game: Game; error?: string } {
  const fail = (error: string) => ({
    ok: false,
    game: { ...g, notice: error },
    error,
  });
  const host = g.host;
  if (!Number.isInteger(team) || team < 0 || team >= g.teams.length)
    return fail("Đội không hợp lệ.");
  if (
    host === null ||
    (card === "steal" && team === host) ||
    (card !== "steal" && team !== host)
  )
    return fail("Đội này không được dùng thẻ vào thời điểm hiện tại.");
  if (g.teams[team].cards[card] <= 0) return fail("Đội này đã hết thẻ đó.");
  if (card === "double" || card === "safe") {
    if (g.phase !== "hint")
      return fail("Thẻ này chỉ dùng sau gợi ý, trước khi mở câu hỏi.");
    if (!g.hintRead)
      return fail("MC cần đọc xong gợi ý trước khi nhận lựa chọn thẻ.");
    if (g.usedCard)
      return fail("Mỗi câu chỉ dùng một thẻ trước khi mở câu hỏi.");
  } else if (card === "challenge") {
    if (g.phase !== "question")
      return fail("Challenge chỉ dùng khi câu hỏi đang mở.");
    if (g.paused) return fail("Hãy tiếp tục đồng hồ trước khi dùng Challenge.");
    if (
      g.startedAt === null ||
      g.questionIndex === null ||
      !g.questions[g.questionIndex]
    )
      return fail("Câu hỏi chưa được mở.");
    const elapsed = (now - (g.startedAt ?? now)) / 1000,
      limit = DIFFICULTY[g.questions[g.questionIndex!].difficulty].challenge;
    if (elapsed > limit) return fail("Đã hết thời hạn Challenge.");
  } else if (card === "steal") {
    if (g.phase !== "steal-window")
      return fail("Steal chỉ dùng sau khi chủ nhà trả lời sai.");
    if (g.stealUsed) return fail("Câu này đã có một lượt Steal.");
    if (g.stealDeadline != null && now >= g.stealDeadline)
      return fail("Đã hết thời gian nhận Steal.");
  }
  const teams = g.teams.map((t, i) => {
    if (i !== team) return t;
    const cards = { ...t.cards, [card]: t.cards[card] - 1 };
    // Committing to a Challenge burns a pre-question protection card permanently.
    if (
      card === "challenge" &&
      (g.usedCard === "double" || g.usedCard === "safe")
    )
      cards[g.usedCard] = 0;
    return { ...t, cards };
  });
  return {
    ok: true,
    game: {
      ...g,
      teams,
      usedCard: card === "double" || card === "safe" ? card : g.usedCard,
      phase: card === "steal" ? "steal-answer" : g.phase,
      answering: card === "steal" ? team : g.answering,
      stealUsed: card === "steal" ? true : g.stealUsed,
      notice: "",
    },
  };
}
