/**
 * Browser-side calls to this app's own Canvas proxy routes. The routes do the
 * talking to Canvas; this just unwraps their JSON and turns a failure into an
 * Error carrying the hint the route supplied.
 */

export interface CanvasRequestError extends Error {
  hint?: string;
}

interface ApiFailure {
  error?: string;
  hint?: string | null;
}

export async function postCanvas<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const failure = payload as ApiFailure;
    const error = new Error(
      failure.error || "Canvas request failed",
    ) as CanvasRequestError;
    if (failure.hint) error.hint = failure.hint;
    throw error;
  }
  return payload as T;
}

export function describeError(error: unknown): { message: string; hint?: string } {
  if (error instanceof Error) {
    return { message: error.message, hint: (error as CanvasRequestError).hint };
  }
  return { message: "Something went wrong talking to Canvas." };
}
