import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/recommendations/history", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";
    const rows = await db
      .select()
      .from(recommendationHistoryTable)
      .where(eq(recommendationHistoryTable.sessionId, sessionId))
      .limit(20);

    res.json(
      rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        query: r.query,
        reasoning: r.reasoning,
        productIds: (r.productIds as number[]) ?? [],
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch recommendation history" });
  }
});

export default router;
