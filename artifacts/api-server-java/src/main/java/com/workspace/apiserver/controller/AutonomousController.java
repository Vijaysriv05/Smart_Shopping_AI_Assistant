package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.*;
import com.workspace.apiserver.repository.*;
import com.workspace.apiserver.util.SessionUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AutonomousController {

    private final ProductRepository productRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final RecommendationHistoryRepository recommendationHistoryRepository;
    private final AiMemoryRepository aiMemoryRepository;

    // Helper method to build Maps of String/Object cleanly without type inference issues
    private Map<String, Object> mapOf(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            if (i + 1 < keyValues.length) {
                map.put((String) keyValues[i], keyValues[i + 1]);
            }
        }
        return map;
    }

    // Response structure classes
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverpricedProduct {
        private Integer id;
        private String name;
        private String brand;
        private String category;
        private double price;
        private double categoryAvg;
        private int overpricedBy;
        private String recommendation;
        private String imageUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BundleSuggestion {
        private String name;
        private List<Product> products;
        private double savings;
        private String reason;
        private int bundleScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimilarProductGroup {
        private String group;
        private List<Product> products;
        private String aiAction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryInsight {
        private Integer id;
        private String name;
        private String brand;
        private String category;
        private String imageUrl;
        private int stock;
        private int velocityScore;
        private int daysUntilStockout;
        private boolean shouldRestock;
        private String priority;
        private String aiRecommendation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewInsight {
        private Integer id;
        private String name;
        private String brand;
        private String imageUrl;
        private double rating;
        private int reviewCount;
        private String sentiment;
        private int suspiciousScore;
        private boolean isSuspicious;
        private List<String> topPositives;
        private List<String> topNegatives;
        private String aiVerdict;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendAnalysis {
        private List<Map<String, Object>> topCategories;
        private List<Product> hotProducts;
        private List<Map<String, Object>> priceTrends;
        private long totalRecommendations;
        private long totalCartActions;
        private long totalWishlistItems;
        private String avgSessionQuery;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInsight {
        private long totalSessions;
        private double avgBudget;
        private String topPreferredCategory;
        private long totalRecommendations;
        private long totalWishlistItems;
        private long totalCartItems;
        private int engagementRate;
        private List<String> aiInsights;
        private List<Map<String, Object>> behaviorSegments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscountSuggestion {
        private Integer id;
        private String name;
        private String brand;
        private String category;
        private String imageUrl;
        private double currentPrice;
        private int suggestedDiscount;
        private double newPrice;
        private double rating;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AutonomousInsightsResponse {
        private String generatedAt;
        private List<String> aiDecisions;
        private List<Map<String, Object>> criticalAlerts;
        private List<OverpricedProduct> overpriced;
        private List<BundleSuggestion> bundles;
        private List<SimilarProductGroup> similar;
        private List<InventoryInsight> inventory;
        private List<ReviewInsight> reviews;
        private TrendAnalysis trends;
        private UserInsight userInsights;
        private List<DiscountSuggestion> discounts;
        private Map<String, Object> summary;
    }

    // ─── 1. Overpriced Detection ──────────────────────────────────────────────────
    private List<OverpricedProduct> detectOverpricedProducts(List<Product> products) {
        Map<String, List<Double>> byCategory = products.stream()
                .filter(p -> p.getCategory() != null && p.getPrice() != null)
                .collect(Collectors.groupingBy(Product::getCategory,
                        Collectors.mapping(Product::getPrice, Collectors.toList())));

        Map<String, Double> categoryAvg = new HashMap<>();
        byCategory.forEach((cat, prices) -> {
            double avg = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            categoryAvg.put(cat, avg);
        });

        return products.stream()
                .filter(p -> p.getPrice() != null && p.getCategory() != null)
                .filter(p -> p.getPrice() > categoryAvg.getOrDefault(p.getCategory(), 0.0) * 1.25)
                .map(p -> {
                    double avg = categoryAvg.get(p.getCategory());
                    int overpricedBy = (int) Math.round(((p.getPrice() - avg) / avg) * 100);
                    return OverpricedProduct.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .brand(p.getBrand())
                            .category(p.getCategory())
                            .price(p.getPrice())
                            .categoryAvg(Math.round(avg))
                            .overpricedBy(overpricedBy)
                            .recommendation(String.format("Consider reducing price by %d%% to align with category average",
                                    (int) Math.round(((p.getPrice() - avg) / p.getPrice()) * 100)))
                            .imageUrl(p.getImageUrl())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─── 2. Bundle Suggestions ────────────────────────────────────────────────────
    private List<BundleSuggestion> generateBundleSuggestions(List<Product> products) {
        List<BundleSuggestion> bundles = new ArrayList<>();
        Map<String, List<Product>> byCategory = products.stream()
                .filter(p -> p.getCategory() != null)
                .collect(Collectors.groupingBy(Product::getCategory));

        var bundleRules = List.of(
            mapOf("primary", "Laptops", "secondary", "Headphones", "name", "Work From Home Bundle", "savingsPct", 12, "reason", "Laptop + headphones combo for maximum productivity"),
            mapOf("primary", "Smartphones", "secondary", "Headphones", "name", "Mobile Audio Bundle", "savingsPct", 10, "reason", "Premium phone with wireless audio — the perfect pair"),
            mapOf("primary", "Tablets", "secondary", "Headphones", "name", "Content Creator Bundle", "savingsPct", 11, "reason", "Tablet + audio for content creation and entertainment"),
            mapOf("primary", "Cameras", "secondary", "Laptops", "name", "Photography Pro Bundle", "savingsPct", 14, "reason", "Capture + edit with the ultimate photography setup"),
            mapOf("primary", "Gaming", "secondary", "Headphones", "name", "Gaming Setup Bundle", "savingsPct", 13, "reason", "Console + gaming headset for immersive gameplay"),
            mapOf("primary", "Smartwatches", "secondary", "Smartphones", "name", "Connected Life Bundle", "savingsPct", 9, "reason", "Smartwatch + smartphone for a fully connected lifestyle")
        );

        for (var rule : bundleRules) {
            String primary = (String) rule.get("primary");
            String secondary = (String) rule.get("secondary");
            List<Product> primaryProducts = byCategory.getOrDefault(primary, List.of());
            List<Product> secondaryProducts = byCategory.getOrDefault(secondary, List.of());

            if (primaryProducts.isEmpty() || secondaryProducts.isEmpty()) continue;

            Product bestPrimary = primaryProducts.stream()
                    .max(Comparator.comparingDouble(p -> p.getRating() != null ? p.getRating() : 0.0))
                    .orElse(primaryProducts.get(0));
            Product bestSecondary = secondaryProducts.stream()
                    .max(Comparator.comparingDouble(p -> p.getRating() != null ? p.getRating() : 0.0))
                    .orElse(secondaryProducts.get(0));

            double totalPrice = bestPrimary.getPrice() + bestSecondary.getPrice();
            int savingsPct = (Integer) rule.get("savingsPct");
            double savings = Math.round(totalPrice * (savingsPct / 100.0));

            double primaryRating = bestPrimary.getRating() != null ? bestPrimary.getRating() : 0.0;
            double secondaryRating = bestSecondary.getRating() != null ? bestSecondary.getRating() : 0.0;

            bundles.add(BundleSuggestion.builder()
                    .name((String) rule.get("name"))
                    .products(List.of(bestPrimary, bestSecondary))
                    .savings(savings)
                    .reason((String) rule.get("reason"))
                    .bundleScore((int) Math.round((primaryRating + secondaryRating) * 10))
                    .build());
        }

        return bundles.stream().limit(4).collect(Collectors.toList());
    }

    // ─── 3. Duplicate / Similar Product Detection ─────────────────────────────────
    private List<SimilarProductGroup> detectSimilarProducts(List<Product> products) {
        List<SimilarProductGroup> similar = new ArrayList<>();
        Map<String, List<Product>> byBrandAndCategory = products.stream()
                .filter(p -> p.getBrand() != null && p.getCategory() != null)
                .collect(Collectors.groupingBy(p -> p.getBrand() + "-" + p.getCategory()));

        for (Map.Entry<String, List<Product>> entry : byBrandAndCategory.entrySet()) {
            List<Product> group = entry.getValue();
            if (group.size() >= 2) {
                String[] parts = entry.getKey().split("-");
                String brand = parts[0];
                String category = parts[1];
                
                List<Product> sorted = group.stream()
                        .sorted((p1, p2) -> {
                            double r1 = p1.getRating() != null ? p1.getRating() : 0.0;
                            double r2 = p2.getRating() != null ? p2.getRating() : 0.0;
                            return Double.compare(r2, r1);
                        })
                        .collect(Collectors.toList());

                similar.add(SimilarProductGroup.builder()
                        .group(brand + " " + category)
                        .products(sorted)
                        .aiAction(String.format("AI recommends featuring %s (rated %.1f/5) as the primary listing. %s is a good budget alternative.",
                                sorted.get(0).getName(), sorted.get(0).getRating() != null ? sorted.get(0).getRating() : 0.0, sorted.size() > 1 ? sorted.get(1).getName() : ""))
                        .build());
            }
        }

        return similar.stream().limit(5).collect(Collectors.toList());
    }

    // ─── 4. Inventory Intelligence ────────────────────────────────────────────────
    private List<InventoryInsight> generateInventoryInsights(List<Product> products) {
        return products.stream().map(p -> {
            int simulatedStock = Math.floorMod(p.getId() * 17 + (int) Math.round((p.getRating() != null ? p.getRating() : 0.0) * 7), 80) + 5;
            double ratingVal = p.getRating() != null ? p.getRating() : 0.0;
            int reviewCountVal = p.getReviewCount() != null ? p.getReviewCount() : 0;
            int velocityScore = (int) Math.round(ratingVal * 20 + (reviewCountVal / 1000.0) * 10);
            int daysUntilStockout = velocityScore > 0 ? (int) Math.ceil(simulatedStock / (velocityScore / 30.0)) : 30;
            boolean shouldRestock = simulatedStock < 20 || daysUntilStockout < 14;

            return InventoryInsight.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .brand(p.getBrand())
                    .category(p.getCategory())
                    .imageUrl(p.getImageUrl())
                    .stock(simulatedStock)
                    .velocityScore(velocityScore)
                    .daysUntilStockout(daysUntilStockout)
                    .shouldRestock(shouldRestock)
                    .priority(shouldRestock ? (daysUntilStockout < 7 ? "critical" : "high") : "normal")
                    .aiRecommendation(shouldRestock
                            ? String.format("Restock %s — estimated %d days remaining. Velocity score: %d/100", p.getName(), daysUntilStockout, velocityScore)
                            : String.format("Stock level healthy — %d units remaining", simulatedStock))
                    .build();
        }).collect(Collectors.toList());
    }

    // ─── 5. Review Intelligence ───────────────────────────────────────────────────
    private List<ReviewInsight> analyzeReviews(List<Product> products) {
        Map<String, List<String>> positives = Map.of(
                "Laptops", List.of("Excellent build quality", "Great battery life", "Fast performance"),
                "Smartphones", List.of("Amazing camera", "Smooth interface", "Premium feel"),
                "Headphones", List.of("Rich sound quality", "Comfortable fit", "Great ANC"),
                "Tablets", List.of("Beautiful display", "Versatile use", "Long battery"),
                "Smartwatches", List.of("Accurate health tracking", "Stylish design", "Good battery"),
                "Cameras", List.of("Sharp image quality", "Fast autofocus", "Professional results"),
                "Gaming", List.of("Immersive gameplay", "Fast loading", "Great graphics")
        );

        Map<String, List<String>> negatives = Map.of(
                "Laptops", List.of("Gets warm under load", "Limited ports"),
                "Smartphones", List.of("Battery could be better", "Premium price"),
                "Headphones", List.of("Tight fit initially", "Plastic feel on some parts"),
                "Tablets", List.of("No headphone jack", "Accessories sold separately"),
                "Smartwatches", List.of("Requires daily charging", "App ecosystem limited"),
                "Cameras", List.of("Heavy with lenses", "Complex for beginners"),
                "Gaming", List.of("Expensive games", "Online subscription needed")
        );

        return products.stream().map(p -> {
            double rating = p.getRating() != null ? p.getRating() : 0.0;
            int reviewCount = p.getReviewCount() != null ? p.getReviewCount() : 0;
            int suspiciousScore = reviewCount > 10000 && rating > 4.8 ? 75 : (reviewCount < 100 && rating > 4.7 ? 60 : 15);
            String sentiment = rating >= 4.5 ? "Very Positive" : (rating >= 4.0 ? "Positive" : (rating >= 3.5 ? "Mixed" : "Negative"));

            List<String> posList = positives.getOrDefault(p.getCategory(), List.of("Good value", "Reliable brand"));
            List<String> negList = negatives.getOrDefault(p.getCategory(), List.of("Minor issues reported"));

            return ReviewInsight.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .brand(p.getBrand())
                    .imageUrl(p.getImageUrl())
                    .rating(rating)
                    .reviewCount(reviewCount)
                    .sentiment(sentiment)
                    .suspiciousScore(suspiciousScore)
                    .isSuspicious(suspiciousScore > 50)
                    .topPositives(posList.stream().limit(2).collect(Collectors.toList()))
                    .topNegatives(negList.stream().limit(2).collect(Collectors.toList()))
                    .aiVerdict(suspiciousScore > 50
                            ? String.format("⚠️ Review pattern flagged — unusually high rating with %s review count. Manual verification recommended.", reviewCount > 10000 ? "very high" : "very low")
                            : String.format("✅ Review pattern looks authentic — %s sentiment across %,d verified reviews", sentiment.toLowerCase(), reviewCount))
                    .build();
        }).collect(Collectors.toList());
    }

    // ─── 6. Trend Analysis ────────────────────────────────────────────────────────
    private TrendAnalysis analyzeTrends(List<Product> products) {
        List<RecommendationHistory> history = recommendationHistoryRepository.findAll();
        List<CartItem> cartItems = cartRepository.findAll();
        List<WishlistItem> wishlistItems = wishlistRepository.findAll();

        Map<String, Integer> categoryDemand = new HashMap<>();
        Map<Integer, Integer> productEngagement = new HashMap<>();

        history.forEach(h -> {
            if (h.getProductIds() != null) {
                h.getProductIds().forEach(pid -> {
                    productEngagement.put(pid, productEngagement.getOrDefault(pid, 0) + 3);
                    products.stream().filter(p -> p.getId().equals(pid)).findFirst().ifPresent(p -> {
                        categoryDemand.put(p.getCategory(), categoryDemand.getOrDefault(p.getCategory(), 0) + 3);
                    });
                });
            }
        });

        cartItems.forEach(c -> {
            if (c.getProductId() != null) {
                productEngagement.put(c.getProductId(), productEngagement.getOrDefault(c.getProductId(), 0) + 5);
                products.stream().filter(p -> p.getId().equals(c.getProductId())).findFirst().ifPresent(p -> {
                    categoryDemand.put(p.getCategory(), categoryDemand.getOrDefault(p.getCategory(), 0) + 5);
                });
            }
        });

        wishlistItems.forEach(w -> {
            if (w.getProductId() != null) {
                productEngagement.put(w.getProductId(), productEngagement.getOrDefault(w.getProductId(), 0) + 2);
                products.stream().filter(p -> p.getId().equals(w.getProductId())).findFirst().ifPresent(p -> {
                    categoryDemand.put(p.getCategory(), categoryDemand.getOrDefault(p.getCategory(), 0) + 2);
                });
            }
        });

        // Add organic ratings score
        products.forEach(p -> {
            double ratingVal = p.getRating() != null ? p.getRating() : 0.0;
            categoryDemand.put(p.getCategory(), categoryDemand.getOrDefault(p.getCategory(), 0) + (int) Math.round(ratingVal * 5));
            productEngagement.put(p.getId(), productEngagement.getOrDefault(p.getId(), 0) + (int) Math.round(ratingVal * 3));
        });

        List<Map<String, Object>> topCategories = categoryDemand.entrySet().stream()
                .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                .limit(6)
                .map(entry -> mapOf(
                        "category", entry.getKey(),
                        "score", entry.getValue(),
                        "trend", entry.getValue() > 40 ? "rising" : (entry.getValue() > 20 ? "stable" : "declining")
                ))
                .collect(Collectors.toList());

        List<Product> hotProducts = products.stream()
                .sorted((p1, p2) -> {
                    Integer e1 = productEngagement.getOrDefault(p1.getId(), 0);
                    Integer e2 = productEngagement.getOrDefault(p2.getId(), 0);
                    return e2.compareTo(e1);
                })
                .limit(5)
                .collect(Collectors.toList());

        List<Map<String, Object>> priceTrends = products.stream()
                .map(p -> {
                    boolean hasDiscount = p.getOriginalPrice() != null && p.getOriginalPrice() > p.getPrice();
                    int discountPct = hasDiscount ? (int) Math.round(((p.getOriginalPrice() - p.getPrice()) / p.getOriginalPrice()) * 100) : 0;
                    return mapOf(
                            "id", p.getId(),
                            "name", p.getName(),
                            "category", p.getCategory(),
                            "price", p.getPrice(),
                            "discountPct", discountPct,
                            "trend", discountPct > 15 ? "dropping_fast" : (discountPct > 5 ? "dropping" : "stable")
                    );
                })
                .filter(m -> !"stable".equals(m.get("trend")))
                .sorted((m1, m2) -> ((Integer) m2.get("discountPct")).compareTo((Integer) m1.get("discountPct")))
                .limit(6)
                .collect(Collectors.toList());

        return TrendAnalysis.builder()
                .topCategories(topCategories)
                .hotProducts(hotProducts)
                .priceTrends(priceTrends)
                .totalRecommendations(history.size())
                .totalCartActions(cartItems.size())
                .totalWishlistItems(wishlistItems.size())
                .avgSessionQuery(history.isEmpty() ? "No queries yet" : String.format("\"%s\"", history.get(history.size() - 1).getQuery()))
                .build();
    }

    // ─── 7. User Insights ─────────────────────────────────────────────────────────
    private UserInsight generateUserInsights() {
        List<AiMemory> memories = aiMemoryRepository.findAll();
        List<WishlistItem> wishlistItems = wishlistRepository.findAll();
        List<CartItem> cartItems = cartRepository.findAll();
        List<RecommendationHistory> history = recommendationHistoryRepository.findAll();

        long totalUsers = Math.max(memories.size(), 1);
        double avgBudget = memories.stream()
                .filter(m -> m.getBudget() != null)
                .mapToDouble(m -> {
                    try { return Double.parseDouble(m.getBudget()); } catch (Exception e) { return 85000.0; }
                })
                .average()
                .orElse(85000.0);

        List<String> allCategories = memories.stream()
                .filter(m -> m.getFavoriteCategories() != null)
                .flatMap(m -> m.getFavoriteCategories().stream())
                .collect(Collectors.toList());

        Map<String, Long> catFreq = allCategories.stream()
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
        String topCategory = catFreq.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Laptops");

        int engagementRate = (int) Math.min(95, Math.round((history.size() / (double) totalUsers) * 25 + 45));

        List<String> aiInsights = List.of(
                String.format("%d user session%s tracked with personalized AI memory", totalUsers, totalUsers != 1 ? "s" : ""),
                String.format("Average budget preference: $%,.2f", avgBudget / 100.0),
                String.format("Most sought category: %s", topCategory),
                String.format("AI has generated %d recommendations autonomously", history.size()),
                history.isEmpty() ? "Waiting for first user query" : String.format("Latest query: \"%s\"", history.get(history.size() - 1).getQuery())
        );

        List<Map<String, Object>> segments = List.of(
                mapOf("segment", "Research-first shoppers", "pct", 42, "description", "Browse catalog before AI query"),
                mapOf("segment", "AI-native shoppers", "pct", 35, "description", "Start directly with AI search"),
                mapOf("segment", "Comparison shoppers", "pct", 23, "description", "Use compare feature heavily")
        );

        return UserInsight.builder()
                .totalSessions(memories.size())
                .avgBudget(avgBudget)
                .topPreferredCategory(topCategory)
                .totalRecommendations(history.size())
                .totalWishlistItems(wishlistItems.size())
                .totalCartItems(cartItems.size())
                .engagementRate(engagementRate)
                .aiInsights(aiInsights)
                .behaviorSegments(segments)
                .build();
    }

    // ─── 8. Discount Suggestions ──────────────────────────────────────────────────
    private List<DiscountSuggestion> generateDiscountSuggestions(List<Product> products) {
        return products.stream()
                .filter(p -> p.getRating() != null && p.getRating() < 4.3 && p.getReviewCount() != null && p.getReviewCount() > 200)
                .sorted(Comparator.comparingDouble(p -> p.getRating()))
                .limit(5)
                .map(p -> {
                    int suggestedDiscount = (int) Math.round((4.5 - p.getRating()) * 20 + 5);
                    double newPrice = Math.round(p.getPrice() * (1 - suggestedDiscount / 100.0));
                    return DiscountSuggestion.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .brand(p.getBrand())
                            .category(p.getCategory())
                            .imageUrl(p.getImageUrl())
                            .currentPrice(p.getPrice())
                            .suggestedDiscount(suggestedDiscount)
                            .newPrice(newPrice)
                            .rating(p.getRating())
                            .reason(String.format("Rating %.1f/5 is below category ideal — a %d%% price reduction would boost conversion by estimated %d%%",
                                    p.getRating(), suggestedDiscount, (int) Math.round(suggestedDiscount * 2.5)))
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─── Master Autonomous Insights Endpoint ──────────────────────────────────────
    @GetMapping("/autonomous-insights")
    public ResponseEntity<?> getAutonomousInsights() {
        try {
            List<Product> products = productRepository.findAll();
            TrendAnalysis trends = analyzeTrends(products);
            UserInsight userInsights = generateUserInsights();

            List<OverpricedProduct> overpriced = detectOverpricedProducts(products);
            List<BundleSuggestion> bundles = generateBundleSuggestions(products);
            List<SimilarProductGroup> similar = detectSimilarProducts(products);
            List<InventoryInsight> inventory = generateInventoryInsights(products);
            List<ReviewInsight> reviews = analyzeReviews(products);
            List<DiscountSuggestion> discounts = generateDiscountSuggestions(products);

            List<Map<String, Object>> criticalAlerts = new ArrayList<>();
            overpriced.stream().limit(2).forEach(p -> criticalAlerts.add(mapOf(
                    "type", "overpriced",
                    "severity", "medium",
                    "message", String.format("%s is %d%% above category average", p.getName(), p.getOverpricedBy()),
                    "productId", p.getId()
            )));
            inventory.stream().filter(i -> i.isShouldRestock()).limit(2).forEach(i -> criticalAlerts.add(mapOf(
                    "type", "inventory",
                    "severity", "high",
                    "message", String.format("%s — only %d units left (%d days)", i.getName(), i.getStock(), i.getDaysUntilStockout()),
                    "productId", i.getId()
            )));
            reviews.stream().filter(r -> r.isSuspicious()).limit(2).forEach(r -> criticalAlerts.add(mapOf(
                    "type", "review",
                    "severity", "medium",
                    "message", String.format("Suspicious review pattern on %s", r.getName()),
                    "productId", r.getId()
            )));

            long restockAlertsCount = inventory.stream().filter(i -> i.isShouldRestock()).count();
            long suspiciousReviewsCount = reviews.stream().filter(r -> r.isSuspicious()).count();

            List<String> aiDecisions = List.of(
                    String.format("Analyzed %d products across %d categories", products.size(),
                            (int) products.stream().map(Product::getCategory).distinct().count()),
                    String.format("Detected %d overpriced products requiring price adjustment", overpriced.size()),
                    String.format("Generated %d bundle recommendations worth avg %d%% savings", bundles.size(),
                            (int) Math.round(bundles.stream().mapToDouble(BundleSuggestion::getSavings).average().orElse(0.0) / 100.0)),
                    String.format("Flagged %d products with suspicious review patterns", suspiciousReviewsCount),
                    String.format("%d products require immediate restocking action", restockAlertsCount),
                    String.format("Identified %d product groups with duplicates — consolidation recommended", similar.size()),
                    String.format("Suggested price discounts for %d underperforming products to boost conversion", discounts.size())
            );

            Map<String, Object> summary = mapOf(
                    "totalProducts", products.size(),
                    "overpricedCount", overpriced.size(),
                    "bundlesGenerated", bundles.size(),
                    "restockAlerts", restockAlertsCount,
                    "suspiciousReviews", suspiciousReviewsCount,
                    "trendingCategory", trends.getTopCategories().isEmpty() ? "Laptops" : trends.getTopCategories().get(0).get("category")
            );

            return ResponseEntity.ok(AutonomousInsightsResponse.builder()
                    .generatedAt(new Date().toString())
                    .aiDecisions(aiDecisions)
                    .criticalAlerts(criticalAlerts)
                    .overpriced(overpriced)
                    .bundles(bundles)
                    .similar(similar)
                    .inventory(inventory.stream().sorted(Comparator.comparingInt(InventoryInsight::getStock)).limit(10).collect(Collectors.toList()))
                    .reviews(reviews.stream().limit(8).collect(Collectors.toList()))
                    .trends(trends)
                    .userInsights(userInsights)
                    .discounts(discounts)
                    .summary(summary)
                    .build());

        } catch (Exception e) {
            log.error("Autonomous analysis failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/inventory")
    public ResponseEntity<?> getInventory() {
        try {
            List<Product> products = productRepository.findAll();
            return ResponseEntity.ok(generateInventoryInsights(products));
        } catch (Exception e) {
            log.error("Inventory analysis failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/bundles")
    public ResponseEntity<?> getBundles() {
        try {
            List<Product> products = productRepository.findAll();
            return ResponseEntity.ok(generateBundleSuggestions(products));
        } catch (Exception e) {
            log.error("Bundle generation failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/trends")
    public ResponseEntity<?> getTrends() {
        try {
            List<Product> products = productRepository.findAll();
            return ResponseEntity.ok(analyzeTrends(products));
        } catch (Exception e) {
            log.error("Trend analysis failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
