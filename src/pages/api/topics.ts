import type { APIRoute } from "astro";
import { getState, setState } from "../../lib/store";
import { parseIncomingState } from "../../lib/validate";

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      Pragma: "no-cache",
      Expires: "0",
      ...extra,
    },
  });
}

export const GET: APIRoute = async () => {
  try {
    const state = await getState();
    return json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load topics";
    console.error("GET /api/topics", error);
    return json({ error: message }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  let incoming;
  try {
    incoming = parseIncomingState(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid topics";
    return json({ error: message }, 400);
  }

  try {
    const state = await setState(incoming);
    return json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save topics";
    if (message.startsWith("No categories")) {
      return json({ error: message }, 400);
    }
    return json({ error: "Could not save topics" }, 500);
  }
};
