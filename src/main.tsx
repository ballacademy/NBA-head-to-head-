import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { RuntimeErrorToaster } from "./components/RuntimeErrorToaster";
import { clearStaleAssetReloadFlag } from "./lib/lazyChunk";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/archivo/latin-800.css";
import "@fontsource/montserrat/latin-500.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

clearStaleAssetReloadFlag();

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
      <RuntimeErrorToaster />
    </AppErrorBoundary>
  </StrictMode>,
);
