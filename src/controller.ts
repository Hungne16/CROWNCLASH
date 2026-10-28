import {
  applyOutcome,
  DIFFICULTY,
  initialGame,
  rankTeams,
  remainingCards,
  useCard,
  type CardType,
  type Game,
  type Question,
} from "./game";

export const STORE = "dautri-game-v1";
export const UNDO_STORE = "dautri-undo-v2";
export function createPracticeGame(questions: Question[] = []): Game {
  const game = initialGame();
  return {
    ...game,
    questions: questions.map((q) => ({ ...q })),
    questionIndex:
      questions.findIndex((q) => q.round === 1) < 0
        ? null
        : questions.findIndex((q) => q.round === 1),
    settings: { ...game.settings, stealSeconds: 60 },
    rulesConfirmed: true,
  };
}
export const isLive = (g: Game) =>
  [
    "hint",
    "question",
    "challenge",
    "host-answer",
    "steal-window",
    "steal-answer",
  ].includes(g.phase);
export const currentQuestion = (g: Game) =>
  g.questionIndex === null ? null : (g.questions[g.questionIndex] ?? null);
export const remainingQuestions = (g: Game) =>
  g.questions.filter(
    (q) => q.round === g.round && !(g.playedQuestionIds ?? []).includes(q.id),
  );
export function tiedLeaders(g: Game) {
  const ranks = rankTeams(g.teams),
    top = ranks[0].team;
  return ranks
    .filter(
      ({ team }) =>
        team.score === top.score &&
        remainingCards(team) === remainingCards(top),
    )
    .map(({ index }) => index);
}
export function rankingRows(g: Game) {
  const rows = rankTeams(g.teams);
  if (g.suddenWinner !== null)
    rows.sort(
      (a, b) =>
        Number(b.index === g.suddenWinner) - Number(a.index === g.suddenWinner),
    );
  let place = 1;
  return rows.map((row, i) => {
    const same = (other: typeof row) =>
      other.team.score === row.team.score &&
      remainingCards(other.team) === remainingCards(row.team);
    if (
      i === 0 ||
      row.index === g.suddenWinner ||
      rows[i - 1].index === g.suddenWinner ||
      !same(rows[i - 1])
    )
      place = i + 1;
    const shared =
      row.index !== g.suddenWinner &&
      rows.some(
        (other) =>
          other.index !== row.index &&
          other.index !== g.suddenWinner &&
          same(other),
      );
    return { ...row, place, shared };
  });
}
export function normalizeGame(value: unknown): Game {
  const base = initialGame();
  if (!value || typeof value !== "object") return base;
  const g = value as Game;
  if (
    !Array.isArray(g.teams) ||
    g.teams.length !== 4 ||
    !g.teams.every(
      (t) =>
        typeof t.name === "string" &&
        Number.isFinite(t.score) &&
        t.cards &&
        ["double", "safe", "challenge", "steal"].every((k) =>
          Number.isFinite(t.cards[k as CardType]),
        ),
    )
  )
    return base;
  if (
    !Array.isArray(g.questions) ||
    !Array.isArray(g.history) ||
    ![1, 2, 3].includes(g.round)
  )
    return base;
  // One-time removal requested by the admin; later authored banks keep this version.
  if (g.questionBankVersion !== 2) {
    return {
      ...base,
      ...g,
      questionBankVersion: 2,
      questions: [],
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
      playedQuestionIds: [],
      answerRevealed: false,
      stealDeadline: null,
      suddenTeams: [],
      suddenWinner: null,
      suddenQueue: [],
      suddenQuestion: "",
      suddenAnswer: "",
      questionHistoryStart: g.history?.length ?? 0,
      settings: { ...base.settings, ...g.settings },
      notice: "",
    };
  }
  const phases = [
    "setup",
    "hint",
    "question",
    "challenge",
    "host-answer",
    "steal-window",
    "steal-answer",
    "result",
    "round-summary",
    "sudden-death",
    "finished",
  ];
  return {
    ...base,
    ...g,
    phase: phases.includes(g.phase) ? g.phase : "setup",
    settings: { ...base.settings, ...g.settings },
    playedQuestionIds: g.playedQuestionIds ?? [],
    questionHistoryStart:
      g.questionHistoryStart ?? Math.max(0, g.history.length - 1),
    answerRevealed: g.answerRevealed ?? g.phase === "result",
    hintRead: g.hintRead ?? (g.phase !== "hint" || !!g.usedCard),
    stealDeadline:
      g.stealDeadline ??
      (g.phase === "steal-window"
        ? Date.now() + g.settings.stealSeconds * 1000
        : null),
  };
}
export function loadGame(storageKey = STORE): Game {
  try {
    let g = normalizeGame(
      JSON.parse(localStorage.getItem(storageKey) ?? "null"),
    );
    if (g.phase === "setup" && !currentQuestion(g)) {
      const first = remainingQuestions(g)[0];
      if (first) g = {...g, questionIndex:g.questions.findIndex(q=>q.id===first.id)};
    }
    return g.phase === "setup" && g.host === null ? assignHost(g) : g;
  } catch {
    return initialGame();
  }
}
export function chooseQuestion(g: Game, id: string): Game {
  if (g.phase !== "setup") return g;
  const index = g.questions.findIndex(
    (q) => q.id === id && q.round === g.round,
  );
  if (index < 0 || (g.playedQuestionIds ?? []).includes(id)) return g;
  return { ...g, questionIndex: index, boardSelectedId:id, notice: "" };
}
export function prepareHint(g: Game): Game {
  if (g.phase !== "setup" || !currentQuestion(g) || g.host === null) return g;
  if (g.boardSelectedId !== currentQuestion(g)!.id || (g.playedQuestionIds ?? []).includes(currentQuestion(g)!.id)) return g;
  if (!g.rulesConfirmed)
    return {
      ...g,
      notice: "Cần thống nhất 5 quy ước bổ sung trước khi bắt đầu trận.",
    };
  if (!currentQuestion(g)!.hint.trim())
    return {
      ...g,
      notice:
        "Câu này chưa có gợi ý. Hãy bổ sung gợi ý trong bộ câu hỏi trước khi chơi.",
    };
  return {
    ...g,
    phase: "hint",
    hintRead: false,
    usedCard: null,
    answering: null,
    challengeAt: null,
    startedAt: null,
    remainingMs: null,
    paused: false,
    stealUsed: false,
    lastDelta: null,
    questionHistoryStart: g.history.length,
    answerRevealed: false,
    stealDeadline: null,
    notice: "",
  };
}
export function acknowledgeHint(g: Game): Game {
  if (g.phase !== "hint" || !currentQuestion(g)?.hint.trim()) return g;
  return { ...g, hintRead: true, notice: "" };
}
export function confirmRules(g: Game): Game {
  return g.phase === "setup" ? { ...g, rulesConfirmed: true, notice: "" } : g;
}
export function selectHost(g: Game, index: number): Game {
  if (g.phase !== "setup" || index < 0 || index > 3) return g;
  return { ...g, host: index, notice: "" };
}
export function assignHost(g: Game): Game {
  if (g.phase !== "setup") return g;
  if (g.settings.hostMode === "random")
    return { ...g, host: Math.floor(Math.random() * 4) };
  if (g.settings.hostMode === "rotate")
    return { ...g, host: (g.playedQuestionIds?.length ?? 0) % 4 };
  return g;
}
export function activateCard(g: Game, card: "double" | "safe"): Game {
  if (g.host === null) return g;
  const result = useCard(g, g.host, card);
  return result.ok ? result.game : { ...g, notice: result.error ?? "" };
}
export function openQuestion(g: Game, now = Date.now()): Game {
  const q = currentQuestion(g);
  if (g.phase !== "hint" || !q || g.host === null || !g.hintRead) return g;
  return {
    ...g,
    phase: "question",
    startedAt: now,
    remainingMs: DIFFICULTY[q.difficulty].seconds * 1000,
    paused: false,
    notice: "",
  };
}
export function questionTime(g: Game, now = Date.now()) {
  const q = currentQuestion(g),
    duration = q ? DIFFICULTY[q.difficulty].seconds * 1000 : 0;
  const remaining = g.paused
    ? Math.min(
        duration,
        g.remainingMs ??
          Math.max(0, duration - Math.max(0, now - (g.startedAt ?? now))),
      )
    : Math.max(0, duration - Math.max(0, now - (g.startedAt ?? now)));
  return {
    remaining,
    elapsed: duration - remaining,
    seconds: Math.ceil(remaining / 1000),
  };
}
export function toggleClock(g: Game, now = Date.now()): Game {
  if (g.phase !== "question" || questionTime(g, now).remaining <= 0) return g;
  if (g.paused) {
    const duration = DIFFICULTY[currentQuestion(g)!.difficulty].seconds * 1000;
    return {
      ...g,
      paused: false,
      startedAt: now - (duration - (g.remainingMs ?? duration)),
      notice: "",
    };
  }
  return {
    ...g,
    paused: true,
    remainingMs: questionTime(g, now).remaining,
    notice: "",
  };
}
export function challengeTeam(g: Game, index: number, now = Date.now()): Game {
  if (g.host === null || index === g.host || index < 0 || index > 3) return g;
  // Older saved games can be waiting for the target after consuming Challenge.
  if (g.phase === "challenge" && g.answering === null)
    return { ...g, answering: index, usedCard: null };
  const result = useCard(g, g.host, "challenge", now);
  if (!result.ok) return { ...g, notice: result.error ?? "" };
  const burned = g.usedCard
    ? ` Thẻ ${g.usedCard === "double" ? "Double" : "Safe"} của chủ nhà đã cháy.`
    : "";
  return {
    ...result.game,
    cardActivation: result.game.cardActivation ? {...result.game.cardActivation, targetName:g.teams[index].name} : undefined,
    phase: "challenge",
    answering: index,
    usedCard: null,
    challengeAt: now,
    notice: `${g.teams[index].name} bị Challenge.${burned}`,
  };
}
export function scoreAnswer(
  g: Game,
  correct: boolean,
  now = Date.now(),
  expectedPhase?: Game["phase"],
): Game {
  if (expectedPhase && g.phase !== expectedPhase) return g;
  const kind =
    g.phase === "challenge"
      ? "challenge"
      : g.phase === "steal-answer"
        ? "steal"
        : "host";
  const allowed = [
    "question",
    "host-answer",
    "challenge",
    "steal-answer",
  ].includes(g.phase);
  const index = kind === "host" ? g.host : g.answering;
  if (!allowed || index === null || !currentQuestion(g)) return g;
  let next = applyOutcome(g, index, correct, kind).game;
  const resultCard = kind === "host" ? g.usedCard : kind;
  if (resultCard) next = {...next, cardOutcome:{
    id:crypto.randomUUID(),at:now,card:resultCard,team:index,teamName:g.teams[index].name,
    result:{delta:next.lastDelta![index],total:next.teams[index].score,correct,sourceName:g.teams[g.host!].name},
  }};

  next = {
    ...next,
    phase: "result",
    answering: index,
    answerRevealed: false,
    notice: correct
      ? "Đã ghi nhận câu trả lời đúng."
      : "Đã ghi nhận câu trả lời sai.",
  };
  if (kind === "challenge") {
    if (correct && g.settings.challengeCorrect === "host")
      return {
        ...next,
        phase: "host-answer",
        answering: g.host,
        usedCard: null,
        notice: "Challenge đúng. Chủ nhà tiếp tục theo quy ước đã chọn.",
      };
    return {
      ...next,
      usedCard: null,
      notice: correct
        ? "Challenge đúng. Câu hỏi kết thúc."
        : "Challenge sai. Câu hỏi kết thúc, không có Steal.",
    };
  }
  if (kind === "host" && !correct && !g.stealUsed) {
    const eligible = g.teams.some((t, i) => i !== g.host && t.cards.steal > 0);
    if (eligible && g.settings.stealSeconds > 0)
      return {
        ...next,
        phase: "steal-window",
        stealDeadline: now + g.settings.stealSeconds * 1000,
        notice: "Chọn đội giơ thẻ Steal nhanh nhất.",
      };
    if (g.settings.noSteal === "host")
      return {
        ...next,
        phase: "host-answer",
        answering: g.host,
        notice: "Không có lượt Steal. Chủ nhà được trả lời lại theo quy ước.",
      };
  }
  return next;
}
export function stealTeam(g: Game, index: number, now = Date.now()): Game {
  if (
    g.phase === "steal-window" &&
    g.stealDeadline != null &&
    now >= g.stealDeadline
  )
    return closeSteal(g);
  const result = useCard(g, index, "steal", now);
  return result.ok
    ? { ...result.game, notice: `${g.teams[index].name} giành quyền Steal.` }
    : { ...g, notice: result.error ?? "" };
}
export function closeSteal(g: Game): Game {
  if (g.phase !== "steal-window") return g;
  return {
    ...g,
    phase: g.settings.noSteal === "host" ? "host-answer" : "result",
    answering: g.settings.noSteal === "host" ? g.host : g.answering,
    notice:
      g.settings.noSteal === "host"
        ? "Không có đội Steal. Chủ nhà được trả lời lại theo quy ước."
        : "Không có đội Steal. Câu hỏi kết thúc.",
  };
}
export function nextQuestion(g: Game): Game {
  if (g.phase !== "result") return g;
  const q = currentQuestion(g),
    played = [
      ...new Set([...(g.playedQuestionIds ?? []), ...(q ? [q.id] : [])]),
    ];
  const index = g.questions.findIndex(
    (x) => x.round === g.round && !played.includes(x.id),
  );
  let next: Game = {
    ...g,
    phase: index < 0 ? "round-summary" : "setup",
    playedQuestionIds: played,
    boardSelectedId:null,
    questionIndex: index < 0 ? null : index,
    host: g.settings.hostMode === "manual" ? null : g.host,
    usedCard: null,
    hintRead: false,
    answering: null,
    startedAt: null,
    remainingMs: null,
    paused: false,
    stealUsed: false,
    answerRevealed: false,
    lastDelta: null,
    notice: "",
  };
  next = assignHost(next);
  return next;
}
export function finishRound(g: Game): Game {
  if (g.phase !== "setup" && g.phase !== "round-summary") return g;
  if (g.round === 3)
    return { ...g, phase: "finished", questionIndex: null, answering: null };
  const round = (g.round + 1) as 1 | 2 | 3,
    index = g.questions.findIndex(
      (q) => q.round === round && !(g.playedQuestionIds ?? []).includes(q.id),
    );
  return assignHost({
    ...g,
    round,
    boardSelectedId:null,
    phase: "setup",
    questionIndex: index < 0 ? null : index,
    host: null,
    answering: null,
    notice: "",
  });
}
export function startSudden(g: Game): Game {
  if (g.phase !== "finished") return g;
  const teams = tiedLeaders(g);
  if (teams.length < 2) return g;
  const bracket = g.settings.multiTie === "bracket";
  return {
    ...g,
    phase: "sudden-death",
    suddenTeams: bracket ? teams.slice(0, 2) : teams,
    suddenQueue: bracket ? teams.slice(2) : [],
    suddenWinner: null,
    answering: null,
    suddenQuestion: "",
    suddenAnswer: "",
    answerRevealed: false,
    notice: "",
  };
}
export function buzz(g: Game, index: number): Game {
  if (
    g.phase !== "sudden-death" ||
    g.answering !== null ||
    !g.suddenTeams.includes(index)
  )
    return g;
  return { ...g, answering: index };
}
export function scoreSudden(g: Game, correct: boolean): Game {
  if (g.phase !== "sudden-death" || g.answering === null) return g;
  let winner: number | null = correct ? g.answering : null;
  const left = g.suddenTeams.filter((i) => i !== g.answering);
  if (!correct && left.length === 1) winner = left[0];
  if (winner === null)
    return {
      ...g,
      suddenTeams: left,
      answering: null,
      notice:
        "Đội trả lời sai dừng tham gia câu phụ này. Các đội còn lại tiếp tục.",
    };
  if (g.settings.multiTie === "bracket" && (g.suddenQueue?.length ?? 0) > 0) {
    const [next, ...queue] = g.suddenQueue!;
    return {
      ...g,
      suddenTeams: [winner, next],
      suddenQueue: queue,
      answering: null,
      suddenQuestion: "",
      suddenAnswer: "",
      notice: `${g.teams[winner].name} thắng lượt đối đầu. Tiếp tục với ${g.teams[next].name}.`,
    };
  }
  return {
    ...g,
    phase: "finished",
    suddenWinner: winner,
    answering: null,
    notice: "Đã xác định đội vô địch bằng Sudden Death.",
  };
}
export function validateQuestions(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("File cần chứa một mảng câu hỏi.");
  const ids = new Set<string>();
  return value.map((q, i) => {
    if (
      !q ||
      ![1, 2, 3].includes(q.round) ||
      !["easy", "medium", "hard"].includes(q.difficulty) ||
      typeof q.hint !== "string" ||
      !q.hint.trim() ||
      typeof q.text !== "string" ||
      !q.text.trim() ||
      typeof q.answer !== "string" ||
      !q.answer.trim()
    )
      throw new Error(
        `Câu ${i + 1} thiếu gợi ý, nội dung, đáp án hoặc sai vòng / độ khó.`,
      );
    const id =
      typeof q.id === "string" && !ids.has(q.id) ? q.id : crypto.randomUUID();
    ids.add(id);
    return {
      id,
      round: q.round,
      difficulty: q.difficulty,
      hint: q.hint,
      text: q.text,
      answer: q.answer,
      ...(typeof q.image === "string" ? { image: q.image } : {}),
    };
  });
}
