import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  productsTable,
  aiMemoryTable,
  recommendationHistoryTable,
  priceHistoryTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { formatProduct } from "./products";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── AI Recommend ─────────────────────────────────────────────────────────────
router.post("/ai/recommend", async (req, res) => {
  try {
    const { query, budget, category, preferences, conversationHistory = [] } = req.body;
    const sessionId = req.body.sessionId || "default";

    // Fetch all products (optionally filtered)
    const allProducts = await db.select().from(productsTable).limit(100);

    // Get AI memory for personalization
    const [memory] = await db
      .select()
      .from(aiMemoryTable)
      .where(eq(aiMemoryTable.sessionId, sessionId));

    const memoryContext = memory
      ? `User profile: ${memory.userProfile || "Not specified"}. Budget preference: ${memory.budget || "Not specified"}. Favorite categories: ${(memory.favoriteCategories as string[])?.join(", ") || "None"}. Favorite brands: ${(memory.favoriteBrands as string[])?.join(", ") || "None"}. Shopping goals: ${(memory.shoppingGoals as string[])?.join(", ") || "None"}.`
      : "No prior user preferences known.";

    const productList = allProducts
      .map(
        (p) =>
          `ID:${p.id} | ${p.name} | ${p.brand} | ${p.category} | ₹${p.price} (orig: ₹${p.originalPrice || p.price}) | Rating:${p.rating}/5 | ${p.description.slice(0, 100)}`
      )
      .join("\n");

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an expert autonomous AI shopping assistant. Analyze the user's request deeply and recommend the best products.
        
Available products:
${productList}

${memoryContext}

Respond ONLY with valid JSON in this exact format:
{
  "reasoning": "Your step-by-step analysis explaining how you understood the request, analyzed budget/purpose, and selected products",
  "products": [
    {
      "productId": <number>,
      "score": <number 0-100>,
      "rank": <number starting at 1>,
      "why": "Specific reason this product matches the user's needs",
      "pros": ["pro1", "pro2", "pro3"],
      "cons": ["con1", "con2"],
      "bestFor": "Who this is ideal for",
      "notSuitableFor": "Who should avoid this",
      "reviewSummary": "Brief AI-generated review summary"
    }
  ],
  "budgetAdvice": "Budget optimization advice or null if budget is fine",
  "accessories": ["recommended accessory 1", "recommended accessory 2"],
  "followUpQuestions": ["question1 to better understand needs", "question2"]
}

Rank products from best to worst match. Include 2-5 products. Be specific and insightful.`,
      },
      ...conversationHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: query + (budget ? ` Budget: ₹${budget}` : "") + (category ? ` Category: ${category}` : "") },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      messages,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

    // Fetch full product details for recommended IDs
    const recommendations = await Promise.all(
      (parsed.products || []).slice(0, 5).map(async (rec: any) => {
        const [product] = await db
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, rec.productId));
        if (!product) return null;
        return {
          product: formatProduct(product),
          score: rec.score ?? 75,
          rank: rec.rank ?? 1,
          why: rec.why ?? "",
          pros: rec.pros ?? [],
          cons: rec.cons ?? [],
          bestFor: rec.bestFor ?? "",
          notSuitableFor: rec.notSuitableFor ?? "",
          reviewSummary: rec.reviewSummary ?? "",
        };
      })
    );

    const validRecs = recommendations.filter(Boolean);

    // Save to recommendation history
    await db.insert(recommendationHistoryTable).values({
      sessionId,
      query,
      reasoning: parsed.reasoning || "",
      productIds: validRecs.map((r) => r!.product.id),
    });

    // Auto-update AI memory with extracted context
    if (budget || category) {
      await db
        .insert(aiMemoryTable)
        .values({
          sessionId,
          budget: budget ? String(budget) : null,
          favoriteCategories: category ? [category] : [],
          favoriteBrands: [],
          shoppingGoals: [],
        })
        .onConflictDoUpdate({
          target: aiMemoryTable.sessionId,
          set: {
            budget: budget ? String(budget) : sql`ai_memory.budget`,
            updatedAt: new Date(),
          },
        });
    }

    res.json({
      reasoning: parsed.reasoning || "Analyzed your request and found the best matches.",
      products: validRecs,
      budgetAdvice: parsed.budgetAdvice ?? null,
      accessories: parsed.accessories ?? [],
      followUpQuestions: parsed.followUpQuestions ?? [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI recommendation failed" });
  }
});

// ─── AI Compare ────────────────────────────────────────────────────────────────
router.post("/ai/compare", async (req, res) => {
  try {
    const { productIds, userNeeds } = req.body;
    if (!Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({ error: "At least 2 productIds required" });
    }

    const products = await Promise.all(
      productIds.map(async (id: number) => {
        const [p] = await db.select().from(productsTable).where(eq(productsTable.id, id));
        return p;
      })
    );
    const validProducts = products.filter(Boolean);
    if (validProducts.length < 2) {
      return res.status(404).json({ error: "Products not found" });
    }

    const productDescriptions = validProducts
      .map(
        (p) =>
          `Product ID:${p!.id} | Name: ${p!.name} | Brand: ${p!.brand} | Price: ₹${p!.price} | Rating: ${p!.rating}/5 | Description: ${p!.description}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `You are an expert product comparison AI. Compare these products objectively and determine the winner.

Products to compare:
${productDescriptions}

User needs: ${userNeeds || "General use, best value"}

Respond ONLY with valid JSON:
{
  "winnerId": <product id of winner>,
  "analysis": "Detailed comparison analysis explaining each product's strengths and weaknesses",
  "comparisonTable": [
    { "aspect": "Price Value", "scores": { "<productId1>": 85, "<productId2>": 72 } },
    { "aspect": "Performance", "scores": { "<productId1>": 90, "<productId2>": 88 } },
    { "aspect": "Build Quality", "scores": { "<productId1>": 80, "<productId2>": 75 } },
    { "aspect": "Features", "scores": { "<productId1>": 88, "<productId2>": 82 } },
    { "aspect": "Reliability", "scores": { "<productId1>": 85, "<productId2>": 79 } },
    { "aspect": "Future Proof", "scores": { "<productId1>": 78, "<productId2>": 84 } }
  ],
  "recommendation": "Final recommendation explaining why the winner is best and who each product suits"
}`,
        },
        { role: "user", content: `Compare these ${validProducts.length} products and pick the best one.` },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const winner = validProducts.find((p) => p!.id === parsed.winnerId) || validProducts[0];

    res.json({
      winner: formatProduct(winner!),
      analysis: parsed.analysis || "Comprehensive analysis completed.",
      comparisonTable: parsed.comparisonTable || [],
      recommendation: parsed.recommendation || "Based on overall scores, the winner offers the best value.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI comparison failed" });
  }
});

// ─── AI Score ──────────────────────────────────────────────────────────────────
router.get("/ai/score/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid productId" });

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) return res.status(404).json({ error: "Product not found" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `Score this product across 7 dimensions (0-100 each). Return ONLY valid JSON:
{
  "overall": <number>,
  "performance": <number>,
  "price": <number>,
  "reliability": <number>,
  "battery": <number>,
  "popularity": <number>,
  "futureProof": <number>,
  "summary": "2-sentence AI verdict on this product"
}`,
        },
        {
          role: "user",
          content: `Product: ${product.name} by ${product.brand}. Category: ${product.category}. Price: ₹${product.price}. Rating: ${product.rating}/5 from ${product.reviewCount} reviews. ${product.description}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

    // Update product's AI score
    await db
      .update(productsTable)
      .set({ aiScore: String(parsed.overall || 75) })
      .where(eq(productsTable.id, productId));

    res.json({
      productId,
      overall: parsed.overall ?? 75,
      performance: parsed.performance ?? 75,
      price: parsed.price ?? 75,
      reliability: parsed.reliability ?? 75,
      battery: parsed.battery ?? 75,
      popularity: parsed.popularity ?? 75,
      futureProof: parsed.futureProof ?? 75,
      summary: parsed.summary ?? "A solid product worth considering.",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI scoring failed" });
  }
});

// ─── AI Memory ─────────────────────────────────────────────────────────────────
router.get("/ai/memory", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";
    const [memory] = await db
      .select()
      .from(aiMemoryTable)
      .where(eq(aiMemoryTable.sessionId, sessionId));

    if (!memory) {
      // Create default memory
      const [created] = await db
        .insert(aiMemoryTable)
        .values({
          sessionId,
          favoriteCategories: [],
          favoriteBrands: [],
          shoppingGoals: [],
        })
        .returning();
      return res.json(formatMemory(created));
    }

    res.json(formatMemory(memory));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch AI memory" });
  }
});

router.patch("/ai/memory", async (req, res) => {
  try {
    const sessionId = req.body.sessionId || "default";
    const { budget, favoriteCategories, favoriteBrands, preferredPriceRange, userProfile, shoppingGoals } = req.body;

    const [existing] = await db
      .select()
      .from(aiMemoryTable)
      .where(eq(aiMemoryTable.sessionId, sessionId));

    let row;
    if (existing) {
      [row] = await db
        .update(aiMemoryTable)
        .set({
          budget: budget !== undefined ? String(budget) : existing.budget,
          favoriteCategories: favoriteCategories ?? existing.favoriteCategories,
          favoriteBrands: favoriteBrands ?? existing.favoriteBrands,
          preferredPriceRange: preferredPriceRange ?? existing.preferredPriceRange,
          userProfile: userProfile ?? existing.userProfile,
          shoppingGoals: shoppingGoals ?? existing.shoppingGoals,
          updatedAt: new Date(),
        })
        .where(eq(aiMemoryTable.sessionId, sessionId))
        .returning();
    } else {
      [row] = await db
        .insert(aiMemoryTable)
        .values({
          sessionId,
          budget: budget ? String(budget) : null,
          favoriteCategories: favoriteCategories ?? [],
          favoriteBrands: favoriteBrands ?? [],
          preferredPriceRange: preferredPriceRange ?? null,
          userProfile: userProfile ?? null,
          shoppingGoals: shoppingGoals ?? [],
        })
        .returning();
    }

    res.json(formatMemory(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update AI memory" });
  }
});

// ─── Price Prediction ──────────────────────────────────────────────────────────
router.get("/ai/price-prediction/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid productId" });

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Generate simulated price history (last 6 months)
    const history = generatePriceHistory(parseFloat(product.price as string));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `Analyze this product's price trend and predict future movement. Return ONLY valid JSON:
{
  "predictedTrend": "increasing|decreasing|stable",
  "confidence": <number 0-100>,
  "bestTimeToBuy": "now|wait 1 month|wait 2-3 months|buy immediately",
  "analysis": "2-3 sentence analysis of price trend and recommendation"
}`,
        },
        {
          role: "user",
          content: `Product: ${product.name}. Current price: ₹${product.price}. Original price: ₹${product.originalPrice || product.price}. Category: ${product.category}. Price history (last 6 months): ${history.map((h) => `${h.date}: ₹${h.price}`).join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

    res.json({
      productId,
      currentPrice: parseFloat(product.price as string),
      predictedTrend: parsed.predictedTrend || "stable",
      confidence: parsed.confidence ?? 70,
      bestTimeToBuy: parsed.bestTimeToBuy || "now",
      analysis: parsed.analysis || "Price appears stable based on market trends.",
      priceHistory: history,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Price prediction failed" });
  }
});

function formatMemory(memory: typeof aiMemoryTable.$inferSelect) {
  return {
    id: memory.id,
    sessionId: memory.sessionId,
    budget: memory.budget ? parseFloat(memory.budget as string) : null,
    favoriteCategories: (memory.favoriteCategories as string[]) ?? [],
    favoriteBrands: (memory.favoriteBrands as string[]) ?? [],
    preferredPriceRange: memory.preferredPriceRange ?? null,
    userProfile: memory.userProfile ?? null,
    shoppingGoals: (memory.shoppingGoals as string[]) ?? [],
    updatedAt: memory.updatedAt.toISOString(),
  };
}

function generatePriceHistory(currentPrice: number) {
  const history = [];
  let price = currentPrice * 1.15;
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const variance = (Math.random() - 0.5) * 0.08 * price;
    price = Math.max(currentPrice * 0.85, price + variance);
    history.push({
      date: date.toISOString().split("T")[0],
      price: parseFloat(price.toFixed(2)),
    });
  }
  // Last entry is current
  history[history.length - 1].price = currentPrice;
  return history;
}

export default router;
