import { fetchCourses } from "@/lib/canvas";
import { errorResponse, readJson, resolveCredentials } from "../_shared";

/** POST /api/canvas/courses — lists the courses the token can see. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const { baseUrl, token } = resolveCredentials(body);
    const courses = await fetchCourses(baseUrl, token);
    return Response.json({ courses });
  } catch (error) {
    return errorResponse(error);
  }
}
