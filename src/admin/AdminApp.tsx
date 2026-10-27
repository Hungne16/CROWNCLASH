import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Gamepad2,
  Info,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Modal } from "../Common";
import { QuestionBank, GameSettings } from "../Manage";
import type { Game } from "../game";
import { loadGame } from "../controller";
import { accountError, authConfigurationError, firebaseAuth } from "./firebase";
import { signOut, signInWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset } from "firebase/auth";
import { useAdminSession } from "./useAdminSession";
import { usePreparation } from "./usePreparation";
import {
  fromPreparationGame,
  installPreparation,
  preparationGame,
} from "./preparation";
import "./admin.css";

export default function AdminApp({
  recoveryLink = false,
}: {
  recoveryLink?: boolean;
}) {
  const auth = useAdminSession(recoveryLink),
    [mode, setMode] = useState<"login" | "forgot">(
      recoveryLink || location.pathname === "/account/reset-password"
        ? "forgot"
        : "login",
    );
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const logout = async () => {
    setBusy(true);
    try {
      await signOut(firebaseAuth!);
      auth.setRecovery(false);
      setPassword("");
      setConfirmation("");
      return true;
    } catch (e) {
      setError(accountError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (
    auth.session &&
    auth.membership?.user_id === auth.session.user.id &&
    !auth.recovery
  )
    return (
      <CloudWorkspace
        key={auth.session.user.id}
        ownerId={auth.session.user.id}
        email={auth.session.user.email ?? ""}
        name={auth.membership.display_name}
        onLogout={logout}
      />
    );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuth) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (auth.recovery) {
        if (password.length < 10)
          throw new Error("Mật khẩu cần ít nhất 10 ký tự.");
        if (password !== confirmation)
          throw new Error("Hai mật khẩu chưa trùng nhau.");
        const code = new URLSearchParams(location.search).get("oobCode");
        if (!code) throw new Error("Liên kết đặt mật khẩu không hợp lệ. Hãy yêu cầu gửi lại.");
        await confirmPasswordReset(firebaseAuth, code, password);
        setMode("login");
        setPassword("");
        setConfirmation("");
        auth.setRecovery(false);
        history.replaceState(null, "", "/account");
        setMessage("Đã đặt mật khẩu mới.");
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(firebaseAuth, email.trim(), {url: `${location.origin}/account`});
        setMessage(
          "Nếu email này thuộc tài khoản đã được cấp, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
        );
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        setPassword("");
      }
    } catch (e) {
      setError(accountError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="guidedApp adminApp">
      <header className="accountHeader">
        <a className="guideBrand" href="/">
          <span>
            <Gamepad2 size={24} />
          </span>
          <b>
            CROWNCLASH<small>Không gian chuẩn bị của admin</small>
          </b>
        </a>
        <a className="guideOutline" href="/">
          <ArrowLeft size={16} />
          Về trò chơi
        </a>
      </header>
      <main className="accountEntry">
        <div className="accountIntro">
          <span className="accountIcon">
            <Cloud size={28} />
          </span>
          <h1>
            Soạn ở nhà.
            <br />
            Sẵn sàng tại sự kiện.
          </h1>
          <p>
            Đăng nhập để lưu bộ câu hỏi, tên đội và quy ước. Trên máy tổ chức,
            mở lại cùng tài khoản rồi dùng bộ đề đã chuẩn bị.
          </p>
          <div>
            <ShieldCheck size={18} />
            <span>Mỗi admin có bộ đề riêng.</span>
          </div>
          <div>
            <Check size={18} />
            <span>Tự động lưu khi có kết nối mạng.</span>
          </div>
          <div>
            <Gamepad2 size={18} />
            <span>Tải bộ đề về máy để điều hành trận đấu.</span>
          </div>
        </div>
        <section className="accountCard">
          {!firebaseAuth ? (
            <>
              <div className="accountCardIcon">
                <CloudOff size={24} />
              </div>
              <h2>Tài khoản chưa được bật</h2>
              <p>{authConfigurationError}</p>
              <div className="accountNotice">
                Chủ website cần kết nối cấu hình Firebase, bật đăng nhập Email/Password
                và thiết lập Firestore. Sau đó có thể cấp tài khoản cho từng admin.
              </div>
              <a className="guidePrimary full" href="/">
                Tiếp tục dùng trên máy này <ArrowRight size={17} />
              </a>
            </>
          ) : auth.loading || auth.checking ? (
            <div className="accountLoading">
              <LoaderCircle className="spinning" size={26} />
              <p>Đang kiểm tra tài khoản…</p>
            </div>
          ) : auth.session && !auth.membership && !auth.recovery ? (
            <>
              <h2>Chưa được cấp quyền admin</h2>
              <p>
                {error ||
                  auth.error ||
                  "Tài khoản đã đăng nhập nhưng chưa được chủ website cấp quyền soạn bộ đề."}
              </p>
              <p className="accountEmail">{auth.session.user.email}</p>
              <button
                className="guideOutline full"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <div className="accountCardIcon">
                <LockKeyhole size={23} />
              </div>
              <h2>
                {auth.recovery
                  ? "Đặt mật khẩu mới"
                  : mode === "forgot"
                    ? "Quên mật khẩu?"
                    : "Đăng nhập admin"}
              </h2>
              <p>
                {auth.recovery
                  ? "Đặt mật khẩu để đăng nhập tài khoản trên các thiết bị của bạn."
                  : mode === "forgot"
                    ? "Nhập email đã được cấp tài khoản."
                    : "Sử dụng email và mật khẩu được chủ website cấp."}
              </p>
              {(error || auth.error) && (
                <div className="accountError" role="alert">
                  {error || auth.error}
                </div>
              )}
              {message && (
                <div className="accountSuccess" role="status">
                  {message}
                </div>
              )}
              <form onSubmit={submit}>
                {!(auth.recovery) && (
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </label>
                )}
                {(mode === "login" || (auth.recovery)) && (
                  <label>
                    {auth.recovery
                      ? "Mật khẩu mới"
                      : "Mật khẩu"}
                    <input
                      type="password"
                      required
                      minLength={auth.recovery ? 10 : 1}
                      autoComplete={
                        auth.recovery
                          ? "new-password"
                          : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                )}
                {auth.recovery && (
                  <label>
                    Nhập lại mật khẩu mới
                    <input
                      type="password"
                      required
                      minLength={10}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                )}
                <button
                  className="guidePrimary full"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={17} className="spinning" />
                      Đang xử lý…
                    </>
                  ) : auth.recovery ? (
                    "Lưu mật khẩu mới"
                  ) : mode === "forgot" ? (
                    <>
                      <Mail size={17} />
                      Gửi hướng dẫn đặt lại
                    </>
                  ) : (
                    <>
                      Đăng nhập <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
              {!(auth.recovery) && (
                <button
                  className="accountSwitch"
                  onClick={() => {
                    setMode((v) => (v === "login" ? "forgot" : "login"));
                    setError("");
                    setMessage("");
                  }}
                >
                  {mode === "login" ? "Quên mật khẩu?" : "Quay lại đăng nhập"}
                </button>
              )}
              <div className="accountFootnote">
                Tài khoản do chủ website cấp. Người chơi không cần đăng nhập để
                xem màn hình trình chiếu.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function CloudWorkspace({
  ownerId,
  email,
  name,
  onLogout,
}: {
  ownerId: string;
  email: string;
  name: string;
  onLogout: () => Promise<boolean>;
}) {
  const cloud = usePreparation(ownerId),
    [tab, setTab] = useState<"questions" | "settings">("questions");
  const [dialog, setDialog] = useState<
      "start" | "logout" | "remote" | "local" | "import-local" | null
    >(null),
    [toast, setToast] = useState(""),
    [actionBusy, setActionBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const commit = (fn: (g: Game) => Game) => {
    if (!cloud.draft) return;
    try {
      const payload = fromPreparationGame(fn(preparationGame(cloud.draft)));
      cloud.edit(() => payload);
    } catch (e) {
      notify(accountError(e));
    }
  };
  const beginMatch = () => {
    if (!cloud.draft) return;
    try {
      installPreparation(cloud.draft);
      location.assign("/");
    } catch (e) {
      notify(accountError(e));
      setDialog(null);
    }
  };
  const signOut = async () => {
    setActionBusy(true);
    const ok = await onLogout();
    setActionBusy(false);
    if (ok) setDialog(null);
    else notify("Chưa đăng xuất được. Kiểm tra mạng rồi thử lại.");
  };
  const savedLabel =
    cloud.status === "loading"
      ? "Đang tải bộ đề…"
      : cloud.status === "saving"
        ? "Đang lưu lên tài khoản…"
        : cloud.status === "unsaved"
          ? "Đang chờ lưu…"
          : cloud.status === "conflict"
            ? "Cần chọn phiên bản"
            : cloud.status === "error"
              ? "Chưa lưu được lên tài khoản"
              : cloud.savedAt
                ? `Đã lưu lúc ${new Date(cloud.savedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                : "Chưa có thay đổi";
  return (
    <div className="guidedApp adminApp">
      <header className="accountHeader">
        <a className="guideBrand" href="/">
          <span>
            <Gamepad2 size={24} />
          </span>
          <b>
            CROWNCLASH<small>Chuẩn bị trước sự kiện</small>
          </b>
        </a>
        <div className="accountHeaderRight">
          <span>
            <UserRound size={16} />
            {name || email}
          </span>
          <button
            className="guideTextButton"
            disabled={actionBusy}
            onClick={() =>
              cloud.dirty || cloud.status === "saving"
                ? setDialog("logout")
                : void signOut()
            }
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="cloudWorkspace">
        <div className="cloudHeading">
          <div>
            <span className="eyebrow">BỘ ĐỀ RIÊNG CỦA BẠN</span>
            <h1>Chuẩn bị sẵn cho ngày chơi.</h1>
            <p>Soạn ở đây để mở lại trên máy khác bằng cùng tài khoản.</p>
          </div>
          <button
            className="guidePrimary"
            disabled={
              !cloud.draft?.questions.length ||
              cloud.status !== "saved" ||
              cloud.dirty
            }
            onClick={() => setDialog("start")}
          >
            Dùng bộ đề để tổ chức <ArrowRight size={17} />
          </button>
        </div>
        <div className="cloudToolbar">
          <nav>
            <button
              className={tab === "questions" ? "selected" : ""}
              onClick={() => setTab("questions")}
            >
              1. Bộ câu hỏi
            </button>
            <button
              className={tab === "settings" ? "selected" : ""}
              onClick={() => setTab("settings")}
            >
              2. Đội & quy ước
            </button>
          </nav>
          <span className={`cloudSaveState ${cloud.status}`} role="status">
            {["loading", "saving", "unsaved"].includes(cloud.status) ? (
              <LoaderCircle className="spinning" size={15} />
            ) : cloud.status === "saved" ? (
              <Check size={15} />
            ) : (
              <CloudOff size={15} />
            )}{" "}
            {savedLabel}
          </span>
        </div>
        {cloud.error && (
          <div className="cloudProblem" role="alert">
            <Info size={18} />
            <div>
              <b>
                {cloud.status === "conflict"
                  ? "Bộ đề có thay đổi trên máy khác"
                  : cloud.error}
              </b>
              {cloud.status === "conflict" ? (
                <>
                  <p>
                    Bản bạn đang soạn vẫn được giữ trên máy. Chọn bản trên tài
                    khoản hoặc xác nhận dùng bản đang soạn.
                  </p>
                  <div className="buttonRow">
                    <button
                      className="guideOutline"
                      onClick={() => setDialog("remote")}
                    >
                      Dùng bản trên tài khoản
                    </button>
                    <button
                      className="guideOutline"
                      onClick={() => setDialog("local")}
                    >
                      Giữ bản đang soạn
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Nội dung hiện tại vẫn có bản nháp trên máy này. Chỉ trạng
                    thái “Đã lưu” mới xác nhận dữ liệu đã lên tài khoản.
                  </p>
                  <button
                    className="guideOutline"
                    onClick={() => void cloud.reload()}
                  >
                    <RefreshCw size={15} />
                    Kết nối và thử lại
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {cloud.draft &&
          cloud.draft.questions.length === 0 &&
          cloud.status === "saved" &&
          loadGame().questions.length > 0 && (
            <div className="localBankNotice">
              <Cloud size={18} />
              <div>
                <b>Máy này đang có một bộ câu hỏi.</b>
                <p>
                  Bạn có thể chép bộ đề đang lưu trên máy vào tài khoản để dùng
                  trên thiết bị khác.
                </p>
              </div>
              <button
                className="guideOutline"
                onClick={() => setDialog("import-local")}
              >
                Chuyển vào tài khoản
              </button>
            </div>
          )}
        {cloud.status === "loading" ? (
          <div className="cloudLoading">
            <LoaderCircle size={28} className="spinning" />
            <h2>Đang lấy bộ đề của tài khoản…</h2>
          </div>
        ) : (
          cloud.draft && (
            <div className="cloudEditor">
              {tab === "questions" ? (
                <QuestionBank
                  game={preparationGame(cloud.draft)}
                  commit={commit}
                  notify={notify}
                  cloudMode
                />
              ) : (
                <GameSettings
                  game={preparationGame(cloud.draft)}
                  commit={commit}
                  notify={notify}
                  cloudMode
                />
              )}
            </div>
          )
        )}
      </main>
      {dialog === "import-local" && (
        <Modal
          title="Chuyển bộ đề trên máy vào tài khoản?"
          description="Câu hỏi, tên đội và quy ước trên máy này sẽ được chép vào bộ đề của tài khoản và tự động lưu lên máy chủ."
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Hủy
            </button>
            <button
              className="guidePrimary"
              onClick={() => {
                try {
                  const payload = fromPreparationGame(loadGame());
                  cloud.edit(() => payload);
                  setDialog(null);
                } catch (e) {
                  notify(accountError(e));
                }
              }}
            >
              Chuyển bộ đề
            </button>
          </div>
        </Modal>
      )}
      {dialog === "start" && (
        <Modal
          title="Tổ chức với bộ đề này?"
          description={`Sử dụng ${cloud.draft?.questions.length ?? 0} câu hỏi, tên đội và quy ước đã chuẩn bị. Điểm, thẻ và lịch sử trên máy này sẽ bắt đầu một trận mới. Bạn có thể hoàn tác ở bàn điều khiển.`}
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Chưa bắt đầu
            </button>
            <button className="guidePrimary" onClick={beginMatch}>
              Bắt đầu trận trên máy này <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "logout" && (
        <Modal
          title="Bản mới chưa được lưu xong"
          description="Nội dung đang soạn vẫn có bản nháp trên trình duyệt này. Máy khác sẽ chỉ thấy phiên bản đã lưu thành công lên tài khoản."
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guidePrimary" onClick={() => setDialog(null)}>
              Ở lại để lưu
            </button>
            <button
              className="guideOutline"
              disabled={actionBusy}
              onClick={() => void signOut()}
            >
              Đăng xuất
            </button>
          </div>
        </Modal>
      )}
      {(dialog === "remote" || dialog === "local") && (
        <Modal
          title={
            dialog === "remote"
              ? "Dùng bản trên tài khoản?"
              : "Lưu bản đang soạn thay cho bản trên tài khoản?"
          }
          description={
            dialog === "remote"
              ? "Những thay đổi chưa lưu trên máy này sẽ được thay bằng bản đã lưu trên tài khoản."
              : "Bản đang soạn trên máy này sẽ được lưu lên tài khoản, thay cho phiên bản đang có. Nếu máy khác tiếp tục thay đổi, hệ thống sẽ yêu cầu chọn lại."
          }
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Hủy
            </button>
            <button
              className="guidePrimary"
              onClick={() => {
                cloud.resolve(dialog === "remote" ? "remote" : "local");
                setDialog(null);
              }}
            >
              Xác nhận dùng bản này
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="guideToast" role="status">
          <Info size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
