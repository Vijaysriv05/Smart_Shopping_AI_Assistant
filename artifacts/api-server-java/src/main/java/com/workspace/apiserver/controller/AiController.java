package com.workspace.apiserver.controller;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.apiserver.model.*;
import com.workspace.apiserver.repository.*;
import com.workspace.apiserver.service.AiService;
import com.workspace.apiserver.util.JwtUtils;
import com.workspace.apiserver.util.PromptTemplates;
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
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AiController {

    private final ProductRepository productRepository;
    private final AiMemoryRepository aiMemoryRepository;
    private final RecommendationHistoryRepository recommendationHistoryRepository;
    private final ChatRepository chatRepository;
    private final ShoppingBehaviourRepository shoppingBehaviourRepository;
    private final CartRepository cartRepository;
    private final WishlistRepository wishlistRepository;
    private final OrderRepository orderRepository;
    private final RecommendationFeedbackRepository feedbackRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    // Response DTOs
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductRecommendation {
        private Product product;
        private int score;
        private int rank;
        private String why;
        private List<String> pros;
        private List<String> cons;
        private String bestFor;
        private String notSuitableFor;
        private String reviewSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendResponse {
        private String reasoning;
        private List<ProductRecommendation> products;
        private String budgetAdvice;
        private List<String> accessories;
        private List<String> followUpQuestions;
    }

    @PostMapping("/recommend")
    public ResponseEntity<?> recommend(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String query = (String) body.get("query");
            String category = (String) body.get("category");
            List<Map<String, String>> conversationHistory = (List<Map<String, String>>) body.getOrDefault("conversationHistory", List.of());
            String sessionId = SessionUtils.getSessionId(request, null);

            Double budget = body.get("budget") != null ? ((Number) body.get("budget")).doubleValue() : null;
            if (budget == null) {
                Double extracted = aiService.extractBudgetFromQuery(query);
                if (extracted != null) {
                    budget = extracted * 100.0;
                }
            }

            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "query is required"));
            }

            List<Product> allProducts = productRepository.findAll();
            if (allProducts.isEmpty()) {
                return ResponseEntity.ok(RecommendResponse.builder()
                        .reasoning("The product catalog is empty right now. Please seed the database and try again.")
                        .products(List.of())
                        .budgetAdvice(null)
                        .accessories(List.of())
                        .followUpQuestions(List.of("Would you like to browse categories once products are available?"))
                        .build());
            }

            // Save user chat
            chatRepository.save(Chat.builder()
                    .sessionId(sessionId)
                    .role("user")
                    .content(query)
                    .timestamp(new Date())
                    .build());

            Optional<AiMemory> memoryOpt = aiMemoryRepository.findBySessionId(sessionId);
            List<CartItem> cartItems = cartRepository.findBySessionId(sessionId);
            List<WishlistItem> wishlistItems = wishlistRepository.findBySessionId(sessionId);
            List<ShoppingBehaviour> behaviours = shoppingBehaviourRepository.findBySessionId(sessionId);
            List<Order> orders = orderRepository.findBySessionId(sessionId);
            List<RecommendationFeedback> feedbacks = feedbackRepository.findBySessionId(sessionId);

            // Build rich user preference context for prompting (includes feedback)
            String preferenceContext = PromptTemplates.buildUserPreferenceContext(
                    memoryOpt, cartItems, wishlistItems, behaviours, orders, feedbacks, allProducts
            );

            // Build structured system prompt
            String systemPrompt = PromptTemplates.buildSystemPrompt(allProducts, preferenceContext);

            String chatHistoryText = conversationHistory.stream()
                    .map(m -> (m.get("role").equals("user") ? "User" : "Assistant") + ": " + m.get("content"))
                    .collect(Collectors.joining("\n"));

            String prompt = systemPrompt + "\n\nChat History:\n" + chatHistoryText +
                    "\n\nUser Input: " + query +
                    (budget != null ? " Budget: $" + (budget / 100.0) : "") +
                    (category != null ? " Category: " + category : "");

            RecommendResponse result = null;
            try {
                String responseText = aiService.callGemini(prompt, true);
                Map<String, Object> parsed = objectMapper.readValue(responseText.trim(), new TypeReference<Map<String, Object>>() {});
                result = buildResponseFromParsed(parsed, allProducts);
            } catch (Exception e) {
                log.warn("Gemini recommendation failed, using fallback: {}", e.getMessage());
                Map<String, Object> fallback = smartFallback(query, allProducts, budget, category);
                result = buildResponseFromParsed(fallback, allProducts);
            }

            // Save Recommendation History
            List<Integer> recommendedIds = result.getProducts().stream()
                    .map(r -> r.getProduct().getId())
                    .collect(Collectors.toList());
            
            recommendationHistoryRepository.save(RecommendationHistory.builder()
                    .sessionId(sessionId)
                    .query(query)
                    .reasoning(result.getReasoning())
                    .productIds(recommendedIds)
                    .createdAt(new Date())
                    .build());

            // Save or Update AI Memory
            AiMemory memory = memoryOpt.orElse(
                    AiMemory.builder()
                            .sessionId(sessionId)
                            .favoriteCategories(new ArrayList<>())
                            .favoriteBrands(new ArrayList<>())
                            .shoppingGoals(new ArrayList<>())
                            .build()
            );
            if (budget != null) {
                memory.setBudget(String.valueOf(budget));
            }
            if (category != null && !memory.getFavoriteCategories().contains(category)) {
                memory.getFavoriteCategories().add(category);
            }
            memory.setUpdatedAt(new Date());
            aiMemoryRepository.save(memory);

            // Save AI Response to Chat
            chatRepository.save(Chat.builder()
                    .sessionId(sessionId)
                    .role("ai")
                    .content(result.getReasoning())
                    .products(result.getProducts().stream().map(r -> (Object) r).collect(Collectors.toList()))
                    .timestamp(new Date())
                    .build());

            // Track behavior
            shoppingBehaviourRepository.save(ShoppingBehaviour.builder()
                    .sessionId(sessionId)
                    .actionType("ai_recommend")
                    .details(Map.of("query", query, "productCount", result.getProducts().size()))
                    .timestamp(new Date())
                    .build());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("AI recommendation failed completely: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private RecommendResponse buildResponseFromParsed(Map<String, Object> parsed, List<Product> allProducts) {
        String reasoning = (String) parsed.getOrDefault("reasoning", "Analyzed your request.");
        String budgetAdvice = (String) parsed.get("budgetAdvice");
        List<String> accessories = (List<String>) parsed.getOrDefault("accessories", List.of());
        List<String> followUpQuestions = (List<String>) parsed.getOrDefault("followUpQuestions", List.of());

        List<ProductRecommendation> recommendations = new ArrayList<>();
        List<Map<String, Object>> rawProducts = (List<Map<String, Object>>) parsed.getOrDefault("products", List.of());

        for (Map<String, Object> rec : rawProducts) {
            Number pidNum = (Number) rec.get("productId");
            if (pidNum == null) continue;
            int pid = pidNum.intValue();

            Optional<Product> prodOpt = allProducts.stream().filter(p -> p.getId() == pid).findFirst();
            if (prodOpt.isPresent()) {
                recommendations.add(ProductRecommendation.builder()
                        .product(prodOpt.get())
                        .score(rec.get("score") != null ? ((Number) rec.get("score")).intValue() : 75)
                        .rank(rec.get("rank") != null ? ((Number) rec.get("rank")).intValue() : 1)
                        .why((String) rec.getOrDefault("why", ""))
                        .pros((List<String>) rec.getOrDefault("pros", List.of()))
                        .cons((List<String>) rec.getOrDefault("cons", List.of()))
                        .bestFor((String) rec.getOrDefault("bestFor", ""))
                        .notSuitableFor((String) rec.getOrDefault("notSuitableFor", ""))
                        .reviewSummary((String) rec.getOrDefault("reviewSummary", ""))
                        .build());
            }
        }

        return RecommendResponse.builder()
                .reasoning(reasoning)
                .products(recommendations)
                .budgetAdvice(budgetAdvice)
                .accessories(accessories)
                .followUpQuestions(followUpQuestions)
                .build();
    }

    @PostMapping("/compare")
    public ResponseEntity<?> compare(@RequestBody Map<String, Object> body) {
        try {
            List<Integer> productIds = (List<Integer>) body.get("productIds");
            String userNeeds = (String) body.get("userNeeds");

            if (productIds == null || productIds.size() < 2) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "At least 2 productIds required"));
            }

            List<Product> products = productIds.stream()
                    .map(productRepository::findById)
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());

            if (products.size() < 2) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Products not found"));
            }

            try {
                String prompt = PromptTemplates.buildComparePrompt(products, userNeeds);
                String responseText = aiService.callGemini(prompt, true);
                Map<String, Object> parsed = objectMapper.readValue(responseText.trim(), new TypeReference<Map<String, Object>>() {});

                Number winnerIdNum = (Number) parsed.get("winnerId");
                int winnerId = winnerIdNum != null ? winnerIdNum.intValue() : products.get(0).getId();
                Product winner = products.stream().filter(p -> p.getId() == winnerId).findFirst().orElse(products.get(0));

                return ResponseEntity.ok(Map.of(
                        "winner", winner,
                        "analysis", parsed.getOrDefault("analysis", "Comparison completed."),
                        "comparisonTable", parsed.getOrDefault("comparisonTable", List.of()),
                        "recommendation", parsed.getOrDefault("recommendation", ""),
                        "awards", parsed.getOrDefault("awards", Map.of())
                ));
            } catch (Exception e) {
                log.warn("Gemini comparison failed, using fallback: {}", e.getMessage());
                Map<String, Object> fallback = fallbackCompare(products, userNeeds);
                return ResponseEntity.ok(fallback);
            }
        } catch (Exception e) {
            log.error("AI comparison failed completely: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/score/{productId}")
    public ResponseEntity<?> getAiScore(@PathVariable Integer productId) {
        try {
            Optional<Product> prodOpt = productRepository.findById(productId);
            if (prodOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Product not found"));
            }

            Product product = prodOpt.get();
            Map<String, Object> scores = null;
            try {
                String prompt = "Score this product (0-100 each category). Return ONLY valid JSON:\n" +
                        "{\"overall\":<n>,\"performance\":<n>,\"price\":<n>,\"reliability\":<n>,\"battery\":<n>,\"popularity\":<n>,\"futureProof\":<n>,\"summary\":\"2-sentence verdict\"}\n\n" +
                        "Product Details:\n" +
                        product.getName() + " by " + product.getBrand() + ". Category: " + product.getCategory() +
                        ". Price: " + product.getPrice() + ". Rating: " + product.getRating() + "/5 (" + product.getReviewCount() + " reviews). " +
                        product.getDescription();

                String responseText = aiService.callGemini(prompt, true);
                scores = objectMapper.readValue(responseText.trim(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.warn("Failed to get Gemini AI score, using mock score: {}", e.getMessage());
                scores = Map.of(
                        "overall", 82,
                        "performance", 85,
                        "price", 75,
                        "reliability", 88,
                        "battery", 80,
                        "popularity", 90,
                        "futureProof", 78,
                        "summary", "Strong performer with highly reliable build."
                );
            }
            return ResponseEntity.ok(scores);
        } catch (Exception e) {
            log.error("Failed to fetch product AI scores: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    @GetMapping("/memory")
    public ResponseEntity<?> getMemory(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            Optional<AiMemory> memoryOpt = aiMemoryRepository.findBySessionId(sessionId);
            
            AiMemory memory = memoryOpt.orElseGet(() -> {
                AiMemory newMemory = AiMemory.builder()
                        .sessionId(sessionId)
                        .favoriteCategories(new ArrayList<>())
                        .favoriteBrands(new ArrayList<>())
                        .shoppingGoals(new ArrayList<>())
                        .build();
                return aiMemoryRepository.save(newMemory);
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", memory.getId());
            response.put("sessionId", memory.getSessionId());
            response.put("budget", memory.getBudget() != null ? Double.parseDouble(memory.getBudget()) : null);
            response.put("favoriteCategories", memory.getFavoriteCategories());
            response.put("favoriteBrands", memory.getFavoriteBrands());
            response.put("preferredPriceRange", memory.getPreferredPriceRange());
            response.put("userProfile", memory.getUserProfile());
            response.put("shoppingGoals", memory.getShoppingGoals());
            response.put("updatedAt", memory.getUpdatedAt());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch AI memory: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/memory")
    public ResponseEntity<?> updateMemory(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            Optional<AiMemory> memoryOpt = aiMemoryRepository.findBySessionId(sessionId);
            
            AiMemory memory = memoryOpt.orElseGet(() -> AiMemory.builder()
                    .sessionId(sessionId)
                    .favoriteCategories(new ArrayList<>())
                    .favoriteBrands(new ArrayList<>())
                    .shoppingGoals(new ArrayList<>())
                    .build());
            
            if (body.containsKey("budget")) {
                Object bVal = body.get("budget");
                memory.setBudget(bVal != null ? String.valueOf(bVal) : null);
            }
            if (body.containsKey("userProfile")) {
                memory.setUserProfile((String) body.get("userProfile"));
            }
            if (body.containsKey("favoriteCategories")) {
                memory.setFavoriteCategories((List<String>) body.get("favoriteCategories"));
            }
            if (body.containsKey("favoriteBrands")) {
                memory.setFavoriteBrands((List<String>) body.get("favoriteBrands"));
            }
            if (body.containsKey("shoppingGoals")) {
                memory.setShoppingGoals((List<String>) body.get("shoppingGoals"));
            }
            if (body.containsKey("preferredPriceRange")) {
                memory.setPreferredPriceRange((String) body.get("preferredPriceRange"));
            }
            
            memory.setUpdatedAt(new Date());
            AiMemory saved = aiMemoryRepository.save(memory);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", saved.getId());
            response.put("sessionId", saved.getSessionId());
            response.put("budget", saved.getBudget() != null ? Double.parseDouble(saved.getBudget()) : null);
            response.put("favoriteCategories", saved.getFavoriteCategories());
            response.put("favoriteBrands", saved.getFavoriteBrands());
            response.put("preferredPriceRange", saved.getPreferredPriceRange());
            response.put("userProfile", saved.getUserProfile());
            response.put("shoppingGoals", saved.getShoppingGoals());
            response.put("updatedAt", saved.getUpdatedAt());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update AI memory: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private Map<String, Object> fallbackCompare(List<Product> products, String userNeeds) {
        Product winner = products.stream()
                .max(Comparator.comparingDouble(p -> p.getRating() != null ? p.getRating() : 0.0))
                .orElse(products.get(0));

        List<Map<String, Object>> table = new ArrayList<>();
        List<String> aspects = List.of(
            "Processor", "RAM", "Storage", "Battery", "Camera", 
            "Display", "Build Quality", "Performance", "Warranty", 
            "Weight", "Connectivity", "AI Score", "Sustainability Score", "Overall Score"
        );

        for (String aspect : aspects) {
            Map<String, Object> scores = new HashMap<>();
            for (Product p : products) {
                scores.put(String.valueOf(p.getId()), 70 + new Random().nextInt(25));
            }
            table.add(Map.of("aspect", aspect, "scores", scores));
        }

        Map<String, Object> awards = Map.of(
            "bestOverall", Map.of("productId", winner.getId(), "why", winner.getName() + " has the highest build quality and display specs."),
            "bestValue", Map.of("productId", products.get(0).getId(), "why", "Great price to performance ratio."),
            "bestGaming", Map.of("productId", winner.getId(), "why", "Outstanding performance and GPU speed."),
            "bestOffice", Map.of("productId", products.get(0).getId(), "why", "Excellent typing ergonomics and battery life."),
            "bestStudent", Map.of("productId", products.get(0).getId(), "why", "Compact size, light weight, and student discount friendly."),
            "bestCamera", Map.of("productId", winner.getId(), "why", "Ultra high-resolution photo sensors."),
            "bestBattery", Map.of("productId", winner.getId(), "why", "Extended 20+ hours running lifespan."),
            "bestPerformance", Map.of("productId", winner.getId(), "why", "Top-tier processor and benchmark metrics."),
            "premiumChoice", Map.of("productId", winner.getId(), "why", "Premium materials and unmatched finish quality.")
        );

        Map<String, Object> recommendation = Map.of(
            "whySelected", winner.getName() + " leads with a superior specification sheet and ratings.",
            "advantages", List.of("Excellent build quality", "Stunning design"),
            "disadvantages", List.of("Premium price category"),
            "suitableUser", "Power users and tech enthusiasts seeking maximum performance.",
            "confidenceScore", 92,
            "overallVerdict", winner.getName() + " is the winner due to better build quality and specs."
        );

        return Map.of(
                "winner", winner,
                "analysis", String.format("Comparing %s vs %s. %s leads on ratings.", products.get(0).getName(), products.get(1).getName(), winner.getName()),
                "comparisonTable", table,
                "recommendation", recommendation,
                "awards", awards
        );
    }

    private Map<String, Object> smartFallback(String query, List<Product> products, Double budget, String category) {
        String q = query.toLowerCase().trim();
        
        // 1. Check for greetings
        if (q.matches(".*\\b(hi|hello|hey|greetings|good morning|good afternoon)\\b.*")) {
            return Map.of(
                    "reasoning", "Hello! I am your Goval AI Shopping Assistant. How can I help you find products, compare options, or manage your shopping preferences today?",
                    "products", List.of(),
                    "budgetAdvice", "",
                    "accessories", List.of(),
                    "followUpQuestions", List.of("Show me some laptops", "What smartwatches do you have?")
            );
        }

        // 2. Check for help/capabilities
        if (q.contains("help") || q.contains("what can you do") || q.contains("capabilities") || q.contains("how to use")) {
            return Map.of(
                    "reasoning", "I can help you browse and search products in our catalog, filter by price or budget, compare products side-by-side, analyze future price trends, and build customized bundles. Just let me know what you are looking for!",
                    "products", List.of(),
                    "budgetAdvice", "",
                    "accessories", List.of(),
                    "followUpQuestions", List.of("Show categories", "Compare smartphones")
            );
        }

        // 3. Check for categories query
        if (q.contains("category") || q.contains("categories") || q.contains("product type") || q.contains("types of product")) {
            return Map.of(
                    "reasoning", "We offer a wide variety of products across these categories:\n\n" +
                                 "* **Smartphones**: Latest mobile phones and accessories.\n" +
                                 "* **Laptops**: High-performance notebooks for work and gaming.\n" +
                                 "* **Headphones**: Noise-cancelling over-ear and in-ear audio devices.\n" +
                                 "* **Tablets**: Portable touchscreen tablets.\n" +
                                 "* **Smartwatches**: Fitness trackers and smart wearable devices.\n" +
                                 "* **Cameras**: Professional digital and action cameras.\n" +
                                 "* **Audio**: High-fidelity speakers and sound systems.\n" +
                                 "* **Gaming**: Consoles, controllers, and gaming peripherals.\n" +
                                 "* **Fashion**: Men's and women's clothing apparel.\n" +
                                 "* **Shoes**: Running shoes, sneakers, and formal footwear.\n" +
                                 "* **Furniture**: Sofas, tables, and home decor items.\n" +
                                 "* **Kitchen**: Modern appliances and cooking utensils.\n" +
                                 "* **Books**: Bestselling novels, educational, and reference books.\n" +
                                 "* **Beauty**: Skin care, cosmetics, and beauty accessories.\n\n" +
                                 "Which category would you like to explore today?",
                    "products", List.of(),
                    "budgetAdvice", "",
                    "accessories", List.of(),
                    "followUpQuestions", List.of("Show laptops", "Show smartphones")
            );
        }

        // 4. Check for brands query
        if (q.contains("brand") || q.contains("brands")) {
            return Map.of(
                    "reasoning", "We carry top products from premium global brands including:\n\n" +
                                 "* **Tech**: Apple, Samsung, Google, Dell, Sony, Bose, Canon, HP\n" +
                                 "* **Fashion/Sport**: Nike, Adidas, Oakley, Levi's\n" +
                                 "* **Home/Kitchen**: Dyson, Keurig, Nespresso, Herman Miller\n\n" +
                                 "Are you looking for products from any specific brand?",
                    "products", List.of(),
                    "budgetAdvice", "",
                    "accessories", List.of(),
                    "followUpQuestions", List.of("Show Apple products", "Show Sony products")
            );
        }

        // 5. Default: Product search
        String detectedCategory = category != null ? category : "";

        if (detectedCategory.isEmpty()) {
            if (q.contains("laptop") || q.contains("macbook")) detectedCategory = "Laptops";
            else if (q.contains("headphone") || q.contains("earbud")) detectedCategory = "Headphones";
            else if (q.contains("phone") || q.contains("iphone") || q.contains("mobile")) detectedCategory = "Smartphones";
            else if (q.contains("tablet") || q.contains("ipad")) detectedCategory = "Tablets";
            else if (q.contains("watch") || q.contains("wearable")) detectedCategory = "Smartwatches";
            else if (q.contains("camera")) detectedCategory = "Cameras";
            else if (q.contains("audio") || q.contains("speaker") || q.contains("sound")) detectedCategory = "Audio";
            else if (q.contains("gaming") || q.contains("ps5") || q.contains("xbox") || q.contains("console")) detectedCategory = "Gaming";
            else if (q.contains("shirt") || q.contains("dress") || q.contains("clothing") || q.contains("fashion")) detectedCategory = "Fashion";
            else if (q.contains("shoe") || q.contains("sneaker") || q.contains("boots")) detectedCategory = "Shoes";
            else if (q.contains("sofa") || q.contains("chair") || q.contains("desk") || q.contains("furniture")) detectedCategory = "Furniture";
            else if (q.contains("kitchen") || q.contains("coffee") || q.contains("blender") || q.contains("utensil")) detectedCategory = "Kitchen";
            else if (q.contains("book") || q.contains("novel") || q.contains("read")) detectedCategory = "Books";
            else if (q.contains("makeup") || q.contains("skincare") || q.contains("beauty")) detectedCategory = "Beauty";
        }

        final String finalCat = detectedCategory;
        final boolean isMinPrice = q.contains("above") || q.contains("over") || q.contains("more than") || q.contains("greater than") || q.contains("min") || q.contains("at least");
        
        List<Product> filtered = products.stream()
                .filter(p -> {
                    if (!finalCat.isEmpty() && !p.getCategory().equalsIgnoreCase(finalCat)) {
                        return false;
                    }
                    if (budget != null) {
                        if (isMinPrice) {
                            if (p.getPrice() < budget * 0.9) return false;
                        } else {
                            if (p.getPrice() > budget * 1.15) return false;
                        }
                    }
                    if (finalCat.isEmpty()) {
                        String[] keywords = q.replaceAll("[^a-zA-Z0-9\\s]", "").split("\\s+");
                        for (String kw : keywords) {
                            if (kw.length() > 2 && (p.getName().toLowerCase().contains(kw) || p.getBrand().toLowerCase().contains(kw) || p.getCategory().toLowerCase().contains(kw))) {
                                return true;
                            }
                        }
                        return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            filtered = products.stream()
                    .filter(p -> finalCat.isEmpty() || p.getCategory().equalsIgnoreCase(finalCat))
                    .filter(p -> {
                        if (budget == null) return true;
                        if (isMinPrice) {
                            return p.getPrice() >= budget * 0.9;
                        } else {
                            return p.getPrice() <= budget * 1.15;
                        }
                    })
                    .collect(Collectors.toList());
        }

        if (filtered.isEmpty()) {
            filtered = products.stream().limit(10).collect(Collectors.toList());
        }

        filtered.sort((p1, p2) -> Double.compare(p2.getRating() != null ? p2.getRating() : 0.0, p1.getRating() != null ? p1.getRating() : 0.0));

        List<Map<String, Object>> recs = new ArrayList<>();
        int rank = 1;
        for (Product p : filtered.stream().limit(4).collect(Collectors.toList())) {
            recs.add(Map.of(
                    "productId", p.getId(),
                    "score", 85 + new Random().nextInt(15),
                    "rank", rank++,
                    "why", String.format("A top-rated choice matching your request in %s.", p.getCategory()),
                    "pros", List.of("Excellent specifications", "High user ratings"),
                    "cons", List.of("Standard features"),
                    "bestFor", "Everyday users looking for premium quality",
                    "notSuitableFor", "Niche technical workloads",
                    "reviewSummary", "Customers appreciate its reliability and cost-performance ratio."
            ));
        }

        String searchSummary = "I analyzed our catalog for products matching '" + query + "'";
        if (!finalCat.isEmpty()) {
            searchSummary += " in the **" + finalCat + "** category";
        }
        if (budget != null) {
            if (isMinPrice) {
                searchSummary += " priced above **$" + String.format("%.2f", budget / 100.0) + "**";
            } else {
                searchSummary += " within your budget of **$" + String.format("%.2f", budget / 100.0) + "**";
            }
        }
        searchSummary += ". Here are the top-rated recommendations:";

        return Map.of(
                "reasoning", searchSummary,
                "products", recs,
                "budgetAdvice", budget != null ? (isMinPrice ? "These options match or exceed your minimum budget limit." : "Your budget fits these options nicely.") : "No budget limit was specified.",
                "accessories", List.of("Carrying Case", "Protective Sleeve"),
                "followUpQuestions", List.of("Would you like to compare these options?", "Are there specific brands you prefer?")
        );
    }
}
