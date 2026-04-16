import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy-init i18n et monitoring pour éviter des imports side-effect
// qui créent des dépendances React avant que le render tree soit monté.
import("./lib/i18n").catch(() => {});
import("./lib/monitoring").then((m) => m.initMonitoring()).catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
