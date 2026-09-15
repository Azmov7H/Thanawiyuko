import { checkAction } from "../handlers";

/** POST /api/practice/[id]/check — instant locked feedback for one question. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  return checkAction(req, attemptId);
}
