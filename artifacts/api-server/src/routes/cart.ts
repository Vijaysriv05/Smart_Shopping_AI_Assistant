import { Router } from "express";
import { db } from "@workspace/db";
import { cartTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { formatProduct } from "./products";

const router = Router();

router.get("/cart", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";
    const rows = await db
      .select()
      .from(cartTable)
      .where(eq(cartTable.sessionId, sessionId));

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
          quantity: row.quantity,
          product: product ? formatProduct(product) : null,
          addedAt: row.addedAt.toISOString(),
        };
      })
    );

    res.json(items.filter((i) => i.product));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.post("/cart", async (req, res) => {
  try {
    const { productId, quantity = 1, sessionId = "default" } = req.body;
    if (!productId) return res.status(400).json({ error: "productId required" });

    // Check if already in cart
    const [existing] = await db
      .select()
      .from(cartTable)
      .where(and(eq(cartTable.sessionId, sessionId), eq(cartTable.productId, productId)));

    let row;
    if (existing) {
      [row] = await db
        .update(cartTable)
        .set({ quantity: existing.quantity + quantity })
        .where(eq(cartTable.id, existing.id))
        .returning();
    } else {
      [row] = await db.insert(cartTable).values({ productId, quantity, sessionId }).returning();
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    res.status(201).json({
      id: row.id,
      sessionId: row.sessionId,
      productId: row.productId,
      quantity: row.quantity,
      product: product ? formatProduct(product) : null,
      addedAt: row.addedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

router.delete("/cart/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(cartTable).where(eq(cartTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

export default router;
