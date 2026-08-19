import { useEffect, useState } from "react";
import {
  hasCapturedInstallPrompt,
  isStandaloneDisplay,
  promptPwaInstall,
  subscribeInstallPrompt,
} from "../lib/pwaInstall";

/** Quiet Account prompt so Daily is one tap from the home screen. */
export function AddToHomeScreenCard() {
  const [standalone, setStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installState, setInstallState] = useState<"idle" | "done" | "failed">(
    "idle",
  );

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setCanPrompt(hasCapturedInstallPrompt());
    const unsubscribe = subscribeInstallPrompt(() => {
      setCanPrompt(hasCapturedInstallPrompt());
    });
    return unsubscribe;
  }, []);

  if (standalone) {
    return null;
  }

  const handleInstall = async () => {
    const ok = await promptPwaInstall();
    setInstallState(ok ? "done" : "failed");
    setCanPrompt(false);
  };

  return (
    <div className="account-section__home-screen">
      <p className="account-section__eyebrow">Home screen</p>
      <p className="landing-team-form__identity-note">
        Add Draft Day GM so Daily is one tap away. iPhone: Share → Add to Home
        Screen. Android: browser menu → Install app.
      </p>
      {canPrompt ? (
        <button
          type="button"
          className="secondary-button"
          onClick={() => void handleInstall()}
        >
          {installState === "done" ? "Added" : "Install app"}
        </button>
      ) : null}
    </div>
  );
}
