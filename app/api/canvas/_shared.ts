import { CanvasError, normalizeBaseUrl } from "@/lib/canvas";

export interface Credentials {
  baseUrl: string;
  token: string;
}

/**
 * Credentials come from the request body (what the user typed in Settings),
 * falling back to server env vars so a self-hosted instance can be pre-wired.
 * Nothing is persisted server-side either way.
 */
export function resolveCredentials(body: Record<string, unknown>): Credentials {
  const rawUrl = str(body.baseUrl) || process.env.CANVAS_BASE_URL || "";
  const token = str(body.token) || process.env.CANVAS_ACCESS_TOKEN || "";

  const baseUrl = normalizeBaseUrl(rawUrl);
  if (!token) {
    throw new CanvasError("Add a Canvas access token first.", 400, "Canvas → Account → Settings → New Access Token.");
  }
  return { baseUrl, token };
}

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof CanvasError) {
    return Response.json(
      { error: error.message, hint: error.hint ?? null },
      { status: error.status >= 400 && error.status < 600 ? error.status : 500 },
    );
  }
  console.error("[canvas] unexpected failure", error);
  return Response.json({ error: "Something went wrong talking to Canvas." }, { status: 500 });
}
