import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cartTable = pgTable("cart", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertCartSchema = createInsertSchema(cartTable).omit({ id: true, addedAt: true });
export type InsertCart = z.infer<typeof insertCartSchema>;
export type CartRow = typeof cartTable.$inferSelect;
