import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  categoriesTable,
  wishlistTable,
  cartTable,
  recommendationHistoryTable,
} from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";

    const [{ count: totalProducts }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable);

    const [{ count: totalCategories }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categoriesTable);

    const [{ avg }] = await db
      .select({ avg: sql<number>`avg(ai_score::numeric)` })
      .from(productsTable);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ count: recommendationsToday }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recommendationHistoryTable)
      .where(
        and(
          eq(recommendationHistoryTable.sessionId, sessionId),
          gte(recommendationHistoryTable.createdAt, today)
        )
      );

    const [{ count: cartItems }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cartTable)
      .where(eq(cartTable.sessionId, sessionId));

    const [{ count: wishlistItems }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wishlistTable)
      .where(eq(wishlistTable.sessionId, sessionId));

    // Calculate saved budget: sum of (originalPrice - price) for products with discounts
    const [{ saved }] = await db
      .select({
        saved: sql<number>`coalesce(sum((original_price::numeric - price::numeric)), 0)`,
      })
      .from(productsTable)
      .where(sql`original_price IS NOT NULL AND original_price::numeric > price::numeric`);

    const topCategoryResult = await db
      .select({
        category: productsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(productsTable)
      .groupBy(productsTable.category)
      .orderBy(sql`count(*) desc`)
      .limit(1);

    res.json({
      totalProducts: totalProducts ?? 0,
      totalCategories: totalCategories ?? 0,
      avgAiScore: parseFloat(parseFloat(String(avg ?? 0)).toFixed(1)),
      recommendationsToday: recommendationsToday ?? 0,
      cartItems: cartItems ?? 0,
      wishlistItems: wishlistItems ?? 0,
      savedBudget: parseFloat(parseFloat(String(saved ?? 0)).toFixed(2)),
      topCategory: topCategoryResult[0]?.category ?? "Electronics",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

router.get("/dashboard/trending", async (req, res) => {
  try {
    const rows = await db
      .select({
        category: productsTable.category,
        count: sql<number>`count(*)::int`,
        avgPrice: sql<number>`avg(price::numeric)`,
        avgScore: sql<number>`avg(coalesce(ai_score::numeric, 0))`,
      })
      .from(productsTable)
      .groupBy(productsTable.category)
      .orderBy(sql`count(*) desc`)
      .limit(8);

    res.json(
      rows.map((r) => ({
        category: r.category,
        count: r.count,
        avgPrice: parseFloat(parseFloat(String(r.avgPrice ?? 0)).toFixed(2)),
        avgScore: parseFloat(parseFloat(String(r.avgScore ?? 0)).toFixed(1)),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch trending categories" });
  }
});

router.get("/dashboard/price-alerts", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(productsTable)
      .where(
        sql`original_price IS NOT NULL AND original_price::numeric > price::numeric`
      )
      .limit(10);

    res.json(
      rows.map((r) => ({
        productId: r.id,
        productName: r.name,
        originalPrice: parseFloat(r.originalPrice as string),
        currentPrice: parseFloat(r.price as string),
        discount: Math.round(
          ((parseFloat(r.originalPrice as string) - parseFloat(r.price as string)) /
            parseFloat(r.originalPrice as string)) *
            100
        ),
        imageUrl: r.imageUrl ?? null,
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch price alerts" });
  }
});

export default router;
