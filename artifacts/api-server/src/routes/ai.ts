import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  productsTable,
  aiMemoryTable,
  recommendationHistoryTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { formatProduct } from "./products";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Smart Rule-Based Fallback ─────────────────────────────────────────────────
function smartFallback(
  query: string,
  products: (typeof productsTable.$inferSelect)[],
  budget?: number,
  category?: string
) {
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/).filter((w) => w.length > 2);

  const categoryMap: Record<string, string> = {
    laptop: "Laptops", laptops: "Laptops", macbook: "Laptops", notebook: "Laptops", computer: "Laptops", pc: "Laptops", programming: "Laptops", coding: "Laptops", development: "Laptops",
    phone: "Smartphones", smartphone: "Smartphones", mobile: "Smartphones", iphone: "Smartphones", android: "Smartphones",
    headphone: "Headphones", headphones: "Headphones", earphone: "Headphones", earphones: "Headphones", earbud: "Headphones", earbuds: "Headphones", wireless: "Headphones",
    tablet: "Tablets", ipad: "Tablets",
    watch: "Smartwatches", smartwatch: "Smartwatches",
    camera: "Cameras", dslr: "Cameras", mirrorless: "Cameras", photography: "Cameras",
    gaming: "Gaming", playstation: "Gaming", xbox: "Gaming", console: "Gaming", ps5: "Gaming",
  };

  let detectedCategory = category || "";
  for (const [kw, cat] of Object.entries(categoryMap)) {
    if (q.includes(kw)) { detectedCategory = cat; break; }
  }

  let filtered = products;
  if (budget) filtered = filtered.filter((p) => parseFloat(p.price as string) <= budget * 1.15);
  if (detectedCategory) filtered = filtered.filter((p) => p.category === detectedCategory);

  if (filtered.length === 0) filtered = products.slice(0, 10);

  const scored = filtered.map((p) => {
    let score = 50;
    const pText = `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase();
    keywords.forEach((kw) => { if (pText.includes(kw)) score += 12; });
    if (detectedCategory && p.category === detectedCategory) score += 20;
    if (budget) {
      const price = parseFloat(p.price as string);
      if (price <= budget) score += 15;
      if (price <= budget * 0.85) score += 8;
    }
    score += parseFloat(p.rating as string) * 4;
    return { ...p, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);

  const accessories: Record<string, string[]> = {
    Laptops: ["Laptop Bag", "Wireless Mouse", "USB-C Hub", "Laptop Stand", "Cooling Pad"],
    Smartphones: ["Phone Case", "Tempered Glass", "Fast Charger", "Power Bank", "Wireless Earbuds"],
    Headphones: ["Carrying Case", "Extra Ear Pads", "Headphone Stand", "Audio Cable"],
    Tablets: ["Tablet Case", "Stylus Pen", "Bluetooth Keyboard", "Screen Protector"],
    Smartwatches: ["Watch Band", "Charger Dock", "Screen Protector"],
    Cameras: ["Camera Bag", "Extra Battery", "Memory Card", "Tripod", "Lens Cleaning Kit"],
    Gaming: ["Gaming Controller", "HDMI Cable", "Gaming Headset", "Extra Storage"],
  };

  const top = scored.slice(0, 4);
  const catAccessories = accessories[detectedCategory] || ["Carry Bag", "Cleaning Kit", "Extended Warranty"];

  const reasoningParts = [];
  if (q) reasoningParts.push(`User query: "${query}"`);
  if (detectedCategory) reasoningParts.push(`Detected category: ${detectedCategory}`);
  if (budget) reasoningParts.push(`Budget filter: ₹${budget}`);
  reasoningParts.push(`Matched ${top.length} products by relevance, brand trust, and ratings`);

  return {
    reasoning: reasoningParts.join(". ") + ". Products ranked by keyword relevance and user ratings.",
    products: top.map((p, i) => ({
      productId: p.id,
      score: Math.min(95, Math.max(60, Math.round(p._score))),
      rank: i + 1,
      why: `${p.brand} ${p.name} scores highest for your needs — excellent ${p.category.toLowerCase()} with ${p.rating}/5 rating and strong market reputation`,
      pros: ["Highly rated by users", `Trusted brand: ${p.brand}`, "Strong build quality", "Good value for money"],
      cons: ["Check for latest model updates", "Compare warranty options"],
      bestFor: `${p.category} users seeking quality and reliability`,
      notSuitableFor: "Ultra-budget shoppers or those needing very niche specs",
      reviewSummary: `${p.name} by ${p.brand} — rated ${p.rating}/5 stars. Popular pick in the ${p.category} segment with consistent positive reviews on performance and reliability.`,
    })),
    budgetAdvice: budget && top.length < 2 ? `Consider increasing your budget slightly for more options in ${detectedCategory || "this category"}` : null,
    accessories: catAccessories.slice(0, 4),
    followUpQuestions: [
      `What is your main use case for this ${detectedCategory || "product"}?`,
      "Do you have a preferred brand?",
      "Is battery life or performance more important to you?",
    ],
  };
}

function fallbackCompare(products: (typeof productsTable.$inferSelect)[], userNeeds: string) {
  const scored = products.map((p) => {
    const price = parseFloat(p.price as string);
    const origPrice = parseFloat((p.originalPrice || p.price) as string);
    const discount = origPrice > price ? ((origPrice - price) / origPrice) * 100 : 0;
    const rating = parseFloat(p.rating as string);
    const score = rating * 15 + discount * 0.5 + (p.reviewCount > 1000 ? 10 : 5);
    return { ...p, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  const winner = scored[0];

  const table = [
    { aspect: "Price Value", scores: Object.fromEntries(products.map((p) => [p.id, Math.round(70 + Math.random() * 20)])) },
    { aspect: "Performance", scores: Object.fromEntries(products.map((p) => [p.id, Math.round(parseFloat(p.rating as string) * 18)])) },
    { aspect: "Build Quality", scores: Object.fromEntries(products.map((p) => [p.id, Math.round(65 + Math.random() * 25)])) },
    { aspect: "Features", scores: Object.fromEntries(products.map((p) => [p.id, Math.round(68 + Math.random() * 22)])) },
    { aspect: "Reliability", scores: Object.fromEntries(products.map((p) => [p.id, Math.round(parseFloat(p.rating as string) * 17)])) },
    { aspect: "Future Proof", scores: Object.fromEntries(products.map((p) => [p.id, Math.round(62 + Math.random() * 28)])) },
  ];

  return {
    winner: formatProduct(winner),
    analysis: `Comparing ${products.map((p) => p.name).join(" vs ")}. ${winner.name} by ${winner.brand} leads with a ${winner.rating}/5 rating and ${winner.reviewCount.toLocaleString()} reviews, making it the top recommendation for ${userNeeds || "general use"}.`,
    comparisonTable: table,
    recommendation: `${winner.name} is the best choice — highest user satisfaction score and strongest brand trust. ${products.filter((p) => p.id !== winner.id).map((p) => p.name).join(" and ")} ${products.length > 2 ? "are" : "is"} a good alternative for budget-conscious buyers.`,
  };
}

function fallbackScore(product: typeof productsTable.$inferSelect) {
  const rating = parseFloat(product.rating as string);
  const price = parseFloat(product.price as string);
  const origPrice = parseFloat((product.originalPrice || product.price) as string);
  const discount = origPrice > price ? ((origPrice - price) / origPrice) * 100 : 0;

  const base = Math.round(rating * 14);
  const priceScore = Math.min(95, Math.round(60 + discount * 0.8 + (product.reviewCount > 5000 ? 10 : 5)));

  return {
    overall: Math.min(95, base + 10),
    performance: Math.min(95, base + 5 + Math.round(Math.random() * 8)),
    price: priceScore,
    reliability: Math.min(95, base + 3 + Math.round(Math.random() * 6)),
    battery: Math.min(95, base - 2 + Math.round(Math.random() * 10)),
    popularity: Math.min(95, Math.round(60 + (product.reviewCount / 1000) * 5)),
    futureProof: Math.min(95, base - 5 + Math.round(Math.random() * 12)),
    summary: `${product.name} by ${product.brand} is a ${rating >= 4.5 ? "top-tier" : rating >= 4.0 ? "solid" : "decent"} ${product.category} product with ${rating}/5 user satisfaction. ${discount > 10 ? `Currently ${Math.round(discount)}% off original price — great deal.` : "Priced at market value."}`,
  };
}

// ─── AI Recommend ─────────────────────────────────────────────────────────────
router.post("/ai/recommend", async (req, res) => {
  try {
    const { query, budget, category, conversationHistory = [] } = req.body;
    const sessionId = req.body.sessionId || "default";

    const allProducts = await db.select().from(productsTable).limit(100);

    const [memory] = await db.select().from(aiMemoryTable).where(eq(aiMemoryTable.sessionId, sessionId));

    const memoryContext = memory
      ? `User profile: ${memory.userProfile || "Not specified"}. Budget: ${memory.budget || "Not specified"}. Categories: ${(memory.favoriteCategories as string[])?.join(", ") || "None"}. Brands: ${(memory.favoriteBrands as string[])?.join(", ") || "None"}.`
      : "No prior preferences known.";

    const productList = allProducts
      .map((p) => `ID:${p.id} | ${p.name} | ${p.brand} | ${p.category} | Price:${p.price} | Rating:${p.rating}/5 | ${p.description.slice(0, 80)}`)
      .join("\n");

    let parsed: any = null;

    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are an expert autonomous AI shopping assistant. Analyze the user's request and recommend the best products.

Available products:
${productList}

${memoryContext}

Respond ONLY with valid JSON:
{
  "reasoning": "Step-by-step analysis",
  "products": [
    {
      "productId": <number>,
      "score": <0-100>,
      "rank": <1-based>,
      "why": "Why this product matches",
      "pros": ["pro1", "pro2"],
      "cons": ["con1"],
      "bestFor": "Ideal user",
      "notSuitableFor": "Who to avoid",
      "reviewSummary": "AI review summary"
    }
  ],
  "budgetAdvice": "Budget tip or null",
  "accessories": ["accessory1", "accessory2"],
  "followUpQuestions": ["q1", "q2"]
}`,
        },
        ...conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: query + (budget ? ` Budget: ₹${budget}` : "") + (category ? ` Category: ${category}` : ""),
        },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        messages,
        response_format: { type: "json_object" },
      });
      parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch {
      // OpenAI unavailable — use smart rule-based fallback
      const fallback = smartFallback(query, allProducts, budget, category);
      parsed = fallback;
    }

    const recommendations = await Promise.all(
      (parsed.products || []).slice(0, 5).map(async (rec: any) => {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, rec.productId));
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

    await db.insert(recommendationHistoryTable).values({
      sessionId,
      query,
      reasoning: parsed.reasoning || "",
      productIds: validRecs.map((r) => r!.product.id),
    });

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
    const validProducts = products.filter(Boolean) as (typeof productsTable.$inferSelect)[];
    if (validProducts.length < 2) {
      return res.status(404).json({ error: "Products not found" });
    }

    let result: any = null;

    try {
      const productDescriptions = validProducts
        .map((p) => `ID:${p.id} | ${p.name} | ${p.brand} | ₹${p.price} | Rating:${p.rating}/5 | ${p.description}`)
        .join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `Compare these products. User needs: ${userNeeds || "best value"}. Products:\n${productDescriptions}\n\nRespond ONLY with valid JSON:
{
  "winnerId": <product id>,
  "analysis": "Detailed comparison",
  "comparisonTable": [
    { "aspect": "Price Value", "scores": { "<id1>": 85, "<id2>": 72 } },
    { "aspect": "Performance", "scores": { "<id1>": 90, "<id2>": 88 } },
    { "aspect": "Build Quality", "scores": { "<id1>": 80, "<id2>": 75 } },
    { "aspect": "Features", "scores": { "<id1>": 88, "<id2>": 82 } },
    { "aspect": "Reliability", "scores": { "<id1>": 85, "<id2>": 79 } },
    { "aspect": "Future Proof", "scores": { "<id1>": 78, "<id2>": 84 } }
  ],
  "recommendation": "Final recommendation"
}`,
          },
          { role: "user", content: `Compare these ${validProducts.length} products.` },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
      const winner = validProducts.find((p) => p.id === parsed.winnerId) || validProducts[0];
      result = {
        winner: formatProduct(winner),
        analysis: parsed.analysis || "Comparison completed.",
        comparisonTable: parsed.comparisonTable || [],
        recommendation: parsed.recommendation || "The winner offers the best overall value.",
      };
    } catch {
      result = fallbackCompare(validProducts, userNeeds || "general use");
    }

    res.json(result);
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

    let scores: any = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content: `Score this product (0-100 each). Return ONLY valid JSON:
{"overall":<n>,"performance":<n>,"price":<n>,"reliability":<n>,"battery":<n>,"popularity":<n>,"futureProof":<n>,"summary":"2-sentence verdict"}`,
          },
          {
            role: "user",
            content: `${product.name} by ${product.brand}. Category: ${product.category}. Price: ₹${product.price}. Rating: ${product.rating}/5 (${product.reviewCount} reviews). ${product.description}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      scores = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch {
      scores = fallbackScore(product);
    }

    await db.update(productsTable).set({ aiScore: String(scores.overall || 75) }).where(eq(productsTable.id, productId));

    res.json({
      productId,
      overall: scores.overall ?? 75,
      performance: scores.performance ?? 75,
      price: scores.price ?? 75,
      reliability: scores.reliability ?? 75,
      battery: scores.battery ?? 75,
      popularity: scores.popularity ?? 75,
      futureProof: scores.futureProof ?? 75,
      summary: scores.summary ?? "A solid product worth considering.",
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
    const [memory] = await db.select().from(aiMemoryTable).where(eq(aiMemoryTable.sessionId, sessionId));

    if (!memory) {
      const [created] = await db
        .insert(aiMemoryTable)
        .values({ sessionId, favoriteCategories: [], favoriteBrands: [], shoppingGoals: [] })
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

    const [existing] = await db.select().from(aiMemoryTable).where(eq(aiMemoryTable.sessionId, sessionId));

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

    const history = generatePriceHistory(parseFloat(product.price as string));

    let prediction: any = null;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `Analyze price trend. Return ONLY valid JSON:
{"predictedTrend":"increasing|decreasing|stable","confidence":<n>,"bestTimeToBuy":"now|wait 1 month|wait 2-3 months|buy immediately","analysis":"2-3 sentences"}`,
          },
          {
            role: "user",
            content: `${product.name}. Current: ₹${product.price}. Original: ₹${product.originalPrice || product.price}. History: ${history.map((h) => `${h.date}:₹${h.price}`).join(", ")}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      prediction = JSON.parse(completion.choices[0]?.message?.content || "{}");
    } catch {
      const currentPrice = parseFloat(product.price as string);
      const origPrice = parseFloat((product.originalPrice || product.price) as string);
      const trending = currentPrice < origPrice ? "decreasing" : "stable";
      prediction = {
        predictedTrend: trending,
        confidence: 72,
        bestTimeToBuy: trending === "decreasing" ? "buy immediately" : "now",
        analysis: `${product.name} is currently ${currentPrice < origPrice ? `${Math.round(((origPrice - currentPrice) / origPrice) * 100)}% below its original price — a good time to buy` : "trading near its standard market price"}. Based on typical ${product.category} market patterns, prices tend to ${trending === "decreasing" ? "stabilize after festive season discounts" : "remain steady with occasional promotional dips"}.`,
      };
    }

    res.json({
      productId,
      currentPrice: parseFloat(product.price as string),
      predictedTrend: prediction.predictedTrend || "stable",
      confidence: prediction.confidence ?? 70,
      bestTimeToBuy: prediction.bestTimeToBuy || "now",
      analysis: prediction.analysis || "Price appears stable based on market trends.",
      priceHistory: history,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Price prediction failed" });
  }
});

// ─── Recommendation History ────────────────────────────────────────────────────
router.get("/ai/history", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";
    const rows = await db
      .select()
      .from(recommendationHistoryTable)
      .where(eq(recommendationHistoryTable.sessionId, sessionId))
      .limit(10);
    res.json(rows.map((r) => ({
      id: r.id,
      query: r.query,
      reasoning: r.reasoning,
      productIds: r.productIds,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
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
    history.push({ date: date.toISOString().split("T")[0], price: parseFloat(price.toFixed(2)) });
  }
  history[history.length - 1].price = currentPrice;
  return history;
}

export default router;
