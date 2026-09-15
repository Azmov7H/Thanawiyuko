import { getExamAttempt, PATCH as saveHeartbeat, submitExam } from "./handlers";

export const PATCH = saveHeartbeat;

/** GET /api/exams/attempt/[id] — state or review+analysis. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  return getExamAttempt(attemptId);
}

/** POST /api/exams/attempt/[id]/submit — final scoring (also reachable here for beacons). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  let final: Array<{ qId: string; chosenKeys: string[]; timeMs: number }> | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.answers)) final = body.answers;
  } catch {
    final = undefined;
  }
  return submitExam(req, attemptId, final);
}
