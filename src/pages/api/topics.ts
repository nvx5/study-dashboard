import type { APIRoute } from "astro";
import { getState, setState } from "../../lib/store";
import { parseIncomingState } from "../../lib/validate";

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const state = await getState();
    const etag = `"${state.updatedAt}"`;
    if (request.headers.get("If-None-Match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "no-store",
        },
      });
    }
    return json(state, 200, { ETag: etag });
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
    return json(state, 200, { ETag: `"${state.updatedAt}"` });
  } catch {
    return json({ error: "Could not save topics" }, 500);
  }
};
