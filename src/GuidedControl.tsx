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
const friendly = (s: string) =>
  s.replaceAll("Challenge", "Thách đố").replaceAll("Steal", "Cướp điểm");

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
  const challengeSeconds = difficulty
    ? Math.max(0, Math.ceil(difficulty.challenge - time.elapsed / 1000))
    : 0;
  const challengeAvailable =
    game.phase === "question" &&
    game.host !== null &&
    game.teams[game.host].cards.challenge > 0 &&
    !game.paused &&
    challengeSeconds > 0;
  const responder = ["challenge", "steal-answer", "sudden-death"].includes(
    game.phase,
  )
    ? game.answering
    : game.host;
  const hostName =
    game.host === null ? "đội chủ nhà" : game.teams[game.host].name;
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
      {animation.event && <div className="animationStatus"><b>{animation.event.result ? "Kết quả" : "Đang phát"} · {animation.event.teamName}</b><button onClick={animation.skip}>Bỏ qua hoạt ảnh</button></div>}
      {practice && (
        <div className="practiceBanner">
          <span>
            <Zap size={16} />
            <b>Đang tập điều khiển</b>

          </span>
          <button onClick={returnToReal}>
            Về trận thật <ArrowRight size={15} />
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
            ĐẤU TRÍ
          </b>
        </button>
        <div className="guideHeaderActions">
          {game.phase === "setup" && <button className="guideOutline" onClick={()=>{localStorage.setItem(INTRO,"done");setWelcome(false);setPage("play");commit(g=>({...g,introSlide:0}));}}>Giới thiệu luật</button>}
          <a
            className="guideOutline guideAccount"
            href="/account"
            aria-label="Tài khoản admin"
            title="Soạn và lưu bộ đề trên tài khoản"
          >
            <UserRound size={17} />
            <span>Tài khoản admin</span>
          </a>
          <button className="guideOutline" onClick={openAudience}>
            <Monitor size={17} />
            <span>Màn hình người chơi</span>
          </button>
          <div className="guideMenuWrap" ref={menuRef}>
            <button
              className={`guideTextButton ${menu ? "selected" : ""}`}
              onClick={() => setMenu((value) => !value)}
              aria-expanded={menu}
            >
              <Settings2 size={17} />
              <span>Quản lý</span>
              <ChevronDown size={14} />
            </button>
            {menu && (
              <nav className="guideMenu" aria-label="Quản lý trận">
                <button onClick={() => showPage("play")}>
                  <Play size={16} />
                  Trở lại trò chơi
                </button>
                <button onClick={() => showPage("settings")}>
                  <Settings2 size={16} />
                  Đặt tên đội & quy ước
                </button>
                <button onClick={() => showPage("questions")}>
                  <BookOpen size={16} />
                  Soạn bộ câu hỏi
                </button>
                <a href={practice?"/leaderboard?practice=1":"/leaderboard"} target="_blank" rel="noreferrer">Bảng xếp hạng trực tiếp ↗</a>
                <a href={practice?"/leaderboard?edit=1&practice=1":"/leaderboard?edit=1"} target="_blank" rel="noreferrer">Edit Overlay · Căn chữ trên cờ ↗</a>
                <a href="/animation-preview" target="_blank" rel="noreferrer">Thử thẻ quyền năng ↗</a>
                <button onClick={() => showPage("history")}>
                  <History size={16} />
                  Xem lịch sử điểm
                </button>
                <hr />
                <button
                  onClick={() => {
                    setDialog("help");
                    setMenu(false);
                  }}
                >
                  <HelpCircle size={16} />
                  Cách điều khiển
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
                  {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}Âm
                  thanh: {sound ? "đang bật" : "đang tắt"}
                </button>
                <button
                  onClick={() => {
                    setDialog("reset");
                    setMenu(false);
                  }}
                >
                  <RotateCcw size={16} />
                  Tạo trận mới
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
          <h1>Sẵn sàng chơi?</h1>
          <div className="welcomeSteps">
            <div>
              <span>
                <Target size={24} />
              </span>
              <b>1. Chọn đội</b>

            </div>
            <ChevronRight size={19} />
            <div>
              <span>
                <BookOpen size={24} />
              </span>
              <b>2. Mở câu hỏi</b>

            </div>
            <ChevronRight size={19} />
            <div>
              <span>
                <Check size={25} />
              </span>
              <b>3. Chấm câu trả lời</b>

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
                ? "Soạn câu hỏi đầu tiên"
                : game.history.length || isLive(game)
                  ? "Tiếp tục trận đã lưu"
                  : "Bắt đầu điều khiển"}
              <ArrowRight size={19} />
            </button>
            <button
              className="guidePractice"
              onClick={practiceStart}
              disabled={!game.questions.length}
              title={
                !game.questions.length
                  ? "Soạn ít nhất một câu hỏi trước khi tập"
                  : undefined
              }
            >
              <Play size={18} />
              Tập thử một câu trước
            </button>
          </div>
          <p className="practicePromise">
            {game.questions.length
              ? "Chế độ tập hoàn toàn riêng. Bạn có thể bấm thử mà không thay đổi trận thật."
              : "Bộ câu hỏi đang trống. Admin có thể tự soạn hoặc nhập bộ đề JSON."}
          </p>
          <button
            className="welcomePrepare"
            onClick={() => showPage("settings")}
          >
            Chưa chuẩn bị đội và câu hỏi?{" "}
            <span>
              Chuẩn bị trận đấu <ArrowRight size={13} />
            </span>
          </button>
        </main>
      ) : page === "play" ? game.introSlide != null ? (<IntroControl game={game} commit={commit} onAudience={openAudience}/>) : (
        <main className={`guideShell operatorDesk operator-${game.phase}`}>
          <div className="simpleScoreStrip" aria-label="Điểm hiện tại">
            {game.teams.map((team, i) => (
              <div key={i} style={teamStyle(i)}>
                <span>
                  <i />
                  {team.name}
                </span>
                <b>
                  {team.score}
                  <small>điểm</small>
                </b>
              </div>
            ))}
          </div>
          <div className="guideRoundLine">
            <span>
              Vòng <b>{game.round}</b> / {gameRounds(game).length} · {gameRounds(game)[game.round - 1]}
              {q && (game.phase !== "setup" || game.boardSelectedId === q.id) && (
                <>
                  <i />
                  Câu <b>{questionNumber}</b> / {roundQuestions.length}
                </>
              )}
              {q?.id.startsWith("demo") && <em>CÂU MẪU</em>}
            </span>
            <button onClick={() => setDialog("scores")}>
              Xem điểm & thẻ <ChevronRight size={14} />
            </button>
          </div>

          {game.phase === "setup" && (
            <Step number={1} title="Chọn đội và ô câu hỏi" instruction="Đội chọn số, MC bấm ô tương ứng rồi mở gợi ý.">
              <div className="simpleTeamGrid boardTeamGrid">
                {game.teams.map((team,i)=><button key={i} style={teamStyle(i)} disabled={hasHostedRound(game,i)} className={game.host===i?"selected":""} onClick={()=>commit(g=>selectHost(g,i))}><span className="simpleTeamInitial">{i+1}</span><b>{team.name}</b><span className="simpleTeamCheck">{hasHostedRound(game,i)?"Đã dùng lượt":game.host===i&&<Check size={17}/>}</span></button>)}
              </div>
              <QuestionBoard game={game} disabled={game.host===null} onChoose={id=>commit(g=>chooseQuestion(g,id))}/>
              {game.host===null && <div className="boardNoHost">Chọn đội đến lượt trước.</div>}
              {q && game.boardSelectedId===q.id && <>
                <div className="boardSelectedMeta"><b>Câu {questionNumber}</b><span>{difficulty?.label} · {difficulty?.points} điểm · {q ? questionSeconds(q) : 0} giây</span></div>
                <div className="guideNext"><button className="guidePrimary" disabled={game.host===null} onClick={()=>game.rulesConfirmed?commit(prepareHint):setDialog("rules")}>Mở gợi ý · Câu {questionNumber}<ArrowRight size={19}/></button></div>
                <details className="simplePreview questionBoardHelp"><summary>Xem trước (MC)<ChevronDown size={13}/></summary><p>{q.text}</p><span>Đáp án: {q.answer}</span></details>
              </>}
              {!roundQuestions.length && <div className="guideEmpty"><BookOpen size={30}/><h3>Vòng này chưa có câu hỏi</h3><button className="guidePrimary" onClick={()=>showPage("questions")}>Soạn câu hỏi<ArrowRight size={17}/></button></div>}
              {remainingQuestions(game).length===0 && <button className="guidePrimary" onClick={()=>setDialog("round")}>Tổng kết vòng</button>}
            </Step>
          )}

          {game.phase === "hint" && q && (
            <Step
              number={2}
              title={
                game.hintRead
                  ? `Chốt thẻ cho ${hostName}.`
                  : `Đọc gợi ý cho ${hostName}.`
              }
              instruction={
                game.hintRead
                  ? "Đội đã nghe gợi ý nhưng chưa biết câu hỏi. Ghi nhận lựa chọn thẻ, rồi mới mở câu hỏi."
                  : "Câu hỏi chính vẫn đang ẩn. Đọc gợi ý bên dưới cho đội nghe, rồi bấm “Đã đọc xong gợi ý”."
              }
            >
              <ReadAloud
                label={
                  game.hintRead
                    ? "GỢI Ý ĐÃ ĐỌC · CÂU HỎI VẪN ĐANG ẨN"
                    : "BẠN ĐỌC GỢI Ý NÀY"
                }
                text={
                  q.hint ||
                  "Câu này chưa có gợi ý. MC có thể đọc gợi ý trực tiếp."
                }
              />
              {game.hintRead ? (
                <>
                  <div className="powerQuestion">
                    <h3>{hostName} chọn cách chơi nào?</h3>
                    <span>
                      Chọn một trong ba cách. Thẻ chỉ bị trừ khi bạn mở câu hỏi.
                    </span>
                  </div>
                  <div className="simplePowers cardHand">
                    {(
                      [
                        {
                          id: "none",
                          name: "Không dùng thẻ",
                          correct: difficulty!.points,
                          wrong: -difficulty!.points,
                        },
                        {
                          id: "double",
                          name: "Cược lớn",
                          correct: difficulty!.points * 2,
                          wrong: -difficulty!.points * 2,
                        },
                        {
                          id: "safe",
                          name: "An toàn",
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
                          {option.id !== "none" && <><CardArt card={option.id} className="powerChoiceArt"/><span className="cardHandCount">{game.teams[game.host!].cards[option.id]} thẻ</span></>}
                          <span className="powerRadio">
                            {selected && <Check size={12} />}
                          </span>
                          <strong>{option.name}</strong>
                          <span>
                            {unavailable
                              ? "Đã hết thẻ"
                              : `Đúng ${signed(option.correct)} · Sai ${signed(option.wrong)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {game.usedCard && (
                    <p className="guideInlineNote">
                      Thẻ đã được dùng ở lượt đang lưu. Bạn có thể tiếp tục mở
                      câu hỏi.
                    </p>
                  )}
                  <div className="guideNext">
                    <button className="guidePrimary" onClick={openWithPower}>
                      <Play size={18} />
                      Mở câu hỏi lên màn chiếu · {q ? questionSeconds(q) : 0} giây
                    </button>
                  </div>
                </>
              ) : (
                <div className="guideNext">
                  <button
                    className="guidePrimary"
                    onClick={() => commit(acknowledgeHint)}
                  >
                    Đã đọc xong gợi ý — chọn thẻ <ArrowRight size={18} />
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
                Quay lại chọn đội
              </button>
            </Step>
          )}

          {game.phase === "question" && q && !choosingChallenge && (
            <Step
              number={3}
              title={`Nghe ${hostName} trả lời.`}
              instruction={
                practice
                  ? "Giả sử đội đã trả lời. So với đáp án bên dưới và bấm Đúng hoặc Sai."
                  : "Đọc câu hỏi, nghe câu trả lời của đội, rồi bấm Đúng hoặc Sai."
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
                  Đã hết giờ. Bạn vẫn là người xác nhận đúng hoặc sai.
                </div>
              )}
              <ReadAloud
                label="CÂU HỎI ĐANG HIỆN VỚI NGƯỜI CHƠI"
                text={q.text}
              />
              {q.image && (
                <img
                  className="guideQuestionImage"
                  src={q.image}
                  alt="Minh họa câu hỏi"
                />
              )}
              <Answer text={q.answer} />
              {game.usedCard && (
                <div className="guideActivePower">
                  <CardArt card={game.usedCard} className="inlineCardArt"/>
                  Đội đã chọn{" "}
                  <b>{game.usedCard === "double" ? "Cược lớn" : "An toàn"}</b>.
                  Điểm trên hai nút đã được tính sẵn.
                </div>
              )}
              <GradeActions game={game} onGrade={grade} />
              {game.host !== null &&
                game.teams[game.host].cards.challenge > 0 && (
                  <div className="simpleChallenge">
                    <span>
                      <b>Đội có yêu cầu Thách đố?</b>
                      <small>
                        {challengeAvailable
                          ? `Còn ${challengeSeconds} giây để chỉ định đội khác.`
                          : game.paused
                            ? "Tiếp tục đồng hồ nếu đội muốn dùng thẻ."
                            : "Đã hết thời gian dùng thẻ cho câu này."}
                      </small>
                    </span>
                    <button
                      className="challengeCardButton"
                      disabled={!challengeAvailable}
                      onClick={() => setChoosingChallenge(true)}
                    >
                      <CardArt card="challenge" className="challengeChoiceArt"/>
                      <b>Dùng Thách đố</b>
                    </button>
                  </div>
                )}
            </Step>
          )}

          {((game.phase === "question" && choosingChallenge) ||
            (game.phase === "challenge" && game.answering === null)) && (
            <Step
              number={3}
              title={`${hostName} thách đố đội nào?`}
              instruction="Bấm đội mà chủ nhà chỉ định. Đội đó phải trả lời ngay."
              aside={
                game.phase === "question" ? (
                  <span className="challengeDeadline">
                    Còn {challengeSeconds}s
                  </span>
                ) : undefined
              }
            >
              {game.usedCard && (
                <div className="guideBurn">
                  <Zap size={19} />
                  <span>
                    Thẻ{" "}
                    <b>{game.usedCard === "double" ? "Cược lớn" : "An toàn"}</b>{" "}
                    đã đặt sẽ cháy. Chủ nhà mất cả thẻ đó và thẻ Thách đố.
                  </span>
                </div>
              )}
              {!challengeAvailable && game.phase === "question" && (
                <div className="guideTimeUp">
                  Đã hết hạn Thách đố. Hãy quay lại để chấm câu trả lời của chủ
                  nhà.
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
                        <b>Thách đố {team.name}</b>
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
                  Không dùng thẻ, quay lại câu hỏi
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
                    ? `${game.teams[responder].name} phải trả lời ngay.`
                    : `Nghe ${game.teams[responder].name} trả lời.`
                }
                instruction={
                  game.phase === "challenge"
                    ? "Chủ nhà đã dùng Thách đố. Bạn nghe câu trả lời và chấm kết quả."
                    : game.phase === "steal-answer"
                      ? "Đội này đã giành quyền cướp điểm. Nghe và chấm câu trả lời cho chính câu vừa rồi."
                      : "Theo quy ước đã chọn, chủ nhà được tiếp tục trả lời câu hỏi này."
                }
              >
                {game.phase === "challenge" && game.notice.includes("cháy") && (
                  <div className="guideBurn">
                    <Zap size={18} />
                    {friendly(game.notice)}
                  </div>
                )}
                <ReadAloud label="CÂU HỎI" text={q.text} />
                <Answer text={q.answer} />
                <GradeActions game={game} onGrade={grade} />
                <p className="guideInlineNote">
                  {game.phase === "challenge"
                    ? "Nếu đội bị Thách đố trả lời sai, câu hỏi kết thúc ngay và không có cướp điểm."
                    : game.phase === "steal-answer"
                      ? "Đây là lượt cướp điểm duy nhất. Dù đúng hay sai, câu hỏi sẽ kết thúc."
                      : "Điểm trên hai nút đã được tính theo thẻ còn hiệu lực."}
                </p>
              </Step>
            )}

          {game.phase === "steal-window" && (
            <Step
              number={3}
              title="Có đội nào giơ thẻ cướp điểm?"
              instruction={
                practice
                  ? "Giả sử Đội 2 giơ thẻ nhanh nhất. Bấm vào Đội 2 để cho đội trả lời."
                  : "Chủ nhà vừa trả lời sai. Nhìn các đội giơ thẻ và bấm vào đội giơ nhanh nhất."
              }
              aside={
                <span className="challengeDeadline">
                  <Clock size={15} />
                  {Math.max(
                    0,
                    Math.ceil(((game.stealDeadline ?? now) - now) / 1000),
                  )}{" "}
                  giây
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
                          <b><CardArt card="steal" className="inlineCardArt"/>{team.name} giơ nhanh nhất</b>
                          <small>
                            {team.cards.steal
                              ? `Còn ${team.cards.steal} thẻ cướp điểm · chọn sẽ dùng 1 thẻ`
                              : "Đã hết thẻ cướp điểm"}
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
                  Không đội nào giơ thẻ <ArrowRight size={17} />
                </button>
              </div>
              <p className="guideInlineNote">
                Mỗi câu chỉ có một lượt cướp điểm. Website tự trừ thẻ và tính
                điểm.
              </p>
            </Step>
          )}

          {game.phase === "result" && (
            <Step
              number={4}
              title={
                practice
                  ? "Bạn vừa điều khiển xong một câu!"
                  : "Câu này đã xong."
              }
              instruction={
                game.answerRevealed
                  ? "Người chơi đã thấy đáp án. Bạn có thể chuyển sang lượt tiếp theo."
                  : "Điểm đã được cập nhật. Bấm nút phía dưới để công bố đáp án cho người chơi."
              }
            >
              <ResultChanges game={game} />
              {game.answerRevealed && q && (
                <div className="publishedAnswer">
                  <span>
                    <Check size={17} />
                    ĐÁP ÁN ĐÃ CÔNG BỐ
                  </span>
                  <p>{q.answer}</p>
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
                    ? "Công bố đáp án cho người chơi"
                    : practice
                      ? "Tôi hiểu rồi — vào trận thật"
                      : hasNext
                        ? "Về bảng chọn câu"
                        : `Tổng kết vòng ${game.round}`}
                  <ArrowRight size={19} />
                </button>
              </div>
              {practice && game.answerRevealed && (
                <button className="guideBack" onClick={finishQuestion}>
                  Tập thêm một câu nữa <ArrowRight size={14} />
                </button>
              )}
            </Step>
          )}

          {game.phase === "round-summary" && (
            <Step
              title={`Đã hoàn thành vòng ${game.round}.`}
              instruction="Điểm và những thẻ chưa dùng được giữ nguyên. Bạn không cần cấp lại thẻ hay nhập lại điểm."
            >
              <SimpleRanking game={game} />
              <div className="guideNext">
                <button
                  className="guidePrimary"
                  onClick={() => commit(finishRound)}
                >
                  {game.round >= gameRounds(game).length
                    ? "Xem kết quả chung cuộc"
                    : `Bắt đầu vòng ${game.round + 1}`}
                  <ArrowRight size={19} />
                </button>
              </div>
            </Step>
          )}

          {game.phase === "finished" && (
            <Step
              title={
                game.suddenWinner !== null || tiedLeaders(game).length === 1
                  ? "Trận đấu đã có nhà vô địch!"
                  : "Cần một câu hỏi phụ để phân thắng thua."
              }
              instruction={
                game.suddenWinner !== null || tiedLeaders(game).length === 1
                  ? "Xếp hạng được tính theo điểm, rồi số thẻ còn lại."
                  : "Các đội dẫn đầu bằng cả điểm và số thẻ còn lại. Bạn sẽ tổ chức một câu phụ, không dùng thẻ."
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
                    ? "Bắt đầu câu hỏi phụ"
                    : "Tạo trận mới"}
                  <ArrowRight size={19} />
                </button>
              </div>
            </Step>
          )}

          {game.phase === "sudden-death" && (
            <Step
              title={
                game.answering === null
                  ? "Đội nào bấm chuông trước?"
                  : `Nghe ${game.teams[game.answering].name} trả lời.`
              }
              instruction={
                game.answering === null
                  ? "Đọc câu hỏi phụ. Khi một đội giành chuông, bấm vào tên đội đó. Chuông từ màn hình người chơi cũng được nhận tự động."
                  : "Đối chiếu đáp án rồi chấm. Câu phụ không dùng thẻ và không cộng trừ điểm."
              }
            >
              {game.suddenQuestion ? (
                <ReadAloud label="CÂU HỎI PHỤ" text={game.suddenQuestion} />
              ) : (
                <div className="guideSubline">
                  Bạn có thể đọc câu phụ trực tiếp, hoặc nhập để đưa lên màn
                  hình người chơi.
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
                Nhập câu hỏi phụ & đáp án <ChevronRight size={14} />
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
                      <b>{game.teams[i].name} giành chuông</b>
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
                      <b>Trả lời sai</b>
                    </button>
                    <button
                      className="gradeCorrect"
                      onClick={() => grade(true)}
                    >
                      <Check size={24} />
                      <b>Trả lời đúng</b>
                    </button>
                  </div>
                </>
              )}
              {game.notice && (
                <p className="guideInlineNote">{friendly(game.notice)}</p>
              )}
            </Step>
          )}

          {game.notice &&
            ["setup", "hint", "question"].includes(game.phase) && (
              <div className="guideFeedback" role="status">
                <Info size={15} />
                {friendly(game.notice)}
              </div>
            )}
          <div className="guideUtilities">
            <button
              disabled={!undoCount}
              onClick={() => {
                undo();
                notify(
                  "Đã quay lại thao tác trước. Điểm và thẻ đã được khôi phục.",
                );
              }}
            >
              <RotateCcw size={15} />
              Bấm nhầm? Quay lại thao tác trước
            </button>
            <button onClick={() => setDialog("help")}>
              <HelpCircle size={15} />
              Tôi cần hướng dẫn
            </button>
          </div>
          {game.phase === "setup" && q && (
            <div className="guideQuietActions">
              <button onClick={() => setDialog("round")}>
                Kết thúc vòng sớm
              </button>

            </div>
          )}
        </main>
      ) : (
        <main className="guideManagement">
          <button className="managementBack" onClick={() => setPage("play")}>
            <ArrowLeft size={16} />
            {isLive(game) ? "Trở lại câu đang chơi" : "Quay lại trò chơi"}
          </button>
          {page === "settings" ? (
            <>
              <div className="managementPrepHint">
                Chuẩn bị theo thứ tự: <b>1. Đặt tên đội & quy ước</b>
                <ArrowRight size={14} />
                <button onClick={() => setPage("questions")}>
                  2. Soạn câu hỏi
                </button>
                <ArrowRight size={14} />
                <button
                  onClick={() => {
                    begin();
                  }}
                >
                  3. Bắt đầu chơi
                </button>
              </div>
              <GameSettings game={game} commit={commit} notify={notify} />
            </>
          ) : page === "questions" ? (
            <>
              <div className="managementPrepHint">
                Soạn xong bộ đề?{" "}
                <button onClick={begin}>
                  Bắt đầu điều khiển <ArrowRight size={14} />
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
          title="Thống nhất quy ước trước trận"
          description="File luật gốc chưa xác định 5 tình huống dưới đây. Đây là lựa chọn bổ sung của ban tổ chức, không phải luật mặc định chính thức."
          onClose={() => setDialog(null)}
        >
          <ol className="rulesSummary">
            <li>
              <b>Chọn chủ nhà</b>
              <span>
                {game.settings.hostMode === "manual"
                  ? "MC chọn từng câu"
                  : game.settings.hostMode === "rotate"
                    ? "Luân phiên theo số câu đã chơi"
                    : "Bốc thăm thứ tự một lần cho mỗi vòng"}
              </span>
            </li>
            <li>
              <b>Đội bị Thách đố trả lời đúng</b>
              <span>
                {game.settings.challengeCorrect === "end"
                  ? "Kết thúc câu hỏi"
                  : "Chủ nhà tiếp tục, tính điểm gốc"}
              </span>
            </li>
            <li>
              <b>Thời gian chờ cướp điểm</b>
              <span>
                {game.settings.stealSeconds} giây
                {game.settings.stealSeconds === 0
                  ? " (không mở cửa cướp điểm)"
                  : ""}
              </span>
            </li>
            <li>
              <b>Không đội nào cướp điểm</b>
              <span>
                {game.settings.noSteal === "end"
                  ? "Kết thúc câu hỏi"
                  : "Chủ nhà được trả lời lại"}
              </span>
            </li>
            <li>
              <b>Hơn hai đội hòa</b>
              <span>
                {game.settings.multiTie === "bracket"
                  ? "Đối đầu lần lượt"
                  : "Câu hỏi chung, tranh chuông"}
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
              Đổi quy ước
            </button>
            <button
              className="guidePrimary"
              onClick={() => {
                commit((g) => prepareHint(confirmRules(g)));
                setDialog(null);
              }}
            >
              Đã thống nhất — đọc gợi ý <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "scores" && (
        <Modal
          title="Điểm và thẻ của 4 đội"
          description="Mỗi đội có 5 thẻ cho cả ba vòng. Thẻ đã dùng không được cấp lại."
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
                  <b>{team.score} điểm</b>
                </div>
                <dl>
                  {(
                    [
                      { key: "double", name: "Cược lớn" },
                      { key: "safe", name: "An toàn" },
                      { key: "challenge", name: "Thách đố" },
                      { key: "steal", name: "Cướp điểm" },
                    ] as const
                  ).map((card) => (
                    <div
                      key={card.key}
                      className={!team.cards[card.key] ? "exhausted" : ""}
                    >
                      <dt><CardArt card={card.key} className="detailCardArt"/>{card.name}</dt>
                      <dd>{team.cards[card.key]} thẻ</dd>
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
          title="Bạn chỉ cần đi theo màn hình"
          description="Mỗi bước sẽ nói rõ bạn cần đọc gì, hỏi đội điều gì và bấm nút nào."
          onClose={() => setDialog(null)}
        >
          <ol className="simpleHelp">
            <li>
              <b>Chọn đội trả lời trước.</b>
              <span>Đó là đội chủ nhà của câu hỏi.</span>
            </li>
            <li>
              <b>Đọc gợi ý, hỏi đội có dùng thẻ không.</b>
              <span>
                Không dùng thẻ, Cược lớn hoặc An toàn. Sau đó mở câu hỏi.
              </span>
            </li>
            <li>
              <b>Nghe câu trả lời và bấm Đúng / Sai.</b>
              <span>
                Đáp án nằm ngay trên hai nút. Bạn không phải tính điểm.
              </span>
            </li>
            <li>
              <b>Nếu có thẻ phát sinh, làm theo hướng dẫn.</b>
              <span>
                Thách đố: chọn đội bị ép trả lời. Cướp điểm: chọn đội giơ thẻ
                nhanh nhất.
              </span>
            </li>
            <li>
              <b>Công bố đáp án rồi sang câu tiếp.</b>
              <span>Website giữ nguyên điểm và thẻ qua ba vòng.</span>
            </li>
          </ol>
          <button className="guidePrimary full" onClick={practiceStart}>
            <Play size={17} />
            Tập thử một câu riêng
          </button>
          <p className="practicePromise">
            Không thay đổi điểm hoặc thẻ của trận thật.
          </p>
        </Modal>
      )}
      {dialog === "reset" && (
        <Modal
          title="Tạo một trận mới?"
          description="Điểm, thẻ và lịch sử sẽ được làm mới. Tên đội, bộ câu hỏi và các quy ước được giữ lại. Bạn có thể hoàn tác nếu bấm nhầm."
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Giữ trận hiện tại
            </button>
            <button className="guidePrimary" onClick={reset}>
              Tạo trận mới <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "round" && (
        <Modal
          title={`Kết thúc vòng ${game.round} sớm?`}
          description={`Vòng này còn ${remainingQuestions(game).length} câu chưa chơi. Điểm và thẻ vẫn được giữ nguyên.`}
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Chơi tiếp
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
              Xem tổng kết vòng
            </button>
          </div>
        </Modal>
      )}
      {dialog === "sudden" && (
        <Modal
          title="Chuẩn bị câu hỏi phụ"
          description="Chỉ nội dung câu hỏi được đưa lên màn hình người chơi. Đáp án dành riêng cho bạn."
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
              Câu hỏi phụ
              <textarea
                value={suddenDraft.question}
                onChange={(e) =>
                  setSuddenDraft({ ...suddenDraft, question: e.target.value })
                }
                required
              />
            </label>
            <label>
              Đáp án
              <input
                value={suddenDraft.answer}
                onChange={(e) =>
                  setSuddenDraft({ ...suddenDraft, answer: e.target.value })
                }
              />
            </label>
            <div className="modalFooter">
              <button className="guidePrimary" type="submit">
                Hiện câu hỏi phụ <ArrowRight size={16} />
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
          {number && <span className="guideStepNumber">BƯỚC {number} / 4</span>}
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
    <div className="guideAnswer">
      <span>
        <Shield size={14} />
        ĐÁP ÁN · CHỈ BẠN THẤY
      </span>
      <OperatorText text={text}/>
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
        {paused ? (waiting ? "Bắt đầu bấm giờ" : "Tiếp tục") : "Tạm dừng"}
      </button>
      <form onSubmit={e=>{e.preventDefault();onSet(Number(draft));}} style={{display:"flex",gap:6,alignItems:"center"}}>
        <input aria-label="Thời gian câu hỏi (giây)" type="number" min="1" max="3600" required value={draft} onChange={e=>setDraft(e.target.value)} style={{width:78,padding:8}}/> giây
        <button type="submit">Đặt giờ</button>
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
          <b>Trả lời sai</b>
          <small>
            {wrong === 0 ? "Không mất điểm" : `${signed(wrong)} điểm`}
          </small>
        </span>
      </button>
      <button className="gradeCorrect" onClick={() => onGrade(true)}>
        <Check size={24} />
        <span>
          <b>Trả lời đúng</b>
          <small>{signed(correct)} điểm</small>
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
                {team} trả lời {verdict}
              </b>
              <small>
                {kind === "Challenge"
                  ? "Lượt bị Thách đố"
                  : kind === "Steal"
                    ? "Lượt cướp điểm"
                    : "Lượt của chủ nhà"}
              </small>
            </span>
            <strong
              className={amount > 0 ? "positive" : amount < 0 ? "negative" : ""}
            >
              {amount === 0 ? "Không đổi điểm" : `${signed(amount)} điểm`}
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
          <span title={shared ? `Đồng hạng ${place}` : `Hạng ${place}`}>
            {shared ? `=${place}` : place}
          </span>
          <b>
            <i />
            {team.name}
          </b>
          <small>{remainingCards(team)} thẻ còn lại</small>
          <strong>{team.score} điểm</strong>
        </div>
      ))}
      {ranks.some((row) => row.shared) && (
        <p className="guideInlineNote">
          Dấu = là đồng hạng: các đội đang bằng cả điểm và số thẻ còn lại.
        </p>
      )}
    </div>
  );
}
function SimpleHistory({ game }: { game: Game }) {
  return (
    <div className="simpleHistory">
      <h1>Lịch sử điểm</h1>

      {game.history
        .slice()
        .reverse()
        .map((entry, i) => (
          <div key={`${entry.time}-${i}`}>
            <time>
              {new Date(entry.time).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <b>{friendly(entry.label)}</b>
            <strong>
              {signed(entry.delta.reduce((a, b) => a + b, 0))} điểm
            </strong>
          </div>
        ))}
      {!game.history.length && <span>Chưa có câu trả lời nào được chấm.</span>}
    </div>
  );
}
