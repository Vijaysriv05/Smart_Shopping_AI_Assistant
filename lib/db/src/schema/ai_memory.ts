import { pgTable, serial, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiMemoryTable = pgTable("ai_memory", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  budget: numeric("budget", { precision: 10, scale: 2 }),
  favoriteCategories: jsonb("favorite_categories").default([]),
  favoriteBrands: jsonb("favorite_brands").default([]),
  preferredPriceRange: text("preferred_price_range"),
  userProfile: text("user_profile"),
  shoppingGoals: jsonb("shopping_goals").default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAiMemorySchema = createInsertSchema(aiMemoryTable).omit({ id: true, updatedAt: true });
export type InsertAiMemory = z.infer<typeof insertAiMemorySchema>;
export type AiMemory = typeof aiMemoryTable.$inferSelect;
