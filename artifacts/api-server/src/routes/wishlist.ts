import { Router } from "express";
import { db } from "@workspace/db";
import { wishlistTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { formatProduct } from "./products";

const router = Router();

router.get("/wishlist", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";
    const rows = await db
      .select()
      .from(wishlistTable)
      .where(eq(wishlistTable.sessionId, sessionId));

    const items = await Promise.all(
      rows.map(async (row) => {
        const [product] = await db
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, row.productId));
        return {
          id: row.id,
          sessionId: row.sessionId,
          productId: row.productId,
          product: product ? formatProduct(product) : null,
          addedAt: row.addedAt.toISOString(),
        };
      })
    );

    res.json(items.filter((i) => i.product));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

router.post("/wishlist", async (req, res) => {
  try {
    const { productId, sessionId = "default" } = req.body;
    if (!productId) return res.status(400).json({ error: "productId required" });

    const [existing] = await db
      .select()
      .from(wishlistTable)
      .where(and(eq(wishlistTable.sessionId, sessionId), eq(wishlistTable.productId, productId)));

    if (existing) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
      return res.status(201).json({
        id: existing.id,
        sessionId: existing.sessionId,
        productId: existing.productId,
        product: product ? formatProduct(product) : null,
        addedAt: existing.addedAt.toISOString(),
      });
    }

    const [row] = await db.insert(wishlistTable).values({ productId, sessionId }).returning();
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    res.status(201).json({
      id: row.id,
      sessionId: row.sessionId,
      productId: row.productId,
      product: product ? formatProduct(product) : null,
      addedAt: row.addedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
});

router.delete("/wishlist/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(wishlistTable).where(eq(wishlistTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove from wishlist" });
  }
});

export default router;
