/**
 * Canonicalize the public site hostname to www.
 *
 * Safari fails on bare draftdaygm.com when the apex domain has no DNS/Pages
 * binding. Once the apex is attached in Cloudflare, this middleware sends
 * visitors to https://www.draftdaygm.com with a permanent redirect.
 */
const CANONICAL_HOST = "www.draftdaygm.com";
const APEX_HOSTS = new Set(["draftdaygm.com"]);

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  if (APEX_HOSTS.has(host)) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
};
