import { describe, expect, it } from "vitest";
import { initialGame as emptyGame, type Game } from "./game";
import {
  activateCard,
  buzz,
  challengeTeam,
  chooseQuestion,
  closeSteal,
  finishRound,
  nextQuestion,
  openQuestion,
  prepareHint,
  questionTime,
  scoreAnswer,
  scoreSudden,
  selectHost,
  startSudden,
  stealTeam,
  toggleClock,
  validateQuestions,
  normalizeGame,
  createPracticeGame,
} from "./controller";
import { testQuestions } from "./testQuestions";
const initialGame = () => ({ ...emptyGame(), questions: testQuestions });
const prepared = () =>
  prepareHint(selectHost(chooseQuestion(initialGame(), "demo-1"), 0));
describe("MC control flow", () => {
  it("starts with an empty bank and removes legacy question content only once", () => {
    expect(emptyGame().questions).toEqual([]);
    const old = initialGame();
    old.questionBankVersion = undefined;
    old.phase = "question";
    old.questionIndex = 0;
    old.teams[0].score = 25;
    const migrated = normalizeGame(old);
    expect(migrated.questions).toEqual([]);
    expect(migrated.phase).toBe("setup");
    expect(migrated.questionIndex).toBeNull();
    expect(migrated.teams[0].score).toBe(25);
    const authored = { ...migrated, questions: [testQuestions[0]] };
    expect(normalizeGame(authored).questions).toEqual(authored.questions);
  });
  it("does not seed practice questions and copies only a supplied admin bank", () => {
    expect(createPracticeGame().questions).toEqual([]);
    expect(createPracticeGame().questionIndex).toBeNull();
    const practice = createPracticeGame(testQuestions);
    expect(practice.questions).toEqual(testQuestions);
    expect(practice.questions).not.toBe(testQuestions);
  });
  it("requires a question and a host before showing the hint", () => {
    const g = initialGame();
    expect(prepareHint(g)).toBe(g);
    const selected = chooseQuestion(g, "demo-1");
    expect(prepareHint(selected)).toBe(selected);
    expect(prepared().phase).toBe("hint");
  });
  it("completes a Double → wrong host → one Steal → next question flow without duplicate scores", () => {
    let g = openQuestion(activateCard(prepared(), "double"), 1000);
    g = scoreAnswer(g, false, 2000);
    expect(g.phase).toBe("steal-window");
    expect(g.teams[0].score).toBe(-20);
    expect(scoreAnswer(g, false, 2001)).toBe(g);
    g = stealTeam(g, 1);
    expect(g.teams[1].cards.steal).toBe(1);
    expect(g.phase).toBe("steal-answer");
    const duplicate = stealTeam(g, 2);
    expect(duplicate.teams[2].cards.steal).toBe(2);
    g = scoreAnswer(g, true);
    expect(g.teams[1].score).toBe(10);
    expect(g.answerRevealed).toBe(false);
    const result = g;
    g = scoreAnswer(g, true);
    expect(g).toBe(result);
    g = nextQuestion(g);
    expect(g.phase).toBe("setup");
    expect(g.playedQuestionIds).toEqual(["demo-1"]);
    expect(g.questionIndex).toBe(1);
    expect(g.host).toBeNull();
    expect(g.teams[0].cards.double).toBe(0);
    expect(nextQuestion(g)).toBe(g);
    g = selectHost(g, 2);
    expect(g.host).toBe(2);
  });
  it("burns Safe on Challenge and stops immediately after an incorrect challenged answer", () => {
    let g = openQuestion(activateCard(prepared(), "safe"), 1000);
    g = challengeTeam(g, 2, 2000);
    expect(g.phase).toBe("challenge");
    expect(g.usedCard).toBeNull();
    expect(g.teams[0].cards.safe).toBe(0);
    expect(g.teams[0].cards.challenge).toBe(0);
    g = scoreAnswer(g, false);
    expect(g.phase).toBe("result");
    expect(g.teams[2].score).toBe(-10);
    expect(stealTeam(g, 3).teams[3].cards.steal).toBe(2);
  });
  it("scores the returning host at base value after a successful Challenge burns Double", () => {
    let g = prepared();
    g = { ...g, settings: { ...g.settings, challengeCorrect: "host" } };
    g = challengeTeam(openQuestion(activateCard(g, "double"), 1000), 1, 2000);
    g = scoreAnswer(g, true);
    expect(g.phase).toBe("host-answer");
    expect(g.teams[1].score).toBe(10);
    g = scoreAnswer(g, true);
    expect(g.teams[0].score).toBe(10);
    expect(g.phase).toBe("result");
  });
  it("never displays more than the question duration when a rendered clock tick predates opening", () => {
    const g = openQuestion(prepared(), 1000);
    expect(questionTime(g, 950).seconds).toBe(30);
    expect(questionTime(g, 950).elapsed).toBe(0);
    expect(questionTime(g, 1001).seconds).toBe(30);
  });
  it("preserves the clock through pause/resume and rejects Challenge while paused or after its deadline", () => {
    let g = openQuestion(prepared(), 1000);
    g = toggleClock(g, 11000);
    expect(questionTime(g, 90000).seconds).toBe(20);
    expect(challengeTeam(g, 1, 12000).phase).toBe("question");
    g = toggleClock(g, 100000);
    expect(questionTime(g, 102000).seconds).toBe(18);
    expect(challengeTeam(g, 1, 102000).phase).toBe("challenge");
    expect(challengeTeam(g, 1, 106000).phase).toBe("question");
    expect(questionTime(g, 200000).seconds).toBe(0);
    expect(g.phase).toBe("question");
  });
  it("uses the configured no-Steal outcome and prevents stale Steal timeout actions", () => {
    let g = scoreAnswer(openQuestion(prepared(), 1000), false, 2000);
    const history = g.history.length;
    g = closeSteal(g);
    expect(g.phase).toBe("result");
    expect(g.history.length).toBe(history);
    expect(closeSteal(g)).toBe(g);
    let retry = prepared();
    retry = { ...retry, settings: { ...retry.settings, noSteal: "host" } };
    retry = closeSteal(scoreAnswer(openQuestion(retry, 1000), false, 2000));
    expect(retry.phase).toBe("host-answer");
  });
  it("moves across a round without resetting points or cards", () => {
    let g = scoreAnswer(
      openQuestion(activateCard(prepared(), "double"), 1000),
      true,
    );
    g = { ...nextQuestion(g), phase: "round-summary" };
    g = finishRound(g);
    expect(g.round).toBe(2);
    expect(g.phase).toBe("setup");
    expect(g.teams[0].score).toBe(20);
    expect(g.teams[0].cards.double).toBe(0);
  });
  it("accepts only the first buzzer and runs all four tied teams through successive duels", () => {
    let g: Game = { ...initialGame(), phase: "finished" };
    g = startSudden(g);
    expect(g.suddenTeams).toEqual([0, 1]);
    expect(g.suddenQueue).toEqual([2, 3]);
    g = buzz(g, 0);
    expect(buzz(g, 1)).toBe(g);
    g = scoreSudden(g, true);
    expect(g.suddenTeams).toEqual([0, 2]);
    g = scoreSudden(buzz(g, 0), false);
    expect(g.suddenTeams).toEqual([2, 3]);
    g = scoreSudden(buzz(g, 3), true);
    expect(g.phase).toBe("finished");
    expect(g.suddenWinner).toBe(3);
    expect(g.teams.every((t) => t.score === 0)).toBe(true);
  });
  it("validates question imports before replacing a live question bank", () => {
    expect(() =>
      validateQuestions([{ round: 4, text: "Question", answer: "Answer" }]),
    ).toThrow();
    expect(() => validateQuestions([])).toThrow();
    const q = initialGame().questions[0];
    expect(validateQuestions([q])[0].text).toBe(q.text);
  });
});
