import { briefing, startExam } from "./logic";

/** GET /api/exams/[examId] — briefing. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  return briefing(examId);
}

/** POST /api/exams/[examId]/start — begin a timed attempt. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  let key: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.clientAttemptId === "string") key = body.clientAttemptId;
  } catch {
    key = undefined;
  }
  return startExam(examId, key);
}
