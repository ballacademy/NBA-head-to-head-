import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SITE_NAME,
  type SocialMetaTags,
} from "./communityPostSocialMeta";

const DEFAULT_META: SocialMetaTags = {
  title: DEFAULT_SITE_NAME,
  description:
    "Draft. Match up. Prove your GM eye. Build NBA fives and compete in Casual or Pro Head to Head.",
  url: "https://www.draftdaygm.com/",
  image: DEFAULT_OG_IMAGE,
  imageAlt: DEFAULT_OG_IMAGE_ALT,
  siteName: DEFAULT_SITE_NAME,
};

const DEFAULT_DESCRIPTION = DEFAULT_META.description;

let activeMeta: SocialMetaTags | null = null;
let canonicalLink: HTMLLinkElement | null = null;

const ensureMeta = (key: string, attribute: "name" | "property") => {
  const selector =
    attribute === "name"
      ? `meta[name="${key}"]`
      : `meta[property="${key}"]`;
  const existing = document.head.querySelector(selector);
  if (existing instanceof HTMLMetaElement) {
    return existing;
  }
  const element = document.createElement("meta");
  element.setAttribute(attribute, key);
  document.head.appendChild(element);
  return element;
};

const setMetaContent = (
  key: string,
  attribute: "name" | "property",
  content: string,
) => {
  ensureMeta(key, attribute).content = content;
};

export const applySocialMeta = (meta: SocialMetaTags) => {
  if (typeof document === "undefined") {
    return;
  }

  activeMeta = meta;
  document.title = meta.title;
  setMetaContent("description", "name", meta.description);
  setMetaContent("og:type", "property", "website");
  setMetaContent("og:site_name", "property", meta.siteName);
  setMetaContent("og:title", "property", meta.title);
  setMetaContent("og:description", "property", meta.description);
  setMetaContent("og:url", "property", meta.url);
  setMetaContent("og:image", "property", meta.image);
  setMetaContent("og:image:type", "property", "image/png");
  setMetaContent("og:image:width", "property", "1200");
  setMetaContent("og:image:height", "property", "630");
  setMetaContent("og:image:alt", "property", meta.imageAlt);
  setMetaContent("twitter:card", "name", "summary_large_image");
  setMetaContent("twitter:title", "name", meta.title);
  setMetaContent("twitter:description", "name", meta.description);
  setMetaContent("twitter:image", "name", meta.image);

  if (!canonicalLink) {
    canonicalLink = document.head.querySelector('link[rel="canonical"]');
  }
  if (canonicalLink instanceof HTMLLinkElement) {
    canonicalLink.href = meta.url;
  }
};

export const resetSocialMeta = () => {
  if (typeof document === "undefined" || !activeMeta) {
    return;
  }

  activeMeta = null;
  applySocialMeta({
    ...DEFAULT_META,
    description: DEFAULT_DESCRIPTION,
  });
};
