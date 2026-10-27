import React from "react";
import { createRoot } from "react-dom/client";
import GuidedControl from "./GuidedControl";
import "./shared.css";
import "./guided.css";
const AdminApp = React.lazy(() => import("./admin/AdminApp"));
const recoveryLink = new URLSearchParams(location.search).get("mode") === "resetPassword";
const accountRoute = location.pathname.startsWith("/account") || recoveryLink;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {accountRoute ? (
      <React.Suspense
        fallback={
          <div className="guidedApp accountBoot">Đang mở tài khoản…</div>
        }
      >
        <AdminApp recoveryLink={recoveryLink} />
      </React.Suspense>
    ) : (
      <GuidedControl />
    )}
  </React.StrictMode>,
);
