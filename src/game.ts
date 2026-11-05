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
  round: number;
  difficulty: Difficulty;
  hint: string;
  text: string;
  answer: string;
  image?: string;
  seconds?: number;
};
export type Team = {
  name: string;
  score: number;
  cards: { double: number; safe: number; challenge: number; steal: number };
};
export type Settings = {
  roundNames?: string[];
  hostMode: "manual" | "rotate" | "random";
  challengeCorrect: "end" | "host";
  stealSeconds: number;
  noSteal: "end" | "host";
  multiTie: "bracket" | "shared";
};
export type CardActivation = { id: string; card: CardType; team: number; teamName: string; targetName?: string; result?: {delta:number; total:number; correct:boolean; sourceName:string}; at: number };
export type Game = {
  introSlide?: number | null;
  cardPreview?: "none" | "double" | "safe";
  rulesVersion?: number;
  drawOrders?: Record<number,number[]>;
  hostTurns?: {round:number;team:number;questionId:string}[];
  cardActivation?: CardActivation;
  cardOutcome?: CardActivation;
  teams: Team[];
  questions: Question[];
  questionBankVersion?: number;
  boardSelectedId?: string | null;
  hintRead?: boolean;
  rulesConfirmed?: boolean;
  round: number;
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
  easy: { points: 10, seconds: 30, challenge: 15, label: "Easy" },
  medium: { points: 20, seconds: 45, challenge: 20, label: "Medium" },
  hard: { points: 30, seconds: 60, challenge: 30, label: "Hard" },
};
export function englishTeamName(name: string, index: number): string {
  return name === `Đội ${index + 1}` ? `Team ${index + 1}` : name;
}

export function englishRoundName(name: string, index: number): string {
  return name === `Vòng ${index + 1}` ? `Round ${index + 1}` : name;
}

export const initialGame = (): Game => ({
  rulesVersion:4,
  drawOrders:{},
  hostTurns: [],
  teams: ["Team 1", "Team 2", "Team 3", "Team 4"].map((name) => ({
    name,
    score: 10,
    cards: { double: 1, safe: 1, challenge: 1, steal: 2 },
  })),
  questions: [],
  questionBankVersion: 2,
  boardSelectedId: null,
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
      label: `${teams[teamIndex].name} · ${correct ? "correct" : "incorrect"} · ${kind === "host" ? "original team" : kind === "challenge" ? "Challenge" : "Steal"}`,
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
    return fail("Invalid team.");
  if (
    host === null ||
    (card === "steal" && team === host) ||
    (card !== "steal" && team !== host)
  )
    return fail("This team cannot play a card right now.");
  if (g.teams[team].cards[card] <= 0) return fail("This team has no copies of that card left.");
  if (card === "double" || card === "safe") {
    if (g.phase !== "hint")
      return fail("Play this card after the hint and before revealing the question.");
    if (!g.hintRead)
      return fail("Read the hint before taking card choices.");
    if (g.usedCard)
      return fail("Only one card can be played before revealing a question.");
  } else if (card === "challenge") {
    if (g.phase !== "question")
      return fail("Play Challenge while the question is open.");
    if (g.paused) return fail("Resume the timer before playing Challenge.");
    if (
      g.startedAt === null ||
      g.questionIndex === null ||
      !g.questions[g.questionIndex]
    )
      return fail("The question has not been revealed.");
    const elapsed = (now - (g.startedAt ?? now)) / 1000,
      limit = DIFFICULTY[g.questions[g.questionIndex!].difficulty].challenge;
    if (elapsed > limit) return fail("The Challenge window has closed.");
  } else if (card === "steal") {
    if (g.phase !== "steal-window")
      return fail("Play Steal after the original team answers incorrectly.");
    if (g.stealUsed) return fail("This question already had a Steal attempt.");
    if (g.stealDeadline != null && now >= g.stealDeadline)
      return fail("The Steal window has closed.");
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
      cardActivation: {id: crypto.randomUUID(), card, team, teamName:g.teams[team].name, at:now},
      usedCard: card === "double" || card === "safe" ? card : g.usedCard,
      phase: card === "steal" ? "steal-answer" : g.phase,
      answering: card === "steal" ? team : g.answering,
      stealUsed: card === "steal" ? true : g.stealUsed,
      notice: "",
    },
  };
}

export const questionSeconds = (q: Question) => q.seconds ?? DIFFICULTY[q.difficulty].seconds;

export function gameRounds(g: Pick<Game, 'questions' | 'settings'>): string[] {
  const names = g.settings.roundNames ?? (g.questions.length === 12 && g.questions.every(q=>q.id.startsWith('group7-ch8-')) ? ['Warm-up','Identifying Types of Barriers','Sơn Tùng M-TP Case Study'] : undefined);
  const count = Math.max(names?.length ?? 3, ...g.questions.map(q => q.round));
  return Array.from({length: count}, (_, i) => englishRoundName(names?.[i] || `Round ${i + 1}`, i));
}
