import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { initObservability } from "./observability/sentry";
import "./index.css";

void initObservability();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
