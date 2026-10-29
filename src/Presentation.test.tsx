import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Presentation } from "./Presentation";
import { initialGame, type Game } from "./game";
import {
  acknowledgeHint,
  chooseQuestion,
  confirmRules,
  openQuestion,
  prepareHint,
  scoreAnswer,
  selectHost,
} from "./controller";
const question = {
  id: "qa-audience",
  round: 1 as const,
  difficulty: "easy" as const,
  hint: "PUBLIC_HINT_ONLY",
  text: "HIDDEN_QUESTION_TEXT",
  answer: "PRIVATE_ANSWER_TEXT",
  image: "https://example.com/hidden-image.png",
};
function setup() {
  return selectHost(
    chooseQuestion({ ...initialGame(), questions: [question] }, question.id),
    0,
  );
}
const render = (g: Game) =>
  renderToStaticMarkup(<Presentation game={g} now={1000} onBuzz={() => {}} />);
describe("audience disclosure follows the source rules", () => {
  it("does not disclose question, hint or answer during setup", () => {
    const html = render(setup());
    expect(html).not.toContain(question.text);
    expect(html).not.toContain(question.answer);
    expect(html).not.toContain(question.hint);
  });
  it("shows hint then card choices without revealing the question", () => {
    const hint = prepareHint(confirmRules(setup()));
    for (const g of [
      hint,
      acknowledgeHint(hint),
      { ...hint, answerRevealed: true },
    ]) {
      const html = render(g);
      expect(html).toContain(g.hintRead ? "Chọn quyền năng" : question.hint);
      expect(html).not.toContain(question.text);
      expect(html).not.toContain(question.answer);
      expect(html).not.toContain(question.image);
      expect(html).not.toContain("audienceTimer");
    }
  });
  it("shows the question and timer only after opening, with the answer still hidden", () => {
    const html = render(
      openQuestion(acknowledgeHint(prepareHint(confirmRules(setup()))), 1000),
    );
    expect(html).toContain(question.text);
    expect(html).toContain("audienceTimer");
    expect(html).toContain("00:30");
    expect(html).not.toContain(question.answer);
  });
  it("keeps the answer hidden after grading until the MC explicitly publishes it", () => {
    const result = scoreAnswer(
      openQuestion(acknowledgeHint(prepareHint(confirmRules(setup()))), 1000),
      true,
      2000,
    );
    expect(render(result)).not.toContain(question.answer);
    expect(render({ ...result, answerRevealed: true })).toContain(
      question.answer,
    );
  });
});
