import "@fontsource-variable/inter";
import { AnimationPreview } from "./animation/CardActivationOverlay";
import React from "react";
import { createRoot } from "react-dom/client";
import GuidedControl from "./GuidedControl";
import "./shared.css";
import "./guided.css";
import { LeaderboardPage } from "./leaderboard/BannerLeaderboard";
const AdminApp = React.lazy(() => import("./admin/AdminApp"));
const recoveryLink = new URLSearchParams(location.search).get("mode") === "resetPassword";
const accountRoute = location.pathname.startsWith("/account") || recoveryLink;

class HostRecovery extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="guidedApp">
        <section className="guideShell">
          <div className="guideStep" role="alert">
            <h1>Host controls paused</h1>
            <p>Resume from the last saved match state.</p>
            <div className="guideNext">
              <button className="guidePrimary" onClick={() => this.setState({ failed: false })}>
                Resume Host Controls
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.pathname === "/leaderboard" ? <React.Suspense fallback={<div>Loading leaderboard…</div>}><LeaderboardPage/></React.Suspense> : location.pathname === "/animation-preview" ? <AnimationPreview/> : accountRoute ? (
      <React.Suspense
        fallback={
          <div className="guidedApp accountBoot">Opening account…</div>
        }
      >
        <AdminApp recoveryLink={recoveryLink} />
      </React.Suspense>
    ) : (
      location.pathname === "/presentation" ? <GuidedControl /> : <HostRecovery><GuidedControl /></HostRecovery>
    )}
  </React.StrictMode>,
);
