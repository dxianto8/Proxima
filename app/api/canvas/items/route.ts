import { fetchItems } from "@/lib/canvas";
import { errorResponse, readJson, resolveCredentials } from "../_shared";

/** POST /api/canvas/items — assignments (and optionally events) for chosen courses. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const { baseUrl, token } = resolveCredentials(body);

    const courseIds = Array.isArray(body.courseIds)
      ? body.courseIds.map(Number).filter((id) => Number.isFinite(id))
      : [];
    if (courseIds.length === 0) {
      return Response.json({ items: [] });
    }

    const items = await fetchItems(baseUrl, token, {
      courseIds,
      includeEvents: body.includeEvents === true,
    });
    return Response.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
