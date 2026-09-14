/**
 * GET /api/canvas/config — tells the browser whether the server already has
 * Canvas credentials in its environment, so Settings can pre-fill the address
 * and skip asking for a token that is already configured.
 */
export async function GET() {
  return Response.json({
    baseUrl: process.env.CANVAS_BASE_URL ?? "",
    hasServerToken: Boolean(process.env.CANVAS_ACCESS_TOKEN),
  });
}
