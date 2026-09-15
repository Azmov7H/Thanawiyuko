import { submitAction } from "../handlers";

/** POST /api/practice/[id]/submit — final scoring (idempotent). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  return submitAction(req, attemptId);
}
