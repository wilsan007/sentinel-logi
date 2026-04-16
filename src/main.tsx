import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { initMonitoring } from "./lib/monitoring";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Initialise Sentry de manière non-bloquante (no-op si pas de DSN).
void initMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
