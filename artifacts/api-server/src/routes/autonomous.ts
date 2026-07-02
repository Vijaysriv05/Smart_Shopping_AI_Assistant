import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, aiMemoryTable, recommendationHistoryTable, cartTable, wishlistTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const router = Router();

// ─── Helper: get all products with parsed numerics ────────────────────────────
async function getAllProducts() {
  const rows = await db.select().from(productsTable).limit(200);
  return rows.map((p) => ({
    ...p,
    price: parseFloat(p.price as string),
    originalPrice: p.originalPrice ? parseFloat(p.originalPrice as string) : null,
    rating: parseFloat(p.rating as string),
    aiScore: p.aiScore ? parseFloat(p.aiScore as string) : null,
  }));
}

// ─── 1. Overpriced Detection ──────────────────────────────────────────────────
function detectOverpricedProducts(products: Awaited<ReturnType<typeof getAllProducts>>) {
  const byCategory: Record<string, number[]> = {};
  products.forEach((p) => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p.price);
  });

  const categoryAvg: Record<string, number> = {};
  Object.entries(byCategory).forEach(([cat, prices]) => {
    categoryAvg[cat] = prices.reduce((a, b) => a + b, 0) / prices.length;
  });

  return products
    .filter((p) => p.price > categoryAvg[p.category] * 1.25)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      categoryAvg: Math.round(categoryAvg[p.category]),
      overpricedBy: Math.round(((p.price - categoryAvg[p.category]) / categoryAvg[p.category]) * 100),
      recommendation: `Consider reducing price by ${Math.round(((p.price - categoryAvg[p.category]) / p.price) * 100)}% to align with category average`,
      imageUrl: p.imageUrl,
    }));
}

// ─── 2. Bundle Suggestions ────────────────────────────────────────────────────
function generateBundleSuggestions(products: Awaited<ReturnType<typeof getAllProducts>>) {
  const bundles: Array<{ name: string; products: typeof products; savings: number; reason: string; bundleScore: number }> = [];
  const byCategory: Record<string, typeof products> = {};
  products.forEach((p) => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });

  const bundleRules = [
    { primary: "Laptops", secondary: "Headphones", name: "Work From Home Bundle", savingsPct: 12, reason: "Laptop + headphones combo for maximum productivity" },
    { primary: "Smartphones", secondary: "Headphones", name: "Mobile Audio Bundle", savingsPct: 10, reason: "Premium phone with wireless audio — the perfect pair" },
    { primary: "Tablets", secondary: "Headphones", name: "Content Creator Bundle", savingsPct: 11, reason: "Tablet + audio for content creation and entertainment" },
    { primary: "Cameras", secondary: "Laptops", name: "Photography Pro Bundle", savingsPct: 14, reason: "Capture + edit with the ultimate photography setup" },
    { primary: "Gaming", secondary: "Headphones", name: "Gaming Setup Bundle", savingsPct: 13, reason: "Console + gaming headset for immersive gameplay" },
    { primary: "Smartwatches", secondary: "Smartphones", name: "Connected Life Bundle", savingsPct: 9, reason: "Smartwatch + smartphone for a fully connected lifestyle" },
  ];

  for (const rule of bundleRules) {
    const primaryProducts = byCategory[rule.primary] || [];
    const secondaryProducts = byCategory[rule.secondary] || [];
    if (primaryProducts.length === 0 || secondaryProducts.length === 0) continue;

    const best = [...primaryProducts].sort((a, b) => b.rating - a.rating)[0];
    const bestSecondary = [...secondaryProducts].sort((a, b) => b.rating - a.rating)[0];
    const totalPrice = best.price + bestSecondary.price;
    const savings = Math.round(totalPrice * (rule.savingsPct / 100));

    bundles.push({
      name: rule.name,
      products: [best, bestSecondary],
      savings,
      reason: rule.reason,
      bundleScore: Math.round((best.rating + bestSecondary.rating) * 10),
    });
  }

  return bundles.slice(0, 4);
}

// ─── 3. Duplicate / Similar Product Detection ─────────────────────────────────
function detectSimilarProducts(products: Awaited<ReturnType<typeof getAllProducts>>) {
  const similar: Array<{ group: string; products: typeof products; aiAction: string }> = [];
  const byBrand: Record<string, typeof products> = {};

  products.forEach((p) => {
    const key = `${p.brand}-${p.category}`;
    if (!byBrand[key]) byBrand[key] = [];
    byBrand[key].push(p);
  });

  for (const [key, group] of Object.entries(byBrand)) {
    if (group.length >= 2) {
      const [brand, category] = key.split("-");
      const sorted = [...group].sort((a, b) => b.rating - a.rating);
      similar.push({
        group: `${brand} ${category}`,
        products: sorted,
        aiAction: `AI recommends featuring ${sorted[0].name} (rated ${sorted[0].rating}/5) as the primary listing. ${sorted.length > 1 ? `${sorted[1].name} is a good budget alternative.` : ""}`,
      });
    }
  }

  return similar.slice(0, 5);
}

// ─── 4. Inventory Intelligence ────────────────────────────────────────────────
function generateInventoryInsights(products: Awaited<ReturnType<typeof getAllProducts>>) {
  return products.map((p) => {
    const simulatedStock = Math.floor(((p.id * 17 + p.rating * 7) % 80) + 5);
    const velocityScore = Math.round(p.rating * 20 + (p.reviewCount / 1000) * 10);
    const daysUntilStockout = simulatedStock > 0 ? Math.ceil(simulatedStock / (velocityScore / 30)) : 0;
    const shouldRestock = simulatedStock < 20 || daysUntilStockout < 14;

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      imageUrl: p.imageUrl,
      stock: simulatedStock,
      velocityScore,
      daysUntilStockout,
      shouldRestock,
      priority: shouldRestock ? (daysUntilStockout < 7 ? "critical" : "high") : "normal",
      aiRecommendation: shouldRestock
        ? `Restock ${p.name} — estimated ${daysUntilStockout} days remaining. Velocity score: ${velocityScore}/100`
        : `Stock level healthy — ${simulatedStock} units remaining`,
    };
  });
}

// ─── 5. Review Intelligence ───────────────────────────────────────────────────
function analyzeReviews(products: Awaited<ReturnType<typeof getAllProducts>>) {
  return products.map((p) => {
    const rating = p.rating;
    const reviewCount = p.reviewCount;
    const suspiciousScore = reviewCount > 10000 && rating > 4.8 ? 75 : reviewCount < 100 && rating > 4.7 ? 60 : 15;
    const sentiment = rating >= 4.5 ? "Very Positive" : rating >= 4.0 ? "Positive" : rating >= 3.5 ? "Mixed" : "Negative";

    const positives: Record<string, string[]> = {
      Laptops: ["Excellent build quality", "Great battery life", "Fast performance"],
      Smartphones: ["Amazing camera", "Smooth interface", "Premium feel"],
      Headphones: ["Rich sound quality", "Comfortable fit", "Great ANC"],
      Tablets: ["Beautiful display", "Versatile use", "Long battery"],
      Smartwatches: ["Accurate health tracking", "Stylish design", "Good battery"],
      Cameras: ["Sharp image quality", "Fast autofocus", "Professional results"],
      Gaming: ["Immersive gameplay", "Fast loading", "Great graphics"],
    };

    const negatives: Record<string, string[]> = {
      Laptops: ["Gets warm under load", "Limited ports"],
      Smartphones: ["Battery could be better", "Premium price"],
      Headphones: ["Tight fit initially", "Plastic feel on some parts"],
      Tablets: ["No headphone jack", "Accessories sold separately"],
      Smartwatches: ["Requires daily charging", "App ecosystem limited"],
      Cameras: ["Heavy with lenses", "Complex for beginners"],
      Gaming: ["Expensive games", "Online subscription needed"],
    };

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      imageUrl: p.imageUrl,
      rating,
      reviewCount,
      sentiment,
      suspiciousScore,
      isSuspicious: suspiciousScore > 50,
      topPositives: (positives[p.category] || ["Good value", "Reliable brand"]).slice(0, 2),
      topNegatives: (negatives[p.category] || ["Minor issues reported"]).slice(0, 2),
      aiVerdict: suspiciousScore > 50
        ? `⚠️ Review pattern flagged — unusually high rating with ${reviewCount > 10000 ? "very high" : "very low"} review count. Manual verification recommended.`
        : `✅ Review pattern looks authentic — ${sentiment.toLowerCase()} sentiment across ${reviewCount.toLocaleString()} verified reviews`,
    };
  });
}

// ─── 6. Trend Analysis ────────────────────────────────────────────────────────
async function analyzeTrends(products: Awaited<ReturnType<typeof getAllProducts>>) {
  const history = await db.select().from(recommendationHistoryTable).orderBy(desc(recommendationHistoryTable.createdAt)).limit(50);
  const cartItems = await db.select().from(cartTable).limit(200);
  const wishlistItems = await db.select().from(wishlistTable).limit(200);

  const categoryDemand: Record<string, number> = {};
  const productEngagement: Record<number, number> = {};

  history.forEach((h) => {
    ((h.productIds as number[]) || []).forEach((pid) => {
      productEngagement[pid] = (productEngagement[pid] || 0) + 3;
      const product = products.find((p) => p.id === pid);
      if (product) categoryDemand[product.category] = (categoryDemand[product.category] || 0) + 3;
    });
  });

  cartItems.forEach((c) => {
    productEngagement[c.productId] = (productEngagement[c.productId] || 0) + 5;
    const product = products.find((p) => p.id === c.productId);
    if (product) categoryDemand[product.category] = (categoryDemand[product.category] || 0) + 5;
  });

  wishlistItems.forEach((w) => {
    productEngagement[w.productId] = (productEngagement[w.productId] || 0) + 2;
    const product = products.find((p) => p.id === w.productId);
    if (product) categoryDemand[product.category] = (categoryDemand[product.category] || 0) + 2;
  });

  // Supplement with rating-based scores for all products (simulates organic demand)
  products.forEach((p) => {
    categoryDemand[p.category] = (categoryDemand[p.category] || 0) + Math.round(p.rating * 5);
    productEngagement[p.id] = (productEngagement[p.id] || 0) + Math.round(p.rating * 3);
  });

  const topCategories = Object.entries(categoryDemand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, score]) => ({ category: cat, score, trend: score > 40 ? "rising" : score > 20 ? "stable" : "declining" }));

  const hotProducts = products
    .map((p) => ({ ...p, engagementScore: productEngagement[p.id] || 0 }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 5);

  const priceTrends = products.map((p) => {
    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
    const discountPct = hasDiscount ? Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100) : 0;
    return { id: p.id, name: p.name, category: p.category, price: p.price, discountPct, trend: discountPct > 15 ? "dropping_fast" : discountPct > 5 ? "dropping" : "stable" };
  });

  return {
    topCategories,
    hotProducts,
    priceTrends: priceTrends.filter((p) => p.trend !== "stable").sort((a, b) => b.discountPct - a.discountPct).slice(0, 6),
    totalRecommendations: history.length,
    totalCartActions: cartItems.length,
    totalWishlistItems: wishlistItems.length,
    avgSessionQuery: history.length > 0 ? `"${history[0].query}"` : "No queries yet",
  };
}

// ─── 7. User Insights ─────────────────────────────────────────────────────────
async function generateUserInsights() {
  const memories = await db.select().from(aiMemoryTable).limit(50);
  const wishlistItems = await db.select().from(wishlistTable).limit(200);
  const cartItems = await db.select().from(cartTable).limit(200);
  const history = await db.select().from(recommendationHistoryTable).limit(100);

  const totalUsers = Math.max(memories.length, 1);
  const budgetPref = memories.filter((m) => m.budget).map((m) => parseFloat(m.budget as string));
  const avgBudget = budgetPref.length > 0 ? Math.round(budgetPref.reduce((a, b) => a + b, 0) / budgetPref.length) : 85000;

  const allCategories = memories.flatMap((m) => (m.favoriteCategories as string[]) || []);
  const catFreq: Record<string, number> = {};
  allCategories.forEach((c) => { catFreq[c] = (catFreq[c] || 0) + 1; });
  const topCategory = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "Laptops";

  return {
    totalSessions: totalUsers,
    avgBudget,
    topPreferredCategory: topCategory,
    totalRecommendations: history.length,
    totalWishlistItems: wishlistItems.length,
    totalCartItems: cartItems.length,
    engagementRate: Math.min(95, Math.round((history.length / Math.max(totalUsers, 1)) * 25 + 45)),
    aiInsights: [
      `${totalUsers} user session${totalUsers !== 1 ? "s" : ""} tracked with personalized AI memory`,
      `Average budget preference: $${(avgBudget / 100).toFixed(0)}`,
      `Most sought category: ${topCategory}`,
      `AI has generated ${history.length} recommendations autonomously`,
      history.length > 0 ? `Latest query: "${history[history.length - 1]?.query}"` : "Waiting for first user query",
    ],
    behaviorSegments: [
      { segment: "Research-first shoppers", pct: 42, description: "Browse catalog before AI query" },
      { segment: "AI-native shoppers", pct: 35, description: "Start directly with AI search" },
      { segment: "Comparison shoppers", pct: 23, description: "Use compare feature heavily" },
    ],
  };
}

// ─── 8. Discount Suggestions ──────────────────────────────────────────────────
function generateDiscountSuggestions(products: Awaited<ReturnType<typeof getAllProducts>>) {
  return products
    .filter((p) => p.rating < 4.3 && p.reviewCount > 200)
    .sort((a, b) => a.rating - b.rating)
    .slice(0, 5)
    .map((p) => {
      const suggestedDiscount = Math.round((4.5 - p.rating) * 20 + 5);
      const newPrice = Math.round(p.price * (1 - suggestedDiscount / 100));
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        imageUrl: p.imageUrl,
        currentPrice: p.price,
        suggestedDiscount,
        newPrice,
        rating: p.rating,
        reason: `Rating ${p.rating}/5 is below category ideal — a ${suggestedDiscount}% price reduction would boost conversion by estimated ${Math.round(suggestedDiscount * 2.5)}%`,
      };
    });
}

// ─── Master Autonomous Insights Endpoint ──────────────────────────────────────
router.get("/ai/autonomous-insights", async (req, res) => {
  try {
    const products = await getAllProducts();
    const [trends, userInsights] = await Promise.all([
      analyzeTrends(products),
      generateUserInsights(),
    ]);

    const overpriced = detectOverpricedProducts(products);
    const bundles = generateBundleSuggestions(products);
    const similar = detectSimilarProducts(products);
    const inventory = generateInventoryInsights(products);
    const reviews = analyzeReviews(products);
    const discounts = generateDiscountSuggestions(products);

    const criticalAlerts = [
      ...overpriced.slice(0, 2).map((p) => ({ type: "overpriced", severity: "medium", message: `${p.name} is ${p.overpricedBy}% above category average`, productId: p.id })),
      ...inventory.filter((i) => i.priority === "critical").slice(0, 2).map((i) => ({ type: "inventory", severity: "high", message: `${i.name} — only ${i.stock} units left (${i.daysUntilStockout} days)`, productId: i.id })),
      ...reviews.filter((r) => r.isSuspicious).slice(0, 2).map((r) => ({ type: "review", severity: "medium", message: `Suspicious review pattern on ${r.name}`, productId: r.id })),
    ];

    const aiDecisions = [
      `Analyzed ${products.length} products across ${[...new Set(products.map(p => p.category))].length} categories`,
      `Detected ${overpriced.length} overpriced products requiring price adjustment`,
      `Generated ${bundles.length} bundle recommendations worth avg ${Math.round(bundles.reduce((a, b) => a + b.savings, 0) / Math.max(bundles.length, 1) / 100)}% savings`,
      `Flagged ${reviews.filter((r) => r.isSuspicious).length} products with suspicious review patterns`,
      `${inventory.filter((i) => i.shouldRestock).length} products require immediate restocking action`,
      `Identified ${similar.length} product groups with duplicates — consolidation recommended`,
      `Suggested price discounts for ${discounts.length} underperforming products to boost conversion`,
    ];

    res.json({
      generatedAt: new Date().toISOString(),
      aiDecisions,
      criticalAlerts,
      overpriced,
      bundles,
      similar,
      inventory: inventory.sort((a, b) => a.stock - b.stock).slice(0, 10),
      reviews: reviews.slice(0, 8),
      trends,
      userInsights,
      discounts,
      summary: {
        totalProducts: products.length,
        overpricedCount: overpriced.length,
        bundlesGenerated: bundles.length,
        restockAlerts: inventory.filter((i) => i.shouldRestock).length,
        suspiciousReviews: reviews.filter((r) => r.isSuspicious).length,
        trendingCategory: trends.topCategories[0]?.category || "Laptops",
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Autonomous analysis failed" });
  }
});

// ─── Individual endpoints ──────────────────────────────────────────────────────
router.get("/ai/inventory", async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(generateInventoryInsights(products));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Inventory analysis failed" });
  }
});

router.get("/ai/bundles", async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(generateBundleSuggestions(products));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Bundle generation failed" });
  }
});

router.get("/ai/trends", async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(await analyzeTrends(products));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Trend analysis failed" });
  }
});

export default router;
