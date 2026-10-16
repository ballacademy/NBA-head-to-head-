const BA_ICON = "/ba-logo-circled.png";
const BA_SITE = "Ballacademy";

const upsertLink = (
  rel: string,
  href: string,
  extras: Record<string, string> = {},
) => {
  const selector = extras.sizes
    ? `link[rel="${rel}"][sizes="${extras.sizes}"]`
    : `link[rel="${rel}"]`;
  let link = document.head.querySelector(selector);
  if (!(link instanceof HTMLLinkElement)) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  Object.entries(extras).forEach(([key, value]) => {
    link.setAttribute(key, value);
  });
};

const setMeta = (attribute: "name" | "property", key: string, content: string) => {
  const selector =
    attribute === "name"
      ? `meta[name="${key}"]`
      : `meta[property="${key}"]`;
  let meta = document.head.querySelector(selector);
  if (!(meta instanceof HTMLMetaElement)) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
};

/** Composer routes use the circled BA mark, not Draft Day GM. */
export const applyComposerFavicon = () => {
  if (typeof document === "undefined") {
    return;
  }
  upsertLink("icon", BA_ICON, { type: "image/png" });
  upsertLink("shortcut icon", BA_ICON, { type: "image/png" });
  upsertLink("apple-touch-icon", BA_ICON, { sizes: "180x180" });
  setMeta("property", "og:site_name", BA_SITE);
  setMeta("property", "og:image", `${window.location.origin}${BA_ICON}`);
  setMeta("name", "apple-mobile-web-app-title", BA_SITE);
  const manifest = document.head.querySelector('link[rel="manifest"]');
  if (manifest instanceof HTMLLinkElement) {
    manifest.remove();
  }
};
