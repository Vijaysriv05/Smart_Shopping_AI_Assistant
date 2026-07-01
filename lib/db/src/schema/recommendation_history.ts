import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationHistoryTable = pgTable("recommendation_history", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  query: text("query").notNull(),
  reasoning: text("reasoning").notNull(),
  productIds: jsonb("product_ids").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecommendationHistorySchema = createInsertSchema(recommendationHistoryTable).omit({ id: true, createdAt: true });
export type InsertRecommendationHistory = z.infer<typeof insertRecommendationHistorySchema>;
export type RecommendationHistory = typeof recommendationHistoryTable.$inferSelect;
