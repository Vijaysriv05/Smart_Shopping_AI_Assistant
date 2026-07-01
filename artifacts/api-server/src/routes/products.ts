import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, ilike, gte, lte, and, sql } from "drizzle-orm";
import { ListProductsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const parsed = ListProductsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    const conditions = [];
    if (params.category) conditions.push(eq(productsTable.category, params.category));
    if (params.brand) conditions.push(eq(productsTable.brand, params.brand));
    if (params.search) conditions.push(ilike(productsTable.name, `%${params.search}%`));
    if (params.minPrice !== undefined) conditions.push(gte(sql`${productsTable.price}::numeric`, params.minPrice));
    if (params.maxPrice !== undefined) conditions.push(lte(sql`${productsTable.price}::numeric`, params.maxPrice));

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const rows = await db
      .select()
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);

    const products = rows.map(formatProduct);
    res.json(products);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/products/featured", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.isFeatured, true))
      .limit(12);
    res.json(rows.map(formatProduct));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch featured products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!row) return res.status(404).json({ error: "Product not found" });

    res.json(formatProduct(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const [row] = await db.insert(productsTable).values({
      ...req.body,
      specs: req.body.specs ?? {},
      tags: req.body.tags ?? [],
    }).returning();
    res.status(201).json(formatProduct(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

function formatProduct(row: typeof productsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    price: parseFloat(row.price as string),
    originalPrice: row.originalPrice ? parseFloat(row.originalPrice as string) : null,
    imageUrl: row.imageUrl ?? null,
    description: row.description,
    specs: row.specs ?? {},
    rating: parseFloat(row.rating as string),
    reviewCount: row.reviewCount,
    inStock: row.inStock,
    isFeatured: row.isFeatured,
    tags: (row.tags as string[]) ?? [],
    aiScore: row.aiScore ? parseFloat(row.aiScore as string) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export { formatProduct };
export default router;
