import { defineMiddleware } from "astro:middleware";

const NO_CACHE = "no-store, no-cache, must-revalidate, max-age=0";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const path = context.url.pathname;
  const contentType = response.headers.get("content-type") || "";
  const isStaticAsset =
    path.startsWith("/_astro/") ||
    path.startsWith("/@vite/") ||
    path.startsWith("/src/") ||
    path.startsWith("/@fs/") ||
    path.startsWith("/node_modules/") ||
    contentType.startsWith("text/javascript") ||
    contentType.startsWith("application/javascript") ||
    contentType.startsWith("text/css") ||
    contentType.startsWith("image/");

  if (isStaticAsset) return response;

  response.headers.set("Cache-Control", NO_CACHE);
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
});
