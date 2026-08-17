/** Reset the hub's real scroll container (not just window). */
export const scrollHubToTop = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const go = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document
      .querySelectorAll(".landing-hub-scroll")
      .forEach((node) => {
        if (node instanceof HTMLElement) {
          node.scrollTop = 0;
          node.scrollLeft = 0;
        }
      });
  };

  go();
  requestAnimationFrame(() => {
    go();
    requestAnimationFrame(go);
  });
};
