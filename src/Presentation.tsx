import { Expand, Gamepad2, Check, Pause, Medal, Zap } from "lucide-react";
import { DIFFICULTY, rankTeams, remainingCards, type Game } from "./game";
import { currentQuestion, questionTime, tiedLeaders } from "./controller";
import { Cards, formatTime, teamStyle } from "./Common";
export function Presentation({
  game,
  now,
  onBuzz,
}: {
  game: Game;
  now: number;
  onBuzz: (index: number) => void;
}) {
  const q = currentQuestion(game),
    time = questionTime(game, now),
    ranks = rankTeams(game.teams);
  const response = ["challenge", "steal-answer"].includes(game.phase)
    ? game.answering
    : game.host;
  const winner =
    game.suddenWinner ??
    (tiedLeaders(game).length === 1 ? ranks[0].index : null);
  const isQuestion =
    q &&
    !["setup", "round-summary", "finished", "sudden-death"].includes(
      game.phase,
    );
  return (
    <main className="presentation">
      <header className="presentationHeader">
        <div className="brand">
          <span className="brandMark">
            <Gamepad2 size={24} />
          </span>
          <b>
            ĐẤU TRÍ<span>KIẾN THỨC & CHIẾN THUẬT</span>
          </b>
        </div>
        <span className="presentationRound">
          VÒNG {game.round}
          <i>/ 03</i>
        </span>
        <button
          className="iconBtn"
          title="Toàn màn hình"
          onClick={() =>
            document.fullscreenElement
              ? document.exitFullscreen()
              : document.documentElement.requestFullscreen()
          }
        >
          <Expand size={20} />
        </button>
      </header>
      <section className="presentationStage">
        {isQuestion && (
          <>
            <div className="presentationKicker">
              <span className={`difficulty ${q.difficulty}`}>
                {DIFFICULTY[q.difficulty].label}
              </span>
              <span>{DIFFICULTY[q.difficulty].points} ĐIỂM</span>
              <i />
              {game.phase === "hint"
                ? "GỢI Ý"
                : game.phase === "steal-window"
                  ? "CƠ HỘI STEAL"
                  : game.phase === "result"
                    ? "KẾT QUẢ CÂU HỎI"
                    : "CÂU HỎI"}
            </div>
            <h1>
              {game.phase === "hint"
                ? q.hint || "Lắng nghe gợi ý từ MC."
                : q.text}
            </h1>
            {q.image && game.phase !== "hint" && (
              <img
                className="audienceImage"
                src={q.image}
                alt="Hình minh họa câu hỏi"
              />
            )}
            {game.phase === "question" && (
              <div
                className={`audienceTimer ${time.seconds <= 5 ? "urgent" : ""}`}
              >
                <span>{formatTime(time.seconds)}</span>
                {game.paused && (
                  <small>
                    <Pause size={14} />
                    TẠM DỪNG
                  </small>
                )}
                {time.seconds === 0 && <small>HẾT GIỜ · CHỜ MC XÁC NHẬN</small>}
              </div>
            )}
            {game.phase === "steal-window" && (
              <div className="audienceSteal">
                GIƠ THẺ STEAL{" "}
                <strong>
                  {Math.max(
                    0,
                    Math.ceil(((game.stealDeadline ?? now) - now) / 1000),
                  )}
                  s
                </strong>
              </div>
            )}
            {game.answerRevealed && (
              <div className="audienceAnswer">
                <Check size={21} />
                {q.answer}
              </div>
            )}
            {response !== null && game.phase !== "result" && (
              <div className="audienceTurn" style={teamStyle(response)}>
                <i />
                {game.teams[response].name}
                <small>
                  {game.phase === "challenge"
                    ? "BỊ CHALLENGE"
                    : game.phase === "steal-answer"
                      ? "GIÀNH QUYỀN STEAL"
                      : "ĐỘI CHỦ NHÀ"}
                </small>
              </div>
            )}
            {game.usedCard && (
              <div className="audiencePower">
                {game.usedCard === "double"
                  ? "⚡ DOUBLE HIGH RISK · CƯỢC LỚN"
                  : "◇ SAFE CHOICE · AN TOÀN"}
              </div>
            )}
          </>
        )}
        {game.phase === "setup" && (
          <div className="audienceWaiting">
            <span className="eyebrow">VÒNG {game.round} · SẴN SÀNG</span>
            <h1>
              Kiến thức là lợi thế.
              <br />
              Chiến thuật tạo khác biệt.
            </h1>
            <p>Chờ quản trò bắt đầu câu hỏi tiếp theo.</p>
          </div>
        )}
        {game.phase === "round-summary" && (
          <div className="audienceWaiting">
            <Medal size={56} />
            <span className="eyebrow">KẾT THÚC VÒNG {game.round}</span>
            <h1>Cuộc đua vẫn tiếp diễn.</h1>
            <p>Điểm và thẻ được giữ nguyên cho vòng tiếp theo.</p>
          </div>
        )}
        {game.phase === "sudden-death" && (
          <div className="audienceSudden">
            <span className="eyebrow">SUDDEN DEATH · KHÔNG DÙNG THẺ</span>
            <h1>{game.suddenQuestion || "Câu hỏi quyết định"}</h1>
            <p>
              {game.answering === null
                ? "Chạm vào tên đội để giành quyền trả lời."
                : `${game.teams[game.answering].name} đã giành quyền trả lời.`}
            </p>
            <div className="audienceBuzzers">
              {game.suddenTeams.map((i) => (
                <button
                  style={teamStyle(i)}
                  className={game.answering === i ? "buzzed" : ""}
                  key={i}
                  disabled={game.answering !== null}
                  onClick={() => onBuzz(i)}
                >
                  <Zap size={24} />
                  <b>{game.teams[i].name}</b>
                  <small>
                    {game.answering === i ? "ĐÃ GIÀNH CHUÔNG" : "BẤM CHUÔNG"}
                  </small>
                </button>
              ))}
            </div>
          </div>
        )}
        {game.phase === "finished" && (
          <div className="audienceChampion">
            <Medal size={68} />
            <span className="eyebrow">
              {winner === null
                ? "CÁC ĐỘI ĐỒNG HẠNG · CHỜ SUDDEN DEATH"
                : "NHÀ VÔ ĐỊCH"}
            </span>
            <h1>
              {winner === null
                ? tiedLeaders(game)
                    .map((i) => game.teams[i].name)
                    .join(" · ")
                : game.teams[winner].name}
            </h1>
            {winner !== null && (
              <p>
                {game.teams[winner].score} điểm ·{" "}
                {remainingCards(game.teams[winner])} thẻ còn lại
              </p>
            )}
          </div>
        )}
      </section>
      <div className="audienceScoreboard">
        {game.teams.map((team, i) => (
          <div
            key={i}
            style={teamStyle(i)}
            className={`audienceTeam ${response === i && isQuestion ? "responding" : ""}`}
          >
            <div>
              <span className="colorDot" />
              <b>{team.name}</b>
              {response === i && isQuestion && <small>ĐANG CHƠI</small>}
            </div>
            <strong>{team.score}</strong>
            <Cards cards={team.cards} />
          </div>
        ))}
      </div>
      <footer className="presentationFooter">
        ĐẤU TRÍ <i /> 4 ĐỘI · 3 VÒNG · MỘT NHÀ VÔ ĐỊCH
      </footer>
    </main>
  );
}
