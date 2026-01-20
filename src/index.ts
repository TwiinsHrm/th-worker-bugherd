import type { Env } from "./types";
import { handleBugherdWebhook, handleGithubWebhook } from "./handlers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (path === "/webhook/bugherd") {
      return handleBugherdWebhook(request, env);
    }

    if (path === "/webhook/github") {
      return handleGithubWebhook(request, env);
    }

    if (path === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
