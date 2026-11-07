export const BLANK_POST_CONFIRM =
  "Blank this post? Picks and type will clear. Keep photos stays one click.";

export const confirmBlankPost = () => {
  if (typeof window === "undefined") {
    return true;
  }
  return window.confirm(BLANK_POST_CONFIRM);
};
