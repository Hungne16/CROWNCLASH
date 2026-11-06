import {IntroControl} from './GameIntro';
import { QuestionBoard } from "./QuestionBoard";
import { CardAnimationPlayer } from "./animation/CardActivationOverlay";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Gamepad2,
  HelpCircle,
  History,
  Info,
  Medal,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Shield,
  Swords,
  Target,
  Volume2,
  VolumeX,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import {
  DIFFICULTY,
  gameRounds,
  questionSeconds,
  challengeWindowSeconds,
  initialGame,
  rankTeams,
  remainingCards,
  type Game,
} from "./game";
import {
  activateCard,
  acknowledgeHint,
  confirmRules,
  buzz,
  challengeTeam,
  chooseQuestion,
  closeSteal,
  createPracticeGame,
  currentQuestion,
  finishRound,
  isLive,
  nextQuestion,
  openQuestion,
  prepareHint,
  questionTime,
  rankingRows,
  remainingQuestions,
  scoreAnswer,
  scoreSudden,
  selectHost,
  hasHostedRound,
  startSudden,
  stealTeam,
  STORE,
  tiedLeaders,
  toggleClock,
  setQuestionClock,
  UNDO_STORE,
} from "./controller";
import { CardArt, formatTime, Modal, teamStyle } from "./Common";
import { GameSettings, QuestionBank } from "./Manage";
import { Presentation } from "./Presentation";
import { useGame, useNow } from "./useGame";

type Page = "play" | "questions" | "settings" | "history";
type Dialog =
  | "scores"
  | "help"
  | "reset"
  | "round"
  | "sudden"
  | "rules"
  | null;
type Power = "none" | "double" | "safe";
type Commit = (fn: (g: Game) => Game) => void;
const INTRO = "dautri-guided-intro-v1";
const signed = (n: number) =>
  n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";

export default function GuidedControl() {
  const presentation = location.pathname === "/presentation",
    practice = new URLSearchParams(location.search).get("practice") === "1";
  const { game, commit, undo, undoCount, sendBuzz, storageError, animation } = useGame(
      presentation,
      practice,
    ),
    now = useNow();
  const [welcome, setWelcome] = useState(
    () =>
      !presentation &&
      !practice &&
      new URLSearchParams(location.search).get("page") !== "questions" &&
      !isLive(game) &&
      localStorage.getItem(INTRO) !== "done",
  );
  const [page, setPage] = useState<Page>(() =>
      new URLSearchParams(location.search).get("page") === "questions"
        ? "questions"
        : "play",
    ),
    [dialog, setDialog] = useState<Dialog>(null),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  const [power, setPower] = useState<Power>(
      game.usedCard === "double" || game.usedCard === "safe"
        ? game.usedCard
        : game.cardPreview ?? "none",
    ),
    [choosingChallenge, setChoosingChallenge] = useState(false);
  const [sound, setSound] = useState(
    () => localStorage.getItem("dautri-sound") !== "off",
  );
  const [suddenDraft, setSuddenDraft] = useState({ question: "", answer: "" });
  const menuRef = useRef<HTMLDivElement>(null),
    lastBeep = useRef(-1),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);
  const q = currentQuestion(game),
    time = questionTime(game, now),
    difficulty = q ? DIFFICULTY[q.difficulty] : null;
  const challengeRemaining = q ? challengeWindowSeconds(q) - time.elapsed / 1000 : -1;
  const challengeSeconds = Math.max(0, Math.ceil(challengeRemaining));
  const challengeAvailable =
    game.phase === "question" &&
    game.host !== null &&
    game.teams[game.host].cards.challenge > 0 &&
    !game.paused &&
    game.startedAt !== null &&
    challengeRemaining >= 0;
  const responder = ["challenge", "steal-answer", "sudden-death"].includes(
    game.phase,
  )
    ? game.answering
    : game.host;
  const hostName =
    game.host === null ? "the original team" : game.teams[game.host].name;
  const roundQuestions = game.questions.filter(
      (item) => item.round === game.round,
    ),
    questionNumber = q
      ? roundQuestions.findIndex((item) => item.id === q.id) + 1
      : 0;
  const hasNext = remainingQuestions(game).some((item) => item.id !== q?.id);
  const grade = (correct: boolean) =>
    commit((g) => {
      const answering = ["challenge", "steal-answer", "sudden-death"].includes(
        g.phase,
      )
        ? g.answering
        : g.host;
      if (
        g.phase !== game.phase ||
        g.questionIndex !== game.questionIndex ||
        answering !== responder
      )
        return g;
      return g.phase === "sudden-death"
        ? scoreSudden(g, correct)
        : scoreAnswer(g, correct, Date.now(), game.phase);
    });
  useEffect(() => {
    setChoosingChallenge(false);
    if (game.phase === "hint")
      setPower(
        game.usedCard === "double" || game.usedCard === "safe"
          ? game.usedCard
          : game.cardPreview ?? "none",
      );
  }, [game.phase, game.questionIndex]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  useEffect(() => {
    if (
      presentation ||
      !sound ||
      game.phase !== "question" ||
      game.paused ||
      time.seconds > 5 ||
      time.seconds === lastBeep.current
    )
      return;
    lastBeep.current = time.seconds;
    try {
      const audio = new AudioContext(),
        osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.frequency.value = time.seconds === 0 ? 350 : 760;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + (time.seconds === 0 ? 0.4 : 0.08));
      osc.onended = () => {
        void audio.close();
      };
    } catch {}
  }, [presentation, sound, game.phase, game.paused, time.seconds]);
  useEffect(() => {
    if (game.phase !== "question") lastBeep.current = -1;
  }, [game.phase]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  if (presentation)
    return <><Presentation game={game} now={now} onBuzz={sendBuzz} sound={sound} onToggleSound={()=>setSound(v=>!v)} />{animation.event && <CardAnimationPlayer key={animation.event.id} event={animation.event} onFinish={animation.complete} sound={sound}/>}</>;

  const begin = () => {
    localStorage.setItem(INTRO, "done");
    setWelcome(false);
    setPage("play");
    if(game.phase === "setup" && !(game.playedQuestionIds?.length)) commit(g=>({...g,introSlide:0}));
  };
  const practiceStart = () => {
    localStorage.setItem(
      `${STORE}-practice`,
      JSON.stringify(createPracticeGame(game.questions, game.settings)),
    );
    localStorage.removeItem(`${UNDO_STORE}-practice`);
    location.assign("/?practice=1");
  };
  const returnToReal = () => {
    localStorage.setItem(INTRO, "done");
    location.assign("/");
  };
  const showPage = (next: Page) => {
    if (practice && next === "questions") {
      location.assign("/?page=questions");
      return;
    }
    setMenu(false);
    setWelcome(false);
    setPage(next);
  };
  const openAudience = () =>
    window.open(
      `/presentation${practice ? "?practice=1" : ""}`,
      practice ? "dautri-practice-audience" : "dautri-presentation",
    );
  const openWithPower = () =>
    commit((g) => {
      if (g.phase !== "hint" || !g.hintRead) return g;
      let next = g;
      if (!g.usedCard && power !== "none") {
        next = activateCard(g, power);
        if (next.usedCard !== power) return next;
      }
      return openQuestion(next, Date.now(), false);
    });
  const finishQuestion = () => commit(nextQuestion);
  const reset = () => {
    commit((g) => ({
      ...initialGame(),
      teams: g.teams.map((t) => ({ ...initialGame().teams[0], name: t.name })),
      questions: g.questions,
      settings: g.settings,
      questionIndex: g.questions.findIndex((item) => item.round === 1),
    }));
    setDialog(null);
    setWelcome(true);
    setPage("play");
  };


  return (
    <div
      className="guidedApp"
      onClickCapture={(event) => {
        if (event.detail > 1) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {animation.event && <div className="animationStatus"><b>{animation.event.result ? "Result" : "Playing"} · {animation.event.teamName}</b><button onClick={animation.skip}>Skip Animation</button></div>}
      {practice && (
        <div className="practiceBanner">
          <span>
            <Zap size={16} />
            <b>Practice Mode</b>

          </span>
          <button onClick={returnToReal}>
            Back to Live Match <ArrowRight size={15} />
          </button>
        </div>
      )}
      <header className="guideHeader">
        <button
          className="guideBrand"
          onClick={() => {
            setPage("play");
            setWelcome(false);
          }}
        >
          <span>
            <Gamepad2 size={24} />
          </span>
          <b>
            CROWN CLASH
          </b>
        </button>
        <div className="guideHeaderActions">
          {game.phase === "setup" && <button className="guideOutline" onClick={()=>{localStorage.setItem(INTRO,"done");setWelcome(false);setPage("play");commit(g=>({...g,introSlide:0}));}} lang="en">Game Rules</button>}
          <a
            className="guideOutline guideAccount"
            href="/account"
            aria-label="Admin Account"
            title="Edit and save your question set online"
          >
            <UserRound size={17} />
            <span>Admin Account</span>
          </a>
          <button className="guideOutline" onClick={openAudience}>
            <Monitor size={17} />
            <span>Audience Screen</span>
          </button>
          <div className="guideMenuWrap" ref={menuRef}>
            <button
              className={`guideTextButton ${menu ? "selected" : ""}`}
              onClick={() => setMenu((value) => !value)}
              aria-expanded={menu}
            >
              <Settings2 size={17} />
              <span>Manage</span>
              <ChevronDown size={14} />
            </button>
            {menu && (
              <nav className="guideMenu" aria-label="Match Management">
                <button onClick={() => showPage("play")}>
                  <Play size={16} />
                  Back to Game
                </button>
                <button onClick={() => showPage("settings")}>
                  <Settings2 size={16} />
                  Teams & Match Rules
                </button>
                <button onClick={() => showPage("questions")}>
                  <BookOpen size={16} />
                  Edit Questions
                </button>
                <a href={practice?"/leaderboard?practice=1":"/leaderboard"} target="_blank" rel="noreferrer">Live Leaderboard ↗</a>
                <a href={practice?"/leaderboard?edit=1&practice=1":"/leaderboard?edit=1"} target="_blank" rel="noreferrer">Edit Overlay · Adjust Banner Text ↗</a>
                <a href="/animation-preview" target="_blank" rel="noreferrer">Preview Power Cards ↗</a>
                <button onClick={() => showPage("history")}>
                  <History size={16} />
                  View Score History
                </button>
                <hr />
                <button
                  onClick={() => {
                    setDialog("help");
                    setMenu(false);
                  }}
                >
                  <HelpCircle size={16} />
                  Host Guide
                </button>
                <button
                  onClick={() => {
                    setSound((value) => {
                      localStorage.setItem(
                        "dautri-sound",
                        value ? "off" : "on",
                      );
                      return !value;
                    });
                  }}
                >
                  {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound {sound ? "On" : "Off"}
                </button>
                <button
                  onClick={() => {
                    setDialog("reset");
                    setMenu(false);
                  }}
                >
                  <RotateCcw size={16} />
                  New Match
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>
      {storageError && (
        <div className="guideStorageError">
          <Info size={15} />
          {storageError}
        </div>
      )}

      {welcome ? (
        <main className="guideWelcome">
          <h1>Ready to Play?</h1>
          <div className="welcomeSteps">
            <div>
              <span>
                <Target size={24} />
              </span>
              <b>1. Select a Team</b>

            </div>
            <ChevronRight size={19} />
            <div>
              <span>
                <BookOpen size={24} />
              </span>
              <b>2. Reveal Question</b>

            </div>
            <ChevronRight size={19} />
            <div>
              <span>
                <Check size={25} />
              </span>
              <b>3. Score the Answer</b>

            </div>
          </div>
          <div className="welcomeActions">
            <button
              className="guidePrimary"
              onClick={() =>
                game.questions.length ? begin() : showPage("questions")
              }
            >
              {!game.questions.length
                ? "Write the First Question"
                : game.history.length || isLive(game)
                  ? "Resume Saved Match"
                  : "Start Hosting"}
              <ArrowRight size={19} />
            </button>
            <button
              className="guidePractice"
              onClick={practiceStart}
              disabled={!game.questions.length}
              title={
                !game.questions.length
                  ? "Add at least one question before practicing"
                  : undefined
              }
            >
              <Play size={18} />
              Practice a Question
            </button>
          </div>
          <p className="practicePromise">
            {game.questions.length
              ? "Practice mode runs separately from your live match."
              : "Your question bank is empty. Add questions or import a JSON file."}
          </p>
          <button
            className="welcomePrepare"
            onClick={() => showPage("settings")}
          >
            Need to set up teams and questions?{" "}
            <span>
              Set Up the Match <ArrowRight size={13} />
            </span>
          </button>
        </main>
      ) : page === "play" ? game.introSlide != null ? (<IntroControl game={game} commit={commit} onAudience={openAudience}/>) : (
        <main className={`guideShell operatorDesk operator-${game.phase}`}>
          <div className="simpleScoreStrip" aria-label="Current Scores">
            {game.teams.map((team, i) => (
              <div key={i} style={teamStyle(i)}>
                <span>
                  <i />
                  {team.name}
                </span>
                <b>
                  {team.score}
                  <small>points</small>
                </b>
              </div>
            ))}
          </div>
          <div className="guideRoundLine">
            <span>
              Round <b>{game.round}</b> / {gameRounds(game).length} · {gameRounds(game)[game.round - 1]}
              {q && (game.phase !== "setup" || game.boardSelectedId === q.id) && (
                <>
                  <i />
                  Question <b>{questionNumber}</b> / {roundQuestions.length}
                </>
              )}
              {q?.id.startsWith("demo") && <em>SAMPLE QUESTION</em>}
            </span>
            <button onClick={() => setDialog("scores")}>
              View Scores & Cards <ChevronRight size={14} />
            </button>
          </div>

          {game.phase === "setup" && (
            <Step number={1} title="Select a Team and Question" instruction="Ask the team to pick a number, select that tile, and reveal the hint.">
              <div className="simpleTeamGrid boardTeamGrid">
                {game.teams.map((team,i)=><button key={i} style={teamStyle(i)} disabled={hasHostedRound(game,i)} className={game.host===i?"selected":""} onClick={()=>commit(g=>selectHost(g,i))}><span className="simpleTeamInitial">{i+1}</span><b>{team.name}</b><span className="simpleTeamCheck">{hasHostedRound(game,i)?"Turn Used":game.host===i&&<Check size={17}/>}</span></button>)}
              </div>
              <QuestionBoard game={game} disabled={game.host===null} onChoose={id=>commit(g=>chooseQuestion(g,id))}/>
              {game.host===null && <div className="boardNoHost">Select the team whose turn it is first.</div>}
              {q && game.boardSelectedId===q.id && <>
                <div className="boardSelectedMeta"><b>Question {questionNumber}</b><span>{difficulty?.label} · {difficulty?.points} points · {q ? questionSeconds(q) : 0} seconds</span></div>
                <div className="guideNext"><button className="guidePrimary" disabled={game.host===null} onClick={()=>game.rulesConfirmed?commit(prepareHint):setDialog("rules")}>Reveal Hint · Question {questionNumber}<ArrowRight size={19}/></button></div>
                <details className="simplePreview questionBoardHelp"><summary>Host Preview<ChevronDown size={13}/></summary><div className="hostPreviewContent" tabIndex={0}><p>{q.text}</p><p><b>Answer:</b> {q.answer}</p></div></details>
              </>}
              {!roundQuestions.length && <div className="guideEmpty"><BookOpen size={30}/><h3>This round has no questions</h3><button className="guidePrimary" onClick={()=>showPage("questions")}>Edit Questions<ArrowRight size={17}/></button></div>}
              {remainingQuestions(game).length===0 && <button className="guidePrimary" onClick={()=>setDialog("round")}>Round Summary</button>}
            </Step>
          )}

          {game.phase === "hint" && q && (
            <Step
              number={2}
              title={
                game.hintRead
                  ? `Confirm the card for ${hostName}.`
                  : `Read the hint to ${hostName}.`
              }
              instruction={
                game.hintRead
                  ? "Record the team's card choice before revealing the question."
                  : "Read the hint aloud, then select “Hint Read”."
              }
            >
              <ReadAloud
                label={
                  game.hintRead
                    ? "HINT READ · QUESTION HIDDEN"
                    : "READ THIS HINT ALOUD"
                }
                text={
                  q.hint ||
                  "There is no saved hint. The host can give one aloud."
                }
              />
              {game.hintRead ? (
                <>
                  <div className="powerQuestion">
                    <h3>Which card will {hostName} play?</h3>
                    <span>
                      Choose an option. The card is spent when you reveal the question.
                    </span>
                  </div>
                  <div className="simplePowers cardHand">
                    {(
                      [
                        {
                          id: "none",
                          name: "No Card",
                          correct: difficulty!.points,
                          wrong: -difficulty!.points,
                        },
                        {
                          id: "double",
                          name: "Double High Risk",
                          correct: difficulty!.points * 2,
                          wrong: -difficulty!.points * 2,
                        },
                        {
                          id: "safe",
                          name: "Safe Choice",
                          correct: difficulty!.points,
                          wrong: 0,
                        },
                      ] as const
                    ).map((option) => {
                      const unavailable =
                        option.id !== "none" &&
                        game.teams[game.host!].cards[option.id] === 0 &&
                        game.usedCard !== option.id;
                      const selected = power === option.id;
                      return (
                        <button
                          key={option.id}
                          className={`cardHandOption ${selected ? "selected" : ""} ${option.id === "none" ? "noPowerOption" : ""}`}
                          disabled={unavailable || !!game.usedCard}
                          onClick={() => {setPower(option.id);commit(g=>({...g,cardPreview:option.id}));}}
                          aria-pressed={selected}
                        >
                          {option.id !== "none" && <><CardArt card={option.id} className="powerChoiceArt"/><span className="cardHandCount">{game.teams[game.host!].cards[option.id]} cards</span></>}
                          <span className="powerRadio">
                            {selected && <Check size={12} />}
                          </span>
                          <strong>{option.name}</strong>
                          <span>
                            {unavailable
                              ? "No Cards Left"
                              : `Correct ${signed(option.correct)} · Incorrect ${signed(option.wrong)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {game.usedCard && (
                    <p className="guideInlineNote">
                      The card was already played in this saved turn. You can reveal the question.
                    </p>
                  )}
                  <div className="guideNext">
                    <button className="guidePrimary" onClick={openWithPower}>
                      <Play size={18} />
                      Reveal Question on Audience Screen · {q ? questionSeconds(q) : 0} seconds
                    </button>
                  </div>
                </>
              ) : (
                <div className="guideNext">
                  <button
                    className="guidePrimary"
                    onClick={() => commit(acknowledgeHint)}
                  >
                    Hint Read — Choose a Card <ArrowRight size={18} />
                  </button>
                </div>
              )}
              <button
                className="guideBack"
                disabled={!!game.usedCard}
                onClick={() =>
                  commit((g) =>
                    g.phase === "hint" && !g.usedCard
                      ? { ...g, phase: "setup" }
                      : g,
                  )
                }
              >
                <ArrowLeft size={14} />
                Back to Team Selection
              </button>
            </Step>
          )}

          {game.phase === "question" && q && !choosingChallenge && (
            <Step
              number={3}
              title={`Listen to ${hostName}'s answer.`}
              instruction={
                practice
                  ? "Assume the team has answered. Check the answer below and mark it correct or incorrect."
                  : "Read the question, listen to the answer, and mark it correct or incorrect."
              }
              aside={
                <GuideClock
                  seconds={time.seconds}
                  paused={game.paused}
                  waiting={game.startedAt === null}
                  duration={questionSeconds(q)}
                  onSet={seconds => commit(g => setQuestionClock(g, seconds))}
                  onToggle={() => commit(toggleClock)}
                />
              }
            >
              {time.seconds === 0 && (
                <div className="guideTimeUp">
                  <Clock size={18} />
                  Time is up. You can still score the answer.
                </div>
              )}
              <ReadAloud
                label="QUESTION ON THE AUDIENCE SCREEN"
                text={q.text}
              />
              {q.image && (
                <img
                  className="guideQuestionImage"
                  src={q.image}
                  alt="Question Illustration"
                />
              )}
              <Answer text={q.answer} />
              {game.usedCard && (
                <div className="guideActivePower">
                  <CardArt card={game.usedCard} className="inlineCardArt"/>
                  The team played{" "}
                  <b>{game.usedCard === "double" ? "Double High Risk" : "Safe Choice"}</b>.
                  The score buttons include the card effect.
                </div>
              )}
              <GradeActions game={game} onGrade={grade} />
              {game.host !== null &&
                game.teams[game.host].cards.challenge > 0 && (
                  <div className="simpleChallenge">
                    <span>
                      <b>Does the team want to play Challenge?</b>
                      <small>
                        {challengeAvailable
                          ? `Choose another team within ${challengeSeconds} seconds.`
                          : game.paused
                            ? "Resume the timer to use this card."
                            : "The Challenge window has closed."}
                      </small>
                    </span>
                    <button
                      className="challengeCardButton"
                      disabled={!challengeAvailable}
                      onClick={() => setChoosingChallenge(true)}
                    >
                      <CardArt card="challenge" className="challengeChoiceArt"/>
                      <b>Play Challenge</b>
                    </button>
                  </div>
                )}
            </Step>
          )}

          {((game.phase === "question" && choosingChallenge) ||
            (game.phase === "challenge" && game.answering === null)) && (
            <Step
              number={3}
              title={`Which team will ${hostName} challenge?`}
              instruction="Select the nominated team. It must answer immediately."
              aside={
                game.phase === "question" ? (
                  <span className="challengeDeadline">
                    {challengeSeconds}s left
                  </span>
                ) : undefined
              }
            >
              {game.usedCard && (
                <div className="guideBurn">
                  <Zap size={19} />
                  <span>
                    The{" "}
                    <b>{game.usedCard === "double" ? "Double High Risk" : "Safe Choice"}</b>{" "}
                    is discarded. The original team spends both cards.
                  </span>
                </div>
              )}
              {!challengeAvailable && game.phase === "question" && (
                <div className="guideTimeUp">
                  The Challenge window has closed. Go back to score the original team's answer.
                </div>
              )}
              <div className="guideTargetList">
                {game.teams.map(
                  (team, i) =>
                    i !== game.host && (
                      <button
                        key={i}
                        style={teamStyle(i)}
                        disabled={
                          game.phase === "question" && !challengeAvailable
                        }
                        onClick={() => {
                          commit((g) => challengeTeam(g, i));
                          setChoosingChallenge(false);
                        }}
                      >
                        <span className="simpleTeamInitial">{i + 1}</span>
                        <b>Challenge {team.name}</b>
                        <ArrowRight size={18} />
                      </button>
                    ),
                )}
              </div>
              {game.phase === "question" && (
                <button
                  className="guideBack"
                  onClick={() => setChoosingChallenge(false)}
                >
                  <ArrowLeft size={14} />
                  Return to Question
                </button>
              )}
            </Step>
          )}

          {["challenge", "host-answer", "steal-answer"].includes(game.phase) &&
            responder !== null &&
            q && (
              <Step
                number={3}
                title={
                  game.phase === "challenge"
                    ? `${game.teams[responder].name} must answer now.`
                    : `Listen to ${game.teams[responder].name}'s answer.`
                }
                instruction={
                  game.phase === "challenge"
                    ? "The original team played Challenge. Listen to the answer and score it."
                    : game.phase === "steal-answer"
                      ? "This team won the Steal attempt. Score its answer to the same question."
                      : "The match rules allow the original team to answer this question again."
                }
              >
                {game.phase === "challenge" && game.notice.includes("discarded") && (
                  <div className="guideBurn">
                    <Zap size={18} />
                    {game.notice}
                  </div>
                )}
                <ReadAloud label="QUESTION" text={q.text} />
                <Answer text={q.answer} />
                <GradeActions game={game} onGrade={grade} />
                <p className="guideInlineNote">
                  {game.phase === "challenge"
                    ? "A wrong Challenge answer ends the question without a Steal attempt."
                    : game.phase === "steal-answer"
                      ? "The question ends after this Steal attempt."
                      : "The score buttons include any active card effect."}
                </p>
              </Step>
            )}

          {game.phase === "steal-window" && (
            <Step
              number={3}
              title="Who Raised a Steal Card?"
              instruction={
                practice
                  ? "Assume Team 2 raised its card first. Select Team 2 to let it answer."
                  : "The original team answered incorrectly. Select the first eligible team to raise a Steal card."
              }
              aside={
                <span className="challengeDeadline">
                  <Clock size={15} />
                  {Math.max(
                    0,
                    Math.ceil(((game.stealDeadline ?? now) - now) / 1000),
                  )}{" "}
                  seconds
                </span>
              }
            >
              <div className="stealChoicePanel"><CardArt card="steal" className="stealChoiceArt"/><div className="stealChoiceTeams"><div className="guideTargetList">
                {game.teams.map(
                  (team, i) =>
                    i !== game.host && (
                      <button
                        key={i}
                        style={teamStyle(i)}
                        disabled={!team.cards.steal}
                        onClick={() => commit((g) => stealTeam(g, i))}
                      >
                        <span className="simpleTeamInitial">{i + 1}</span>
                        <span>
                          <b><CardArt card="steal" className="inlineCardArt"/>{team.name} raised its card first</b>
                          <small>
                            {team.cards.steal
                              ? `${team.cards.steal} Steal cards left · selecting spends one`
                              : "No Steal Cards Left"}
                          </small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ),
                )}
              </div>
              </div></div>
              <div className="guideNext">
                <button
                  className="guideOutline full"
                  onClick={() => commit(closeSteal)}
                >
                  No Team Raised a Card <ArrowRight size={17} />
                </button>
              </div>
              <p className="guideInlineNote">
                Each question allows one Steal attempt. The game spends the card and calculates points.
              </p>
            </Step>
          )}

          {game.phase === "result" && (
            <Step
              number={4}
              title={
                practice
                  ? "You Hosted a Practice Question!"
                  : "Question Complete"
              }
              instruction={
                game.answerRevealed
                  ? "The answer is visible. You can move to the next turn."
                  : "Scores are updated. Reveal the answer when ready."
              }
            >
              <ResultChanges game={game} />
              {game.answerRevealed && q && (
                <div className="publishedAnswer compactHostAnswer">
                  <span>
                    <Check size={17} />
                    ANSWER REVEALED
                  </span>
                  <p tabIndex={0}>{q.answer}</p>
                </div>
              )}

              <div className="guideNext">
                <button
                  className="guidePrimary"
                  onClick={() =>
                    !game.answerRevealed
                      ? commit((g) =>
                          g.phase === "result"
                            ? { ...g, answerRevealed: true }
                            : g,
                        )
                      : practice
                        ? returnToReal()
                        : finishQuestion()
                  }
                >
                  {!game.answerRevealed
                    ? "Reveal Answer"
                    : practice
                      ? "Go to Live Match"
                      : hasNext
                        ? "Back to Question Board"
                        : `Round Summary ${game.round}`}
                  <ArrowRight size={19} />
                </button>
              </div>
              {practice && game.answerRevealed && (
                <button className="guideBack" onClick={finishQuestion}>
                  Practice Another Question <ArrowRight size={14} />
                </button>
              )}
            </Step>
          )}

          {game.phase === "round-summary" && (
            <Step
              title={`Round ${game.round} Complete`}
              instruction="Scores and unused cards carry over to the next round."
            >
              <SimpleRanking game={game} />
              <div className="guideNext">
                <button
                  className="guidePrimary"
                  onClick={() => commit(finishRound)}
                >
                  {game.round >= gameRounds(game).length
                    ? "View Final Results"
                    : `Start Round ${game.round + 1}`}
                  <ArrowRight size={19} />
                </button>
              </div>
            </Step>
          )}

          {game.phase === "finished" && (
            <Step
              title={
                game.suddenWinner !== null || tiedLeaders(game).length === 1
                  ? "We Have a Champion!"
                  : "A Tiebreaker Is Needed"
              }
              instruction={
                game.suddenWinner !== null || tiedLeaders(game).length === 1
                  ? "Rankings are based on scores, then unused cards."
                  : "The leaders are tied on points and unused cards. Run a tiebreaker without power cards."
              }
            >
              <div className="guideWinner">
                <Medal size={40} />
                <h2>
                  {game.suddenWinner !== null
                    ? game.teams[game.suddenWinner].name
                    : tiedLeaders(game).length === 1
                      ? game.teams[tiedLeaders(game)[0]].name
                      : tiedLeaders(game)
                          .map((i) => game.teams[i].name)
                          .join(" · ")}
                </h2>
              </div>
              <SimpleRanking game={game} />
              <div className="guideNext">
                <button
                  className="guidePrimary"
                  onClick={() =>
                    game.suddenWinner === null && tiedLeaders(game).length > 1
                      ? commit(startSudden)
                      : setDialog("reset")
                  }
                >
                  {game.suddenWinner === null && tiedLeaders(game).length > 1
                    ? "Start Tiebreaker"
                    : "New Match"}
                  <ArrowRight size={19} />
                </button>
              </div>
            </Step>
          )}

          {game.phase === "sudden-death" && (
            <Step
              title={
                game.answering === null
                  ? "Who Buzzed In First?"
                  : `Listen to ${game.teams[game.answering].name}'s answer.`
              }
              instruction={
                game.answering === null
                  ? "Read the tiebreaker question and select the first team to buzz in. Buzzes from the audience screen register automatically."
                  : "Check the answer and score it. The tiebreaker uses no cards and awards no points."
              }
            >
              {game.suddenQuestion ? (
                <ReadAloud label="TIEBREAKER QUESTION" text={game.suddenQuestion} />
              ) : (
                <div className="guideSubline">
                  Read the tiebreaker aloud or enter it for the audience screen.
                </div>
              )}
              <button
                className="guideLink"
                onClick={() => {
                  setSuddenDraft({
                    question: game.suddenQuestion ?? "",
                    answer: game.suddenAnswer ?? "",
                  });
                  setDialog("sudden");
                }}
              >
                Enter Tiebreaker Question & Answer <ChevronRight size={14} />
              </button>
              {game.answering === null ? (
                <div className="guideTargetList">
                  {game.suddenTeams.map((i) => (
                    <button
                      key={i}
                      style={teamStyle(i)}
                      onClick={() => commit((g) => buzz(g, i))}
                    >
                      <span className="simpleTeamInitial">{i + 1}</span>
                      <b>{game.teams[i].name} buzzed in</b>
                      <Zap size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {game.suddenAnswer && <Answer text={game.suddenAnswer} />}
                  <div className="simpleGrades">
                    <button className="gradeWrong" onClick={() => grade(false)}>
                      <X size={24} />
                      <b>Incorrect</b>
                    </button>
                    <button
                      className="gradeCorrect"
                      onClick={() => grade(true)}
                    >
                      <Check size={24} />
                      <b>Correct</b>
                    </button>
                  </div>
                </>
              )}
              {game.notice && (
                <p className="guideInlineNote">{game.notice}</p>
              )}
            </Step>
          )}

          {game.notice &&
            ["setup", "hint", "question"].includes(game.phase) && (
              <div className="guideFeedback" role="status">
                <Info size={15} />
                {game.notice}
              </div>
            )}
          <div className="guideUtilities">
            <button
              disabled={!undoCount}
              onClick={() => {
                undo();
                notify(
                  "Previous action undone. Scores and cards restored.",
                );
              }}
            >
              <RotateCcw size={15} />
              Undo Last Action
            </button>
            <button onClick={() => setDialog("help")}>
              <HelpCircle size={15} />
              Host Guide
            </button>
          </div>
          {game.phase === "setup" && q && (
            <div className="guideQuietActions">
              <button onClick={() => setDialog("round")}>
                End Round Early
              </button>

            </div>
          )}
        </main>
      ) : (
        <main className="guideManagement">
          <button className="managementBack" onClick={() => setPage("play")}>
            <ArrowLeft size={16} />
            {isLive(game) ? "Return to Current Question" : "Back to Game"}
          </button>
          {page === "settings" ? (
            <>
              <div className="managementPrepHint">
                Match Setup <b>1. Teams & Match Rules</b>
                <ArrowRight size={14} />
                <button onClick={() => setPage("questions")}>
                  2. Edit Questions
                </button>
                <ArrowRight size={14} />
                <button
                  onClick={() => {
                    begin();
                  }}
                >
                  3. Start Playing
                </button>
              </div>
              <GameSettings game={game} commit={commit} notify={notify} />
            </>
          ) : page === "questions" ? (
            <>
              <div className="managementPrepHint">
                Questions ready?{" "}
                <button onClick={begin}>
                  Start Hosting <ArrowRight size={14} />
                </button>
              </div>
              <QuestionBank game={game} commit={commit} notify={notify} />
            </>
          ) : (
            <SimpleHistory game={game} />
          )}
        </main>
      )}

      {dialog === "rules" && (
        <Modal
          lang="en"
          title="Confirm Match Rules"
          description="Review the five match settings chosen by the organizers."
          onClose={() => setDialog(null)}
        >
          <ol className="rulesSummary">
            <li>
              <b>Team selection</b>
              <span>
                {game.settings.hostMode === "manual"
                  ? "Host selects the team for each question"
                  : game.settings.hostMode === "rotate"
                    ? "Rotate through teams"
                    : "Draw a team order for each round"}
              </span>
            </li>
            <li>
              <b>Correct Challenge answer</b>
              <span>
                {game.settings.challengeCorrect === "end"
                  ? "End the question"
                  : "Original team answers for base points"}
              </span>
            </li>
            <li>
              <b>Steal window</b>
              <span>
                {game.settings.stealSeconds} seconds
                {game.settings.stealSeconds === 0
                  ? " (Steal disabled)"
                  : ""}
              </span>
            </li>
            <li>
              <b>No team plays Steal</b>
              <span>
                {game.settings.noSteal === "end"
                  ? "End the question"
                  : "Original team answers again"}
              </span>
            </li>
            <li>
              <b>Tie between more than two teams</b>
              <span>
                {game.settings.multiTie === "bracket"
                  ? "Head-to-head matches"
                  : "Shared buzzer question"}
              </span>
            </li>
          </ol>
          <div className="modalFooter">
            <button
              className="guideOutline"
              onClick={() => {
                setDialog(null);
                showPage("settings");
              }}
            >
              Edit Match Rules
            </button>
            <button
              className="guidePrimary"
              onClick={() => {
                commit((g) => prepareHint(confirmRules(g)));
                setDialog(null);
              }}
            >
              Confirm and Reveal Hint <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "scores" && (
        <Modal
          title="Team Scores & Cards"
          description="Each team gets five cards for the entire match. Used cards are not replaced."
          onClose={() => setDialog(null)}
          wide
        >
          <div className="guideDetailedScores">
            {rankTeams(game.teams).map(({ team, index }) => (
              <section key={index} style={teamStyle(index)}>
                <div>
                  <span>
                    <i />
                    {team.name}
                  </span>
                  <b>{team.score} points</b>
                </div>
                <dl>
                  {(
                    [
                      { key: "double", name: "Double High Risk" },
                      { key: "safe", name: "Safe Choice" },
                      { key: "challenge", name: "Challenge" },
                      { key: "steal", name: "Steal" },
                    ] as const
                  ).map((card) => (
                    <div
                      key={card.key}
                      className={!team.cards[card.key] ? "exhausted" : ""}
                    >
                      <dt><CardArt card={card.key} className="detailCardArt"/>{card.name}</dt>
                      <dd>{team.cards[card.key]} cards</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Modal>
      )}
      {dialog === "help" && (
        <Modal
          title="Host Guide"
          description="Follow the on-screen instructions at each step."
          onClose={() => setDialog(null)}
        >
          <ol className="simpleHelp">
            <li>
              <b>Choose the team that answers first.</b>
              <span>That team gets the first attempt at the question.</span>
            </li>
            <li>
              <b>Read the hint and ask the team whether it wants to play a card.</b>
              <span>
                Choose No Card, Double High Risk, or Safe Choice. Then reveal the question.
              </span>
            </li>
            <li>
              <b>Listen to the answer and mark it correct or incorrect.</b>
              <span>
                The answer appears above the score buttons. The game calculates points.
              </span>
            </li>
            <li>
              <b>Follow the prompts for any power cards.</b>
              <span>
                For Challenge, select the nominated team. For Steal, select the first eligible team to raise its card.
              </span>
            </li>
            <li>
              <b>Reveal the answer and move to the next question.</b>
              <span>Scores and cards carry over between rounds.</span>
            </li>
          </ol>
          <button className="guidePrimary full" onClick={practiceStart}>
            <Play size={17} />
            Practice a Question
          </button>
          <p className="practicePromise">
            Practice runs separately from your live match.
          </p>
        </Modal>
      )}
      {dialog === "reset" && (
        <Modal
          title="Start a New Match?"
          description="Reset scores, cards, and history for a new match using the current teams, questions, and rules. You can undo this action."
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Keep Current Match
            </button>
            <button className="guidePrimary" onClick={reset}>
              New Match <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "round" && (
        <Modal
          title={`End Round ${game.round} Early?`}
          description={`This round has ${remainingQuestions(game).length} unplayed questions. Scores and cards carry over.`}
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Keep Playing
            </button>
            <button
              className="guidePrimary"
              onClick={() => {
                commit((g) =>
                  g.phase === "setup"
                    ? {
                        ...g,
                        phase: "round-summary",
                        questionIndex: null,
                        notice: "",
                      }
                    : g,
                );
                setDialog(null);
              }}
            >
              View Round Summary
            </button>
          </div>
        </Modal>
      )}
      {dialog === "sudden" && (
        <Modal
          title="Prepare Tiebreaker"
          description="The audience sees the question. The host sees the answer."
          onClose={() => setDialog(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commit((g) => ({
                ...g,
                suddenQuestion: suddenDraft.question,
                suddenAnswer: suddenDraft.answer,
              }));
              setDialog(null);
            }}
          >
            <label>
              Tiebreaker Question
              <textarea
                value={suddenDraft.question}
                onChange={(e) =>
                  setSuddenDraft({ ...suddenDraft, question: e.target.value })
                }
                required
              />
            </label>
            <label>
              Answer
              <input
                value={suddenDraft.answer}
                onChange={(e) =>
                  setSuddenDraft({ ...suddenDraft, answer: e.target.value })
                }
              />
            </label>
            <div className="modalFooter">
              <button className="guidePrimary" type="submit">
                Show Tiebreaker Question <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {toast && (
        <div className="guideToast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  instruction,
  aside,
  children,
}: {
  number?: number;
  title: string;
  instruction: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="guideStep">
      <div className="guideStepHeading">
        <div>
          {number && <span className="guideStepNumber">STEP {number} / 4</span>}
          <h1>{title}</h1>
          <p>{instruction}</p>
        </div>
        {aside && <div className="guideStepAside">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
function ReadAloud({ label, text }: { label: string; text: string }) {
  return (
    <div className="guideRead">
      <span>{label}</span>
      <OperatorText text={text}/>
    </div>
  );
}
function OperatorText({text}:{text:string}) {
 const ref=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{
  const fit=()=>{
   const el=ref.current;if(!el)return;
   if(!el.closest('.operatorDesk'))return;
   let low=1,high=22;
   for(let i=0;i<12;i++){
    const mid=(low+high)/2;el.style.fontSize=mid+'px';
    if(el.scrollHeight<=el.clientHeight+1&&el.scrollWidth<=el.clientWidth+1)low=mid;else high=mid;
   }
   el.style.fontSize=low+'px';
  };
  const observer=new ResizeObserver(fit);if(ref.current)observer.observe(ref.current);
  fit();void document.fonts.ready.then(fit);return ()=>observer.disconnect();
 },[text]);
 return <p ref={ref}>{text}</p>;
}
function Answer({ text }: { text: string }) {
  return (
    <div className="guideAnswer compactHostAnswer">
      <span>
        <Shield size={14} />
        ANSWER · HOST ONLY
      </span>
      <p tabIndex={0}>{text}</p>
    </div>
  );
}
function GuideClock({
  seconds,
  paused,
  onToggle, waiting, duration, onSet,
}: {
  waiting: boolean;
  duration: number;
  onSet: (seconds:number) => void;
  seconds: number;
  paused: boolean;
  onToggle: () => void;
}) {
  const [draft,setDraft] = useState(String(duration));
  useEffect(()=>setDraft(String(duration)),[duration]);
  return (
    <div className={`guideClock ${seconds === 0 ? "timeUp" : ""}`}>
      <span>
        <Clock size={17} />
        {formatTime(seconds)}
      </span>
      <button disabled={seconds === 0} onClick={onToggle}>
        {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
        {paused ? (waiting ? "Start Timer" : "Resume") : "Pause"}
      </button>
      <form onSubmit={e=>{e.preventDefault();onSet(Number(draft));}} style={{display:"flex",gap:6,alignItems:"center"}}>
        <input aria-label="Question Time (seconds)" type="number" min="1" max="3600" required value={draft} onChange={e=>setDraft(e.target.value)} style={{width:78,padding:8}}/> seconds
        <button type="submit">Set Time</button>
      </form>
    </div>
  );
}
function GradeActions({
  game,
  onGrade,
}: {
  game: Game;
  onGrade: (correct: boolean) => void;
}) {
  const q = currentQuestion(game);
  let correct = q ? DIFFICULTY[q.difficulty].points : 0,
    wrong = -correct;
  if (["question", "host-answer"].includes(game.phase)) {
    if (game.usedCard === "double") {
      correct *= 2;
      wrong *= 2;
    }
    if (game.usedCard === "safe") wrong = 0;
  }
  return (
    <div className="simpleGrades">
      <button className="gradeWrong" onClick={() => onGrade(false)}>
        <X size={24} />
        <span>
          <b>Incorrect</b>
          <small>
            {wrong === 0 ? "No Points Lost" : `${signed(wrong)} points`}
          </small>
        </span>
      </button>
      <button className="gradeCorrect" onClick={() => onGrade(true)}>
        <Check size={24} />
        <span>
          <b>Correct</b>
          <small>{signed(correct)} points</small>
        </span>
      </button>
    </div>
  );
}
function ResultChanges({ game }: { game: Game }) {
  const entries = game.history.slice(
    game.questionHistoryStart ?? Math.max(0, game.history.length - 1),
  );
  return (
    <div className="simpleResultChanges">
      {entries.map((entry, i) => {
        const [team, verdict, kind] = entry.label.split(" · "),
          amount = entry.delta.reduce((a, b) => a + b, 0);
        return (
          <div key={`${entry.time}-${i}`}>
            <span>
              <b>
                {team} answered {verdict}
              </b>
              <small>
                {kind === "Challenge"
                  ? "Challenge Attempt"
                  : kind === "Steal"
                    ? "Steal Attempt"
                    : "Original Team Attempt"}
              </small>
            </span>
            <strong
              className={amount > 0 ? "positive" : amount < 0 ? "negative" : ""}
            >
              {amount === 0 ? "No Score Change" : `${signed(amount)} points`}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
function SimpleRanking({ game }: { game: Game }) {
  const ranks = rankingRows(game);
  return (
    <div className="simpleRanking">
      {ranks.map(({ team, index, place, shared }) => (
        <div key={index} style={teamStyle(index)}>
          <span title={shared ? `Tied for Place ${place}` : `Place ${place}`}>
            {shared ? `=${place}` : place}
          </span>
          <b>
            <i />
            {team.name}
          </b>
          <small>{remainingCards(team)} cards left</small>
          <strong>{team.score} points</strong>
        </div>
      ))}
      {ranks.some((row) => row.shared) && (
        <p className="guideInlineNote">
          An equals sign marks teams tied on both points and unused cards.
        </p>
      )}
    </div>
  );
}
function SimpleHistory({ game }: { game: Game }) {
  return (
    <div className="simpleHistory">
      <h1>Score History</h1>

      {game.history
        .slice()
        .reverse()
        .map((entry, i) => (
          <div key={`${entry.time}-${i}`}>
            <time>
              {new Date(entry.time).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <b>{entry.label}</b>
            <strong>
              {signed(entry.delta.reduce((a, b) => a + b, 0))} points
            </strong>
          </div>
        ))}
      {!game.history.length && <span>No answers have been scored yet.</span>}
    </div>
  );
}
