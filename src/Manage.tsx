import { RoundEditor } from "./RoundEditor";
import chapter8 from "./data/group7-chapter8.json";
import { useRef, useState } from "react";
import {
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Search,
  Check,
  Info,
  Save,
  Settings2,
  Cloud,
  ArrowRight,
} from "lucide-react";
import { gameRounds, questionSeconds, DIFFICULTY, type Game, type Question, type Settings } from "./game";
import { currentQuestion, isLive, validateQuestions } from "./controller";
import { Modal, teamStyle } from "./Common";
type Props = {
  game: Game;
  commit: (fn: (g: Game) => Game) => void;
  notify: (message: string) => void;
  cloudMode?: boolean;
};
function replaceQuestions(g: Game, questions: Question[]): Game {
  const id = currentQuestion(g)?.id;
  const index = id ? questions.findIndex((q) => q.id === id && q.round === g.round) : -1;
  return { ...g, questions, questionIndex: index < 0 ? null : index, boardSelectedId: index < 0 ? null : g.boardSelectedId };
}
export function QuestionBank({
  game,
  commit,
  notify,
  cloudMode = false,
}: Props) {
  const [round, setRound] = useState<number>(game.round),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState<Question | null>(null),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null),
    live = isLive(game);
  const questions = game.questions.filter(
    (q) =>
      (round === 0 || q.round === round) &&
      `${q.text} ${q.hint} ${q.answer}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const exportFile = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({questions:game.questions, roundNames:gameRounds(game)}, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "dau-tri-cau-hoi.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importFile = async (selected?: File) => {
    if (!selected) return;
    try {
      const data = JSON.parse(await selected.text());
      const raw = Array.isArray(data) ? data : data.questions;
      const questions = Array.isArray(raw) && raw.length === 0 ? [] : validateQuestions(raw);
      const names = Array.isArray(data) ? undefined : data.roundNames;
      if(names !== undefined && (!Array.isArray(names) || !names.length || names.length > 100 || !names.every(n=>typeof n==='string' && n.trim() && n.length<=80) || questions.some(q=>q.round>names.length))) throw new Error('Invalid round list.');
      commit((g) => ({...replaceQuestions(g, questions), settings:{...g.settings,roundNames:names ?? Array.from({length:Math.max(1,...questions.map(q=>q.round))},(_,i)=>`Round ${i+1}`)}, round:1, boardSelectedId:null, playedQuestionIds:[]}));
      setRound(1);
      notify(`Imported ${questions.length} questions.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not read the JSON file.");
    }
    if (file.current) file.current.value = "";
  };
  return (
    <div className="managePage">
      {!cloudMode && (
        <div className="localBankNotice">
          <Cloud size={19} />
          <div>
            <b>Saved on This Device</b>

          </div>
          <a href="/account">
            Admin Account <ArrowRight size={14} />
          </a>
        </div>
      )}
      <div className="pageTitle">
        <div>
          <h1>Question Bank</h1>

        </div>
        <div className="buttonRow">
          <button className="btn secondary" disabled={live} onClick={() => {
            if (game.questions.length && !window.confirm("Replace the current set with 12 questions from Group 7 · Chapter 8?")) return;
            commit(g => isLive(g) ? g : ({ ...replaceQuestions(g, validateQuestions(chapter8)), settings:{...g.settings,roundNames:["Warm-up", "Identifying Types of Barriers", "Sơn Tùng M-TP Case Study"]}, round:1, boardSelectedId: null, playedQuestionIds: [] }));
            notify("Loaded Group 7 · Chapter 8 with three rounds of four questions.");
          }}>Load Group 7 · Chapter 8</button>
          <button className="btn secondary" onClick={exportFile}>
            <Download size={16} />
            Export JSON
          </button>
          <button
            className="btn secondary"
            disabled={live}
            title={
              live ? "Finish the current question before replacing the question set." : ""
            }
            onClick={() => file.current?.click()}
          >
            <Upload size={16} />
            Import JSON
          </button>
          <button
            className="btn primary"
            onClick={() =>
              setDraft({
                id: crypto.randomUUID(),
                round: (round || game.round),
                difficulty: "easy",
                hint: "",
                text: "",
                answer: "",
              })
            }
          >
            <Plus size={17} />
            Add Question
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => importFile(e.target.files?.[0])}
          />
        </div>
      </div>
      {game.questions.some((q) => q.id.startsWith("demo")) && (
        <div className="infoBanner">
          <Info size={17} />
          <span>
            This set contains <b>DEMO</b> questions. Replace them before the match.
          </span>
        </div>
      )}
      <RoundEditor game={game} commit={commit} onSelect={setRound}/>
      <div className="bankToolbar">
        <div className="segments">
          {[0, ...gameRounds(game).map((_,i)=>i+1)].map((n) => (
            <button
              className={round === n ? "selected" : ""}
              key={n}
              onClick={() => setRound(n)}
            >
              {n === 0 ? "All" : `${n}. ${gameRounds(game)[n-1]}`}
              <span>
                {game.questions.filter((q) => n === 0 || q.round === n).length}
              </span>
            </button>
          ))}
        </div>
        <label className="searchField">
          <Search size={16} />
          <input
            placeholder="Search questions, hints, and answers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="bankList">
        {questions.map((q) => {
          const index = game.questions.indexOf(q),
            active = live && currentQuestion(game)?.id === q.id,
            played = game.playedQuestionIds?.includes(q.id);
          return (
            <article className="bankItem" key={q.id}>
              <div className="bankNumber">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="bankContent">
                <div className="buttonRow">
                  <span className={`difficulty ${q.difficulty}`}>
                    {DIFFICULTY[q.difficulty].label}
                  </span>
                  <span className="muted small">
                    Round {q.round} · Tile {game.questions.filter(item=>item.round===q.round).findIndex(item=>item.id===q.id)+1} · {DIFFICULTY[q.difficulty].points} points ·{" "}
                    {questionSeconds(q)}s
                  </span>
                  {q.id.startsWith("demo") && (
                    <span className="demoTag">DEMO</span>
                  )}
                  {active && <span className="statusTag">In Use</span>}
                  {played && (
                    <span className="muted small">
                      <Check size={12} /> Played
                    </span>
                  )}
                </div>
                <h3>{q.text}</h3>
                <p>Hint: {q.hint || "—"}</p>
                <div className="bankAnswer">Answer: {q.answer}</div>
              </div>
              <div className="buttonRow">
                <button
                  className="iconBtn"
                  disabled={active}
                  onClick={() => setDraft({ ...q })}
                  aria-label="Edit Question"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="iconBtn dangerText"
                  disabled={active}
                  onClick={() => setDeleteId(q.id)}
                  aria-label="Delete Question"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
        {!questions.length && (
          <div className="emptyState">
            <Search size={30} />
            <h3>
              {game.questions.length
                ? "No Matching Questions"
                : "Question Set Is Empty"}
            </h3>
            <p>
              {game.questions.length
                ? "Add a question or change the filter."
                : "Select “Add Question” to write one or “Import JSON” to load a set."}
            </p>
          </div>
        )}
      </div>
      {draft && (
        <Modal
          title={
            game.questions.some((q) => q.id === draft.id)
              ? "Edit Question"
              : "Add Question"
          }
          description="The audience sees the hint first. The host decides when to reveal the answer."
          wide
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                (draft.seconds !== undefined && (!Number.isInteger(draft.seconds) || draft.seconds < 5 || draft.seconds > 600)) ||
                !draft.hint.trim() ||
                !draft.text.trim() ||
                !draft.answer.trim()
              ) {
                notify(
                  "Enter a hint, a question, and an answer before playing.",
                );
                return;
              }
              const validated = validateQuestions([draft])[0];
              commit((g) =>
                replaceQuestions(
                  g,
                  g.questions.some((q) => q.id === draft.id)
                    ? g.questions.map((q) =>
                        q.id === draft.id ? validated : q,
                      )
                    : [...g.questions, validated],
                ),
              );
              setDraft(null);
              notify("Question saved.");
            }}
          >
            <div className="formColumns">
              <label>
                Round
                <select
                  value={draft.round}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      round: Number(e.target.value),
                    })
                  }
                >
                  {gameRounds(game).map((_,i)=>i+1).map((n) => (
                    <option value={n} key={n}>
                      Round {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={draft.difficulty}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      difficulty: e.target.value as Question["difficulty"],
                    })
                  }
                >
                  {Object.entries(DIFFICULTY).map(([key, d]) => (
                    <option key={key} value={key}>
                      {d.label} · {d.points} points · {d.seconds} seconds
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Answer Time (seconds)
              <input type="number" min={5} max={600} value={draft.seconds ?? ""} placeholder={String(DIFFICULTY[draft.difficulty].seconds)} onChange={e => setDraft({...draft, seconds: e.target.value ? Number(e.target.value) : undefined})}/>
            </label>
            <label>
              1. Hint Before Card Selection
              <textarea
                required
                value={draft.hint}
                onChange={(e) => setDraft({ ...draft, hint: e.target.value })}
                placeholder="Enter the hint without the answer."
              />

            </label>
            <label>
              2. Question
              <textarea
                required
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="Enter the full question…"
                rows={4}
              />
            </label>
            <label>
              3. Answer (MC)
              <textarea
                required
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                placeholder="Enter the answer and any accepted variants…"
              />
            </label>
            <label>
              Image URL <span className="muted">· Optional</span>
              <input
                type="url"
                value={draft.image ?? ""}
                onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <div className="modalFooter">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
              <button className="btn primary" type="submit">
                <Save size={16} />
                Save Question
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && (
        <Modal
          title="Delete This Question?"
          description={
            cloudMode
              ? "The question will be removed and the account set will save automatically."
              : "The question will be removed from the set. You can undo this."
          }
          onClose={() => setDeleteId(null)}
        >
          <div className="modalFooter">
            <button className="btn secondary" onClick={() => setDeleteId(null)}>
              Keep Question
            </button>
            <button
              className="btn danger"
              onClick={() => {
                commit((g) =>
                  replaceQuestions(
                    g,
                    g.questions.filter((q) => q.id !== deleteId),
                  ),
                );
                setDeleteId(null);
              }}
            >
              Delete Question
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function GameSettings({ game, commit }: Props) {
  const locked = isLive(game);
  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    commit((g) => ({
      ...g,
      settings: { ...g.settings, [key]: value },
      rulesConfirmed: false,
      ...(key === "hostMode" ? { host: null } : {}),
    }));
  return (
    <div className="managePage">
      <div className="pageTitle">
        <div>
          <h1>Teams & Match Rules</h1>

        </div>
        <Settings2 className="pageDecoration" size={34} />
      </div>
      <section className="surface settingsTeams">
        <div className="sectionHeading">
          <div>
            <h2>Participating Teams</h2>

          </div>
        </div>
        <div className="teamNameGrid">
          {game.teams.map((team, i) => (
            <label key={i} style={teamStyle(i)}>
              <span className="teamLabel">
                <i />
                Team {i + 1}
              </span>
              <input
                key={team.name}
                defaultValue={team.name}
                maxLength={35}
                onBlur={(e) => {
                  const name = e.target.value.trim() || `Team ${i + 1}`;
                  if (name !== team.name)
                    commit((g) => ({
                      ...g,
                      teams: g.teams.map((t, j) =>
                        j === i ? { ...t, name } : t,
                      ),
                    }));
                }}
                aria-label={`Team name ${i + 1}`}
              />
            </label>
          ))}
        </div>
      </section>
      <div className="settingsColumns">
        <section className="surface">
          <div className="sectionHeading">
            <div>
              <h2>Match Settings</h2>

            </div>
            <span className="demoTag">HOST CONFIRMATION</span>
          </div>
          {locked && (
            <div className="infoBanner compact">
              <Info size={16} />
              Finish the current question before editing match rules.
            </div>
          )}
          <Setting
            number="01"
            title="Team selection"
            description="The host can change the team before revealing each hint."
          >
            <select
              disabled={locked}
              value={game.settings.hostMode}
              onChange={(e) =>
                patch("hostMode", e.target.value as Settings["hostMode"])
              }
            >
              <option value="manual">Host selects the team</option>
              <option value="rotate">Rotate through teams</option>
              <option value="random">Draw a team order for each round</option>
            </select>
          </Setting>
          <Setting
            number="02"
            title="Correct Challenge answer"
            description="Challenge discards any Double High Risk or Safe Choice already played."
          >
            <select
              disabled={locked}
              value={game.settings.challengeCorrect}
              onChange={(e) =>
                patch(
                  "challengeCorrect",
                  e.target.value as Settings["challengeCorrect"],
                )
              }
            >
              <option value="end">End the question</option>
              <option value="host">Original team answers for base points</option>
            </select>
          </Setting>
          <Setting
            number="03"
            title="Steal window"
            description="When time runs out, apply the setting below."
          >
            <div className="numberField">
              <input
                disabled={locked}
                type="number"
                min={0}
                max={120}
                value={game.settings.stealSeconds}
                onChange={(e) =>
                  patch(
                    "stealSeconds",
                    Math.min(120, Math.max(0, Number(e.target.value))),
                  )
                }
              />
              <span>seconds</span>
            </div>
          </Setting>
          <Setting
            number="04"
            title="No team plays Steal"
            description="Applies when the timer expires or the host closes the Steal window early."
          >
            <select
              disabled={locked}
              value={game.settings.noSteal}
              onChange={(e) =>
                patch("noSteal", e.target.value as Settings["noSteal"])
              }
            >
              <option value="end">End the question</option>
              <option value="host">Original team answers again</option>
            </select>
          </Setting>
          <Setting
            number="05"
            title="Sudden Death with more than two teams"
            description={
              game.settings.multiTie === "bracket"
                ? "The first two teams compete, then the winner faces the next team until one remains."
                : "Teams buzz in together. A wrong answer eliminates the team and a correct answer wins. With two teams left, a wrong answer gives the other team the win."
            }
          >
            <select
              disabled={locked}
              value={game.settings.multiTie}
              onChange={(e) =>
                patch("multiTie", e.target.value as Settings["multiTie"])
              }
            >
              <option value="bracket">Head-to-head matches</option>
              <option value="shared">Shared buzzer question</option>
            </select>
          </Setting>
        </section>
        <section className="surface ruleReference">
          <div className="sectionHeading">
            <div>
              <h2>Core Rules</h2>

            </div>
          </div>
          <div className="difficultyTable">
            {Object.entries(DIFFICULTY).map(([key, d]) => (
              <div key={key}>
                <span className={`difficulty ${key}`}>{key}</span>
                <b>{d.points} points</b>
                <span>{d.seconds}s</span>
                <small>Challenge within {d.seconds / 2}s by default</small>
              </div>
            ))}
          </div>
          <ul>
            <li>Scores can go below zero.</li>
            <li>Play Double High Risk or Safe Choice after the hint and before the reveal.</li>
            <li>Challenge discards any Double High Risk or Safe Choice already played.</li>
            <li>Challenge and Steal use base points.</li>
            <li>A wrong Challenge answer ends the question immediately.</li>
            <li>Each question allows one Steal attempt.</li>
            <li>When time expires, the host marks the answer.</li>
          </ul>
          <div className="ruleFoot">
            <b>Final Rankings</b>
            <p>Total points → unused cards → Sudden Death.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
function Setting({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting">
      <span className="settingNo">{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {children}
      </div>
    </div>
  );
}
