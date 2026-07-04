package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.CartItem;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.model.RecommendationHistory;
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

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DashboardController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final RecommendationHistoryRepository recommendationHistoryRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardStats {
        private long totalProducts;
        private long totalCategories;
        private double avgAiScore;
        private long recommendationsToday;
        private long cartItems;
        private long wishlistItems;
        private double savedBudget;
        private String topCategory;
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getStats(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);

            long totalProducts = productRepository.count();
            long totalCategories = categoryRepository.count();

            List<Product> allProducts = productRepository.findAll();

            // Calculate average AI score
            double avgAiScore = 0.0;
            List<Product> scoredProducts = allProducts.stream()
                    .filter(p -> p.getAiScore() != null)
                    .collect(Collectors.toList());
            if (!scoredProducts.isEmpty()) {
                double sum = scoredProducts.stream()
                        .mapToDouble(Product::getAiScore)
                        .sum();
                avgAiScore = Math.round((sum / scoredProducts.size()) * 10.0) / 10.0;
            }

            // Calculate recommendations today
            Date startOfToday = Date.from(LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant());
            List<RecommendationHistory> recs = recommendationHistoryRepository.findBySessionId(sessionId);
            long recommendationsToday = recs.stream()
                    .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().after(startOfToday))
                    .count();

            // Calculate cart items (sum of quantity)
            List<CartItem> cartItemsList = cartRepository.findBySessionId(sessionId);
            long cartItems = cartItemsList.stream().mapToLong(CartItem::getQuantity).sum();

            // Calculate wishlist items
            long wishlistItems = wishlistRepository.findBySessionId(sessionId).size();

            // Calculate saved budget (sum of originalPrice - price)
            double savedBudget = 0.0;
            for (Product p : allProducts) {
                if (p.getOriginalPrice() != null && p.getPrice() != null && p.getOriginalPrice() > p.getPrice()) {
                    savedBudget += (p.getOriginalPrice() - p.getPrice());
                }
            }
            savedBudget = Math.round(savedBudget * 100.0) / 100.0;

            // Find top category
            String topCategory = "Electronics";
            if (!allProducts.isEmpty()) {
                Map<String, Long> catCounts = allProducts.stream()
                        .filter(p -> p.getCategory() != null)
                        .collect(Collectors.groupingBy(Product::getCategory, Collectors.counting()));
                topCategory = catCounts.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("Electronics");
            }

            DashboardStats stats = DashboardStats.builder()
                    .totalProducts(totalProducts)
                    .totalCategories(totalCategories)
                    .avgAiScore(avgAiScore)
                    .recommendationsToday(recommendationsToday)
                    .cartItems(cartItems)
                    .wishlistItems(wishlistItems)
                    .savedBudget(savedBudget)
                    .topCategory(topCategory)
                    .build();

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Failed to fetch dashboard stats: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendingCategory {
        private String category;
        private long count;
        private double avgPrice;
        private double avgScore;
    }

    @GetMapping("/trending")
    public ResponseEntity<List<TrendingCategory>> getTrending() {
        try {
            List<Product> products = productRepository.findAll();
            Map<String, List<Product>> byCategory = products.stream()
                    .filter(p -> p.getCategory() != null)
                    .collect(Collectors.groupingBy(Product::getCategory));

            List<TrendingCategory> trending = byCategory.entrySet().stream()
                    .map(entry -> {
                        String cat = entry.getKey();
                        List<Product> prods = entry.getValue();
                        double sumPrice = prods.stream().mapToDouble(Product::getPrice).sum();
                        double avgPrice = Math.round((sumPrice / prods.size()) * 100.0) / 100.0;

                        List<Product> scored = prods.stream()
                                .filter(p -> p.getAiScore() != null)
                                .collect(Collectors.toList());
                        double avgScore = 0.0;
                        if (!scored.isEmpty()) {
                            double sumScore = scored.stream().mapToDouble(Product::getAiScore).sum();
                            avgScore = Math.round((sumScore / scored.size()) * 10.0) / 10.0;
                        }

                        return TrendingCategory.builder()
                                .category(cat)
                                .count(prods.size())
                                .avgPrice(avgPrice)
                                .avgScore(avgScore)
                                .build();
                    })
                    .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                    .limit(8)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(trending);
        } catch (Exception e) {
            log.error("Failed to fetch trending categories: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriceAlert {
        private Integer productId;
        private String productName;
        private double originalPrice;
        private double currentPrice;
        private int discount;
        private String imageUrl;
    }

    @GetMapping("/price-alerts")
    public ResponseEntity<List<PriceAlert>> getPriceAlerts() {
        try {
            List<Product> products = productRepository.findAll();
            List<PriceAlert> alerts = products.stream()
                    .filter(p -> p.getOriginalPrice() != null && p.getOriginalPrice() > p.getPrice())
                    .map(p -> PriceAlert.builder()
                            .productId(p.getId())
                            .productName(p.getName())
                            .originalPrice(p.getOriginalPrice())
                            .currentPrice(p.getPrice())
                            .discount((int) Math.round(((p.getOriginalPrice() - p.getPrice()) / p.getOriginalPrice()) * 100.0))
                            .imageUrl(p.getImageUrl())
                            .build())
                    .limit(10)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("Failed to fetch price alerts: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
