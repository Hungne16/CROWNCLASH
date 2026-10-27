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
  X,
  Zap,
} from "lucide-react";
import {
  DIFFICULTY,
  initialGame,
  rankTeams,
  remainingCards,
  type Game,
} from "./game";
import {
  activateCard,
  assignHost,
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
  remainingQuestions,
  scoreAnswer,
  scoreSudden,
  selectHost,
  startSudden,
  stealTeam,
  STORE,
  tiedLeaders,
  toggleClock,
  UNDO_STORE,
} from "./controller";
import { formatTime, Modal, teamStyle } from "./Common";
import { GameSettings, QuestionBank } from "./Manage";
import { Presentation } from "./Presentation";
import { useGame, useNow } from "./useGame";

type Page = "play" | "questions" | "settings" | "history";
type Dialog =
  "questions" | "scores" | "help" | "reset" | "round" | "sudden" | null;
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
  const { game, commit, undo, undoCount, sendBuzz, storageError } = useGame(
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
        : "none",
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
    commit((g) =>
      g.phase === "sudden-death"
        ? scoreSudden(g, correct)
        : scoreAnswer(g, correct),
    );
  useEffect(() => {
    setChoosingChallenge(false);
    if (game.phase === "hint")
      setPower(
        game.usedCard === "double" || game.usedCard === "safe"
          ? game.usedCard
          : "none",
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
    return <Presentation game={game} now={now} onBuzz={sendBuzz} />;

  const begin = () => {
    localStorage.setItem(INTRO, "done");
    setWelcome(false);
    setPage("play");
  };
  const practiceStart = () => {
    localStorage.setItem(
      `${STORE}-practice`,
      JSON.stringify(createPracticeGame(game.questions)),
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
      if (g.phase !== "hint") return g;
      let next = g;
      if (!g.usedCard && power !== "none") {
        next = activateCard(g, power);
        if (next.usedCard !== power) return next;
      }
      return openQuestion(next);
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
  const chooseFirst = () =>
    commit((g) => {
      const first = remainingQuestions(g)[0];
      return first ? chooseQuestion(g, first.id) : g;
    });

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
      {practice && (
        <div className="practiceBanner">
          <span>
            <Zap size={16} />
            <b>Đang tập điều khiển</b>
            <span>Điểm và thẻ ở đây không tính vào trận thật.</span>
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
            ĐẤU TRÍ<small>Dành cho quản trò</small>
          </b>
        </button>
        <div className="guideHeaderActions">
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
          <div className="welcomeTag">BẠN KHÔNG CẦN TỰ NHỚ THỨ TỰ</div>
          <h1>
            Điều khiển trò chơi,
            <br />
            từng bước một.
          </h1>
          <p className="welcomeIntro">
            Màn hình sẽ chỉ cho bạn việc cần làm ngay lúc đó.
            <br />
            Website tự tính điểm, giữ thẻ và chuyển lượt.
          </p>
          <div className="welcomeSteps">
            <div>
              <span>
                <Target size={24} />
              </span>
              <b>1. Chọn đội</b>
              <p>Ai được trả lời trước?</p>
            </div>
            <ChevronRight size={19} />
            <div>
              <span>
                <BookOpen size={24} />
              </span>
              <b>2. Mở câu hỏi</b>
              <p>Đọc gợi ý, rồi bắt đầu.</p>
            </div>
            <ChevronRight size={19} />
            <div>
              <span>
                <Check size={25} />
              </span>
              <b>3. Chấm câu trả lời</b>
              <p>Bấm Đúng hoặc Sai.</p>
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
      ) : page === "play" ? (
        <main className="guideShell">
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
              Vòng <b>{game.round}</b> / 3
              {q && (
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
            <Step
              number={1}
              title={q ? "Đội nào trả lời trước?" : "Soạn bộ câu hỏi của bạn."}
              instruction={
                !q
                  ? "Bộ đề đang trống. Admin có thể thêm câu hỏi hoặc nhập bộ đề JSON."
                  : practice
                    ? "Để tập, chọn Đội 1 rồi bấm “Đọc gợi ý cho Đội 1”."
                    : "Bấm vào đội sẽ trả lời câu này đầu tiên. Đội được chọn là “chủ nhà”."
              }
            >
              {q ? (
                <>
                  <div className="simpleQuestionChoice">
                    <div>
                      <BookOpen size={18} />
                      <span>
                        {difficulty?.label} · {difficulty?.points} điểm ·{" "}
                        {difficulty?.seconds} giây
                      </span>
                    </div>
                    <button onClick={() => setDialog("questions")}>
                      Đổi câu hỏi <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="simpleTeamGrid">
                    {game.teams.map((team, i) => (
                      <button
                        key={i}
                        style={teamStyle(i)}
                        className={game.host === i ? "selected" : ""}
                        onClick={() => commit((g) => selectHost(g, i))}
                      >
                        <span className="simpleTeamInitial">{i + 1}</span>
                        <b>{team.name}</b>
                        <span className="simpleTeamCheck">
                          {game.host === i ? <Check size={17} /> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                  {game.settings.hostMode !== "manual" && (
                    <div className="guideSubline">
                      {game.settings.hostMode === "rotate"
                        ? "Đội được gợi ý theo lượt luân phiên. Bạn vẫn có thể chọn đội khác."
                        : "Đội được chọn theo bốc thăm. Bạn vẫn có thể đổi."}
                      <button onClick={() => commit(assignHost)}>
                        {game.settings.hostMode === "random"
                          ? "Bốc thăm lại"
                          : "Chọn theo lượt"}
                      </button>
                    </div>
                  )}
                  <div className="guideNext">
                    <button
                      className="guidePrimary"
                      disabled={game.host === null}
                      onClick={() => commit(prepareHint)}
                    >
                      {game.host === null
                        ? "Chọn một đội để tiếp tục"
                        : `Đọc gợi ý cho ${hostName}`}
                      <ArrowRight size={19} />
                    </button>
                  </div>
                  <details className="simplePreview">
                    <summary>
                      Xem trước câu hỏi và đáp án <ChevronDown size={13} />
                    </summary>
                    <p>{q.text}</p>
                    <span>Đáp án: {q.answer}</span>
                  </details>
                </>
              ) : (
                <div className="guideEmpty">
                  <BookOpen size={30} />
                  <h3>Vòng này chưa có câu hỏi để chơi.</h3>
                  <p>Thêm câu hỏi vào bộ đề, hoặc chuyển tới tổng kết vòng.</p>
                  <button
                    className="guidePrimary"
                    onClick={() => showPage("questions")}
                  >
                    Thêm câu hỏi <ArrowRight size={17} />
                  </button>
                  {remainingQuestions(game).length > 0 && (
                    <button className="guideOutline" onClick={chooseFirst}>
                      Chọn câu chưa chơi đầu tiên
                    </button>
                  )}
                  {remainingQuestions(game).length === 0 && (
                    <button
                      className="guideOutline"
                      onClick={() => setDialog("round")}
                    >
                      Tổng kết vòng này
                    </button>
                  )}
                </div>
              )}
            </Step>
          )}

          {game.phase === "hint" && q && (
            <Step
              number={2}
              title={`Đọc gợi ý cho ${hostName}.`}
              instruction={
                practice
                  ? "Đọc gợi ý. Bạn có thể giữ “Không dùng thẻ”, rồi bấm “Mở câu hỏi”."
                  : "Đọc phần gợi ý bên dưới. Sau đó hỏi đội có muốn dùng thẻ không."
              }
            >
              <ReadAloud
                label="BẠN ĐỌC GỢI Ý NÀY"
                text={
                  q.hint ||
                  "Câu này chưa có gợi ý. MC có thể đọc gợi ý trực tiếp."
                }
              />
              <div className="powerQuestion">
                <h3>{hostName} chọn cách chơi nào?</h3>
                <span>
                  Chọn một trong ba cách. Thẻ chỉ bị trừ khi bạn mở câu hỏi.
                </span>
              </div>
              <div className="simplePowers">
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
                      className={selected ? "selected" : ""}
                      disabled={unavailable || !!game.usedCard}
                      onClick={() => setPower(option.id)}
                      aria-pressed={selected}
                    >
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
                  Thẻ đã được dùng ở lượt đang lưu. Bạn có thể tiếp tục mở câu
                  hỏi.
                </p>
              )}
              <div className="guideNext">
                <button className="guidePrimary" onClick={openWithPower}>
                  <Play size={18} />
                  Mở câu hỏi · Bắt đầu {difficulty?.seconds} giây
                </button>
              </div>
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
                  {game.usedCard === "double" ? (
                    <Zap size={16} />
                  ) : (
                    <Shield size={16} />
                  )}
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
                      disabled={!challengeAvailable}
                      onClick={() => setChoosingChallenge(true)}
                    >
                      <Swords size={17} />
                      Dùng Thách đố
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
              <div className="guideTargetList">
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
                          <b>{team.name} giơ nhanh nhất</b>
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
                        ? "Sang câu tiếp theo"
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
                  {game.round === 3
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

          {game.notice && game.phase === "question" && (
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
              <span>Trận đang được lưu tự động trên máy này.</span>
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

      {dialog === "questions" && (
        <Modal
          title="Chọn câu hỏi cho lượt này"
          description="Các câu đã chơi sẽ không được chọn lại. Độ khó quyết định điểm và thời gian."
          onClose={() => setDialog(null)}
        >
          <div className="guideQuestionList">
            {roundQuestions.map((item) => {
              const used = game.playedQuestionIds?.includes(item.id),
                selected = q?.id === item.id,
                d = DIFFICULTY[item.difficulty];
              return (
                <button
                  key={item.id}
                  disabled={used}
                  className={selected ? "selected" : ""}
                  onClick={() => {
                    commit((g) => chooseQuestion(g, item.id));
                    setDialog(null);
                  }}
                >
                  <span>
                    {d.label} · {d.points} điểm · {d.seconds} giây
                    {used ? " · Đã chơi" : ""}
                  </span>
                  <b>{item.text}</b>
                  {selected && <Check size={16} />}
                </button>
              );
            })}
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
                      <dt>{card.name}</dt>
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
      <p>{text}</p>
    </div>
  );
}
function Answer({ text }: { text: string }) {
  return (
    <div className="guideAnswer">
      <span>
        <Shield size={14} />
        ĐÁP ÁN · CHỈ BẠN THẤY
      </span>
      <p>{text}</p>
    </div>
  );
}
function GuideClock({
  seconds,
  paused,
  onToggle,
}: {
  seconds: number;
  paused: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`guideClock ${seconds === 0 ? "timeUp" : ""}`}>
      <span>
        <Clock size={17} />
        {formatTime(seconds)}
      </span>
      <button disabled={seconds === 0} onClick={onToggle}>
        {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
        {paused ? "Tiếp tục" : "Tạm dừng"}
      </button>
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
      {!entries.length && (
        <p>Điểm đã được cập nhật trên bảng điểm phía trên.</p>
      )}
    </div>
  );
}
function SimpleRanking({ game }: { game: Game }) {
  const ranks = rankTeams(game.teams);
  if (game.suddenWinner !== null)
    ranks.sort(
      (a, b) =>
        Number(b.index === game.suddenWinner) -
        Number(a.index === game.suddenWinner),
    );
  return (
    <div className="simpleRanking">
      {ranks.map(({ team, index }, i) => (
        <div key={index} style={teamStyle(index)}>
          <span>{i + 1}</span>
          <b>
            <i />
            {team.name}
          </b>
          <small>{remainingCards(team)} thẻ còn lại</small>
          <strong>{team.score} điểm</strong>
        </div>
      ))}
    </div>
  );
}
function SimpleHistory({ game }: { game: Game }) {
  return (
    <div className="simpleHistory">
      <h1>Lịch sử điểm</h1>
      <p>Những lần bạn đã chấm đúng hoặc sai trong trận này.</p>
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
