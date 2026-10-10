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

const ComposerHub = lazyWithChunkReload(() =>
  import("./instagramComposer/ComposerHub").then((m) => ({
    default: m.ComposerHub,
  })),
);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// This branch defaults to the standings composer (including `/`).
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
          <ComposerHub />
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
