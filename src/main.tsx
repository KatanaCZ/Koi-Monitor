import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-600.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { initGlassBlurFromStorage } from "./utils/glassBlur";
import { initAtmosphereFromStorage } from "./utils/atmosphereSettings";
import App from "./App";

initGlassBlurFromStorage();
initAtmosphereFromStorage();

if (import.meta.env.DEV) {
  void import('./utils/alertDevSimulation').then((m) => m.mountAlertDevSimulation());
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
