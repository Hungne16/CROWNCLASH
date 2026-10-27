import React from "react";
import { createRoot } from "react-dom/client";
import GuidedControl from "./GuidedControl";
import "./shared.css";
import "./guided.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GuidedControl />
  </React.StrictMode>,
);
