/** Home-screen install helpers. Failures are ignored (Safari / in-app browsers). */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of [...listeners]) {
    listener();
  }
};

export const isStandaloneDisplay = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
};

export const subscribeInstallPrompt = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const hasCapturedInstallPrompt = () => deferredPrompt != null;

export const capturePwaInstallPrompt = () => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  };

  window.addEventListener("beforeinstallprompt", onPrompt);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
  };
};

export const promptPwaInstall = async (): Promise<boolean> => {
  const promptEvent = deferredPrompt;
  if (!promptEvent) {
    return false;
  }

  deferredPrompt = null;
  emit();
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    return choice.outcome === "accepted";
  } catch {
    return false;
  }
};
