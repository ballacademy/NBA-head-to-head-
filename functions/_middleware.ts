/**
 * Canonicalize the public site hostname to www.
 *
 * Safari fails on bare draftdaygm.com when the apex domain has no DNS/Pages
 * binding. Once the apex is attached in Cloudflare, this middleware sends
 * visitors to https://www.draftdaygm.com with a permanent redirect.
 *
 * When social crawlers fetch a community post deep link (`?post=`), inject
 * post-specific Open Graph tags into the HTML shell.
 */
import type { Env } from "./types";
import {
  buildCommunityPostSocialMetaFromRow,
  fetchCommunityPostForSocialMeta,
  injectSocialMetaIntoHtml,
} from "./lib/socialMetaHtml";
import { isSocialCrawlerUserAgent } from "../../src/lib/communityPostSocialMeta";

const CANONICAL_HOST = "www.draftdaygm.com";
const APEX_HOSTS = new Set(["draftdaygm.com"]);

const isHtmlNavigationRequest = (request: Request) => {
  if (request.method !== "GET") {
    return false;
  }

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    return false;
  }

  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/") || path.startsWith("/assets/")) {
    return false;
  }

  return !/\.[a-z0-9]+$/i.test(path);
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (APEX_HOSTS.has(host)) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const postId = url.searchParams.get("post")?.trim().slice(0, 80) ?? "";
  const userAgent = context.request.headers.get("user-agent") ?? "";

  if (
    postId &&
    isSocialCrawlerUserAgent(userAgent) &&
    isHtmlNavigationRequest(context.request)
  ) {
    const row = await fetchCommunityPostForSocialMeta(context.env.DB, postId);
    if (row) {
      const response = await context.next();
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.includes("text/html")) {
        const html = await response.text();
        const meta = buildCommunityPostSocialMetaFromRow(row, url.toString());
        const injected = injectSocialMetaIntoHtml(html, meta);
        const headers = new Headers(response.headers);
        headers.set("cache-control", "no-cache");
        return new Response(injected, {
          status: response.status,
          headers,
        });
      }
      return response;
    }
  }

  return context.next();
};
