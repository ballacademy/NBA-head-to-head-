import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { RuntimeErrorToaster } from "./components/RuntimeErrorToaster";
import { lazyWithChunkReload } from "./lib/lazyChunk";
import { isStandingsComposerRoute } from "./standingsComposer/isStandingsComposerRoute";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/archivo/latin-800.css";
import "@fontsource/montserrat/latin-500.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import "./styles.css";

const StandingsComposerApp = lazyWithChunkReload(() =>
  import("./standingsComposer/StandingsComposerApp").then((m) => ({
    default: m.StandingsComposerApp,
  })),
);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const composer = isStandingsComposerRoute();

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      {composer ? (
        <Suspense
          fallback={
            <div className="feature-page-fallback hub-empty" role="status">
              <p>Loading composer…</p>
            </div>
          }
        >
          <StandingsComposerApp />
        </Suspense>
      ) : (
        <>
          <App />
          <RuntimeErrorToaster />
        </>
      )}
    </AppErrorBoundary>
  </StrictMode>,
);
