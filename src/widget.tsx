import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/geist-sans/latin-400.css";
import "@fontsource/geist-sans/latin-600.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { initGlassBlurFromStorage } from "./utils/glassBlur";
import { initAtmosphereFromStorage } from "./utils/atmosphereSettings";
import WidgetApp from "./WidgetApp";
import './styles/globals.css';

initGlassBlurFromStorage();
initAtmosphereFromStorage();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WidgetApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
