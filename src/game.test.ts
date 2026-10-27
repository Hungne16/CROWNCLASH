import { describe, it, expect } from "vitest";
import {
  applyOutcome,
  initialGame as emptyGame,
  rankTeams,
  useCard,
  pointsFor,
  DIFFICULTY,
} from "./game";
import { testQuestions } from "./testQuestions";
const initialGame = () => ({ ...emptyGame(), questions: testQuestions });
const game = (phase: any = "hint") => {
  const g = initialGame();
  return {
    ...g,
    phase,
    hintRead: true,
    questionIndex: 0,
    host: 0,
    startedAt: 1000,
  };
};
describe("game rules", () => {
  it("maps difficulty to points and timer", () => {
    expect(pointsFor(game().questions[0])).toBe(10);
    expect(DIFFICULTY.hard.seconds).toBe(60);
  });
  it("allows negative scores for a wrong host answer", () => {
    expect(applyOutcome(game(), 0, false, "host").game.teams[0].score).toBe(
      -10,
    );
  });
  it("applies double and safe host cards", () => {
    const g = game();
    g.usedCard = "double";
    expect(applyOutcome(g, 0, true, "host").delta).toBe(20);
    g.usedCard = "safe";
    expect(applyOutcome(g, 0, false, "host").delta).toBe(0);
  });
  it("rejects cards out of phase and exhausted cards", () => {
    expect(useCard(game("question"), 0, "safe").ok).toBe(false);
    const g = game();
    g.teams[0].cards.double = 0;
    expect(useCard(g, 0, "double").ok).toBe(false);
  });
  it("enforces Challenge timing from start timestamp", () => {
    const g = game("question");
    expect(useCard(g, 0, "challenge", 12000).ok).toBe(true);
    expect(useCard(g, 0, "challenge", 17001).ok).toBe(false);
  });
  it("burns prior protection when Challenge is played", () => {
    const g = game("question");
    g.usedCard = "safe";
    const x = useCard(g, 0, "challenge", 2000);
    expect(x.game.teams[0].cards.safe).toBe(0);
    expect(x.game.teams[0].cards.challenge).toBe(0);
  });
  it("consumes exactly one Steal card and keeps the action phase locked", () => {
    const g = game("steal-window");
    const x = useCard(g, 1, "steal");
    expect(x.ok).toBe(true);
    expect(x.game.teams[1].cards.steal).toBe(1);
    expect(useCard(x.game, 2, "steal").ok).toBe(false);
  });
  it("does not allow the host to Steal or another team to Challenge", () => {
    expect(useCard(game("steal-window"), 0, "steal").ok).toBe(false);
    expect(useCard(game("question"), 1, "challenge").ok).toBe(false);
  });
  it("does not combine Double and Safe Choice in one question", () => {
    const g = game();
    const first = useCard(g, 0, "double");
    expect(first.ok).toBe(true);
    expect(useCard(first.game, 0, "safe").ok).toBe(false);
  });
  it("scores Challenge and Steal at the base value only", () => {
    const g = game("question");
    g.usedCard = "double";
    expect(applyOutcome(g, 1, true, "challenge").delta).toBe(10);
    expect(applyOutcome(g, 2, false, "steal").delta).toBe(-10);
  });
  it("orders equal scores by remaining cards", () => {
    const g = initialGame();
    g.teams[0].score = 20;
    g.teams[1].score = 20;
    g.teams[1].cards.steal = 0;
    expect(
      rankTeams(g.teams)
        .slice(0, 2)
        .map((x) => x.index),
    ).toEqual([0, 1]);
  });
});
