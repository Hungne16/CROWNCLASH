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
import { DIFFICULTY, type Game, type Question, type Settings } from "./game";
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
  const index = id ? questions.findIndex((q) => q.id === id) : -1;
  return { ...g, questions, questionIndex: index < 0 ? null : index };
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
      new Blob([JSON.stringify(game.questions, null, 2)], {
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
      const questions = validateQuestions(JSON.parse(await selected.text()));
      commit((g) => replaceQuestions(g, questions));
      notify(`Đã nhập ${questions.length} câu hỏi.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Không đọc được file JSON.");
    }
    if (file.current) file.current.value = "";
  };
  return (
    <div className="managePage">
      {!cloudMode && (
        <div className="localBankNotice">
          <Cloud size={19} />
          <div>
            <b>Lưu trên máy này</b>

          </div>
          <a href="/account">
            Tài khoản admin <ArrowRight size={14} />
          </a>
        </div>
      )}
      <div className="pageTitle">
        <div>
          <h1>Ngân hàng câu hỏi</h1>

        </div>
        <div className="buttonRow">
          <button className="btn secondary" onClick={exportFile}>
            <Download size={16} />
            Xuất JSON
          </button>
          <button
            className="btn secondary"
            disabled={live}
            title={
              live ? "Kết thúc câu hiện tại trước khi thay bộ câu hỏi." : ""
            }
            onClick={() => file.current?.click()}
          >
            <Upload size={16} />
            Nhập JSON
          </button>
          <button
            className="btn primary"
            onClick={() =>
              setDraft({
                id: crypto.randomUUID(),
                round: (round || game.round) as 1 | 2 | 3,
                difficulty: "easy",
                hint: "",
                text: "",
                answer: "",
              })
            }
          >
            <Plus size={17} />
            Thêm câu hỏi
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
            Bộ câu hỏi có dữ liệu <b>DEMO</b>. Thay bằng nội dung chính thức
            trước khi thi đấu.
          </span>
        </div>
      )}
      <div className="bankToolbar">
        <div className="segments">
          {[0, 1, 2, 3].map((n) => (
            <button
              className={round === n ? "selected" : ""}
              key={n}
              onClick={() => setRound(n)}
            >
              {n === 0 ? "Tất cả" : `Vòng ${n}`}
              <span>
                {game.questions.filter((q) => n === 0 || q.round === n).length}
              </span>
            </button>
          ))}
        </div>
        <label className="searchField">
          <Search size={16} />
          <input
            placeholder="Tìm nội dung, gợi ý, đáp án…"
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
                    Vòng {q.round} · {DIFFICULTY[q.difficulty].points} điểm ·{" "}
                    {DIFFICULTY[q.difficulty].seconds}s
                  </span>
                  {q.id.startsWith("demo") && (
                    <span className="demoTag">DEMO</span>
                  )}
                  {active && <span className="statusTag">Đang dùng</span>}
                  {played && (
                    <span className="muted small">
                      <Check size={12} /> Đã chơi
                    </span>
                  )}
                </div>
                <h3>{q.text}</h3>
                <p>Gợi ý: {q.hint || "—"}</p>
                <div className="bankAnswer">Đáp án: {q.answer}</div>
              </div>
              <div className="buttonRow">
                <button
                  className="iconBtn"
                  disabled={active}
                  onClick={() => setDraft({ ...q })}
                  aria-label="Sửa câu hỏi"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="iconBtn dangerText"
                  disabled={active}
                  onClick={() => setDeleteId(q.id)}
                  aria-label="Xóa câu hỏi"
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
                ? "Chưa có câu hỏi phù hợp"
                : "Bộ câu hỏi đang trống"}
            </h3>
            <p>
              {game.questions.length
                ? "Thêm câu hỏi hoặc chọn bộ lọc khác."
                : "Bấm “Thêm câu hỏi” để admin tự soạn, hoặc “Nhập JSON” để tải bộ đề của mình."}
            </p>
          </div>
        )}
      </div>
      {draft && (
        <Modal
          title={
            game.questions.some((q) => q.id === draft.id)
              ? "Chỉnh sửa câu hỏi"
              : "Thêm câu hỏi"
          }
          description="Gợi ý được trình chiếu trước câu hỏi. Đáp án chỉ công bố theo thao tác của MC."
          wide
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !draft.hint.trim() ||
                !draft.text.trim() ||
                !draft.answer.trim()
              ) {
                notify(
                  "Gợi ý, câu hỏi và đáp án đều cần được soạn trước khi chơi.",
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
              notify("Đã lưu câu hỏi.");
            }}
          >
            <div className="formColumns">
              <label>
                Vòng thi
                <select
                  value={draft.round}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      round: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  {[1, 2, 3].map((n) => (
                    <option value={n} key={n}>
                      Vòng {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Độ khó
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
                      {d.label} · {d.points} điểm · {d.seconds} giây
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              1. Gợi ý trước khi chọn thẻ
              <textarea
                required
                value={draft.hint}
                onChange={(e) => setDraft({ ...draft, hint: e.target.value })}
                placeholder="Nhập gợi ý, không kèm đáp án."
              />

            </label>
            <label>
              2. Câu hỏi
              <textarea
                required
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="Nhập đầy đủ nội dung câu hỏi…"
                rows={4}
              />
            </label>
            <label>
              3. Đáp án (MC)
              <textarea
                required
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                placeholder="Đáp án và cách chấp nhận câu trả lời…"
              />
            </label>
            <label>
              URL hình ảnh <span className="muted">· Không bắt buộc</span>
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
                Hủy
              </button>
              <button className="btn primary" type="submit">
                <Save size={16} />
                Lưu câu hỏi
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteId && (
        <Modal
          title="Xóa câu hỏi này?"
          description={
            cloudMode
              ? "Câu hỏi sẽ được gỡ và thay đổi sẽ tự động lưu vào bộ đề của tài khoản."
              : "Câu hỏi sẽ được gỡ khỏi bộ đề. Có thể hoàn tác sau khi xóa."
          }
          onClose={() => setDeleteId(null)}
        >
          <div className="modalFooter">
            <button className="btn secondary" onClick={() => setDeleteId(null)}>
              Giữ lại
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
              Xóa câu hỏi
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
          <h1>Đội thi & quy ước</h1>

        </div>
        <Settings2 className="pageDecoration" size={34} />
      </div>
      <section className="surface settingsTeams">
        <div className="sectionHeading">
          <div>
            <h2>Bốn đội tham gia</h2>

          </div>
        </div>
        <div className="teamNameGrid">
          {game.teams.map((team, i) => (
            <label key={i} style={teamStyle(i)}>
              <span className="teamLabel">
                <i />
                Đội {i + 1}
              </span>
              <input
                key={team.name}
                defaultValue={team.name}
                maxLength={35}
                onBlur={(e) => {
                  const name = e.target.value.trim() || `Đội ${i + 1}`;
                  if (name !== team.name)
                    commit((g) => ({
                      ...g,
                      teams: g.teams.map((t, j) =>
                        j === i ? { ...t, name } : t,
                      ),
                    }));
                }}
                aria-label={`Tên đội ${i + 1}`}
              />
            </label>
          ))}
        </div>
      </section>
      <div className="settingsColumns">
        <section className="surface">
          <div className="sectionHeading">
            <div>
              <h2>Năm quy ước bổ sung</h2>

            </div>
            <span className="demoTag">MC CẦN THỐNG NHẤT</span>
          </div>
          {locked && (
            <div className="infoBanner compact">
              <Info size={16} />
              Hoàn tất câu đang chơi để thay đổi quy ước.
            </div>
          )}
          <Setting
            number="01"
            title="Phân đội chủ nhà"
            description="MC có thể đổi đội ngay ở bước chuẩn bị của mỗi câu."
          >
            <select
              disabled={locked}
              value={game.settings.hostMode}
              onChange={(e) =>
                patch("hostMode", e.target.value as Settings["hostMode"])
              }
            >
              <option value="manual">MC chọn thủ công</option>
              <option value="rotate">Luân phiên theo câu đã chơi</option>
              <option value="random">Bốc thăm ngẫu nhiên</option>
            </select>
          </Setting>
          <Setting
            number="02"
            title="Đội bị Challenge trả lời đúng"
            description="Thẻ Double / Safe đã đặt luôn bị cháy khi tung Challenge."
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
              <option value="end">Kết thúc câu hỏi</option>
              <option value="host">Chủ nhà tiếp tục, tính điểm gốc</option>
            </select>
          </Setting>
          <Setting
            number="03"
            title="Thời gian nhận Steal"
            description="Hết thời gian, hệ thống xử lý theo quy ước bên dưới."
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
              <span>giây</span>
            </div>
          </Setting>
          <Setting
            number="04"
            title="Không có đội nhận Steal"
            description="Áp dụng cả khi hết giờ hoặc MC đóng cửa Steal sớm."
          >
            <select
              disabled={locked}
              value={game.settings.noSteal}
              onChange={(e) =>
                patch("noSteal", e.target.value as Settings["noSteal"])
              }
            >
              <option value="end">Kết thúc câu hỏi</option>
              <option value="host">Cho chủ nhà trả lời lại</option>
            </select>
          </Setting>
          <Setting
            number="05"
            title="Sudden Death với hơn hai đội"
            description={
              game.settings.multiTie === "bracket"
                ? "Hai đội đầu đối đầu; đội thắng gặp đội tiếp theo cho đến khi còn một đội."
                : "Các đội cùng tranh chuông. Sai bị loại khỏi lượt; đúng thắng. Khi còn hai đội, một đội sai thì đội kia thắng."
            }
          >
            <select
              disabled={locked}
              value={game.settings.multiTie}
              onChange={(e) =>
                patch("multiTie", e.target.value as Settings["multiTie"])
              }
            >
              <option value="bracket">Đối đầu lần lượt</option>
              <option value="shared">Câu hỏi chung, tranh chuông</option>
            </select>
          </Setting>
        </section>
        <section className="surface ruleReference">
          <div className="sectionHeading">
            <div>
              <h2>Luật cố định</h2>

            </div>
          </div>
          <div className="difficultyTable">
            {Object.entries(DIFFICULTY).map(([key, d]) => (
              <div key={key}>
                <span className={`difficulty ${key}`}>{d.label}</span>
                <b>{d.points} điểm</b>
                <span>{d.seconds}s</span>
                <small>Challenge {d.challenge}s đầu</small>
              </div>
            ))}
          </div>
          <ul>
            <li>Điểm âm được phép.</li>
            <li>Double và Safe chỉ dùng sau gợi ý, trước câu hỏi.</li>
            <li>Challenge làm cháy thẻ Double / Safe đã đặt.</li>
            <li>Challenge và Steal luôn tính điểm gốc.</li>
            <li>Challenge sai: kết thúc ngay, không Steal.</li>
            <li>Mỗi câu chỉ có tối đa một lượt Steal.</li>
            <li>Hết giờ: MC quyết định kết quả, không tự chấm sai.</li>
          </ul>
          <div className="ruleFoot">
            <b>Xếp hạng cuối trận</b>
            <p>Tổng điểm → số thẻ còn lại → Sudden Death.</p>
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
