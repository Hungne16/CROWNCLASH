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
          throw new Error("Use at least 10 characters for your password.");
        if (password !== confirmation)
          throw new Error("The passwords do not match.");
        const code = new URLSearchParams(location.search).get("oobCode");
        if (!code) throw new Error("Invalid password reset link. Request a new one.");
        await confirmPasswordReset(firebaseAuth, code, password);
        setMode("login");
        setPassword("");
        setConfirmation("");
        auth.setRecovery(false);
        history.replaceState(null, "", "/account");
        setMessage("New password saved.");
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(firebaseAuth, email.trim(), {url: `${location.origin}/account`});
        setMessage(
          "If this email is registered, you will receive password reset instructions.",
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
            CROWNCLASH
          </b>
        </a>
        <a className="guideOutline" href="/">
          <ArrowLeft size={16} />
          Back to Game
        </a>
      </header>
      <main className="accountEntry">
        <div className="accountIntro">
          <span className="accountIcon">
            <Cloud size={28} />
          </span>
          <h1>Your Questions</h1>
          <p>Sign in to sync your questions.</p>
        </div>
        <section className="accountCard">
          {!firebaseAuth ? (
            <>
              <div className="accountCardIcon">
                <CloudOff size={24} />
              </div>
              <h2>Accounts Are Unavailable</h2>
              <p>{authConfigurationError}</p>
              <div className="accountNotice">
                The site owner needs to configure Firebase, enable Email/Password sign-in, and set up Firestore before creating admin accounts.
              </div>
              <a className="guidePrimary full" href="/">
                Continue on This Device <ArrowRight size={17} />
              </a>
            </>
          ) : auth.loading || auth.checking ? (
            <div className="accountLoading">
              <LoaderCircle className="spinning" size={26} />
              <p>Checking your account…</p>
            </div>
          ) : auth.session && !auth.membership && !auth.recovery ? (
            <>
              <h2>Admin Access Required</h2>
              <p>
                {error ||
                  auth.error ||
                  "Ask the site owner for permission to edit question sets."}
              </p>
              <p className="accountEmail">{auth.session.user.email}</p>
              <button
                className="guideOutline full"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <div className="accountCardIcon">
                <LockKeyhole size={23} />
              </div>
              <h2>
                {auth.recovery
                  ? "Set a New Password"
                  : mode === "forgot"
                    ? "Forgot Password?"
                    : "Admin Sign-In"}
              </h2>
              {(auth.recovery || mode === "forgot") && <p>
                {auth.recovery
                  ? "Set a password to sign in on your devices."
                  : mode === "forgot"
                    ? "Enter the email associated with your account."
                    : ""}
              </p>}
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
                      ? "New Password"
                      : "Password"}
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
                    Confirm New Password
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
                      Working…
                    </>
                  ) : auth.recovery ? (
                    "Save New Password"
                  ) : mode === "forgot" ? (
                    <>
                      <Mail size={17} />
                      Send Reset Instructions
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight size={17} />
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
                  {mode === "login" ? "Forgot Password?" : "Back to Sign-In"}
                </button>
              )}

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
    else notify("Could not sign out. Check your connection and try again.");
  };
  const savedLabel =
    cloud.status === "loading"
      ? "Loading question set…"
      : cloud.status === "saving"
        ? "Saving to account…"
        : cloud.status === "unsaved"
          ? "Save pending…"
          : cloud.status === "conflict"
            ? "Choose a Version"
            : cloud.status === "error"
              ? "Could Not Save to Account"
              : cloud.savedAt
                ? `Saved at ${new Date(cloud.savedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                : "No Changes";
  return (
    <div className="guidedApp adminApp">
      <header className="accountHeader">
        <a className="guideBrand" href="/">
          <span>
            <Gamepad2 size={24} />
          </span>
          <b>
            CROWNCLASH
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
            Sign Out
          </button>
        </div>
      </header>
      <main className="cloudWorkspace">
        <div className="cloudHeading">
          <div>
            <h1>Your Question Set</h1>

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
            Host With This Set <ArrowRight size={17} />
          </button>
        </div>
        <div className="cloudToolbar">
          <nav>
            <button
              className={tab === "questions" ? "selected" : ""}
              onClick={() => setTab("questions")}
            >
              1. Question Set
            </button>
            <button
              className={tab === "settings" ? "selected" : ""}
              onClick={() => setTab("settings")}
            >
              2. Teams & Match Rules
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
                  ? "Question Set Changed on Another Device"
                  : cloud.error}
              </b>
              {cloud.status === "conflict" ? (
                <>
                  <p>
                    Your draft is stored on this device. Choose the account version or keep the local draft.
                  </p>
                  <div className="buttonRow">
                    <button
                      className="guideOutline"
                      onClick={() => setDialog("remote")}
                    >
                      Use Account Version
                    </button>
                    <button
                      className="guideOutline"
                      onClick={() => setDialog("local")}
                    >
                      Keep Local Draft
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Your draft is stored on this device. Wait for the saved status to confirm it has synced.
                  </p>
                  <button
                    className="guideOutline"
                    onClick={() => void cloud.reload()}
                  >
                    <RefreshCw size={15} />
                    Reconnect and Retry
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
                <b>This device has a local question set.</b>
                <p>
                  Copy the local question set to your account to use it on other devices.
                </p>
              </div>
              <button
                className="guideOutline"
                onClick={() => setDialog("import-local")}
              >
                Copy to Account
              </button>
            </div>
          )}
        {cloud.status === "loading" ? (
          <div className="cloudLoading">
            <LoaderCircle size={28} className="spinning" />
            <h2>Loading your saved question set…</h2>
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
          title="Copy Local Questions to Your Account?"
          description="Copy local questions, team names, and rules to your account."
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Cancel
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
              Copy Question Set
            </button>
          </div>
        </Modal>
      )}
      {dialog === "start" && (
        <Modal
          title="Host With This Set?"
          description={`Start a new match with ${cloud.draft?.questions.length ?? 0} questions, the saved teams, and match settings. This resets local scores, cards, and history. You can undo it in the control panel.`}
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Not Yet
            </button>
            <button className="guidePrimary" onClick={beginMatch}>
              Start Match on This Device <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {dialog === "logout" && (
        <Modal
          title="Changes Are Still Pending"
          description="Your draft is stored in this browser. Other devices show the last version saved to your account."
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guidePrimary" onClick={() => setDialog(null)}>
              Stay and Save
            </button>
            <button
              className="guideOutline"
              disabled={actionBusy}
              onClick={() => void signOut()}
            >
              Sign Out
            </button>
          </div>
        </Modal>
      )}
      {(dialog === "remote" || dialog === "local") && (
        <Modal
          title={
            dialog === "remote"
              ? "Use Account Version?"
              : "Replace the Account Version With Your Local Draft?"
          }
          description={
            dialog === "remote"
              ? "The account version will replace unsaved changes on this device."
              : "Your local draft will replace the account version. If it changes again on another device, you will be asked to choose again."
          }
          onClose={() => setDialog(null)}
        >
          <div className="modalFooter">
            <button className="guideOutline" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="guidePrimary"
              onClick={() => {
                cloud.resolve(dialog === "remote" ? "remote" : "local");
                setDialog(null);
              }}
            >
              Confirm Version
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
