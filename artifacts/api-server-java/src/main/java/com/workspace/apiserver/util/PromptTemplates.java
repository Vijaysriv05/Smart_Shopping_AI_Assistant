package com.workspace.apiserver.util;

import com.workspace.apiserver.model.*;
import java.util.*;
import java.util.stream.Collectors;

public class PromptTemplates {

    /**
     * Builds a structured system prompt that defines the behavior, catalog, and formatting of the shopping assistant.
     */
    public static String buildSystemPrompt(List<Product> products, String userPreferencesContext) {
        String productList = products.stream()
                .map(p -> String.format("ID:%d | %s | %s | %s | Price:%.0f cents | Rating:%.1f/5 | %s",
                        p.getId(), p.getName(), p.getBrand(), p.getCategory(), p.getPrice(), p.getRating(),
                        p.getDescription().length() > 80 ? p.getDescription().substring(0, 80) : p.getDescription()))
                .collect(Collectors.joining("\n"));

        return "You are an expert autonomous AI Smart Shopping Assistant. Your goal is to guide the user to the best purchase decisions.\n" +
                "Prices in the product catalog are represented in cents (e.g. 124900 cents = $1249.00).\n\n" +
                "Available Catalog:\n" + productList + "\n\n" +
                "User Profile & Preference Context (contains browsing, purchases, cart, wishlist, and past feedback likes/dislikes):\n" + userPreferencesContext + "\n\n" +
                "IMPORTANT INSTRUCTIONS:\n" +
                "1. Recommend ONLY real products from the catalog listed above using their specific productIds. Never invent products.\n" +
                "2. Provide personalized reasoning explaining WHY each product was selected based on the user's budget, preferred category, preferred brands, and conversation memory.\n" +
                "3. Explain advantages (pros) and disadvantages (cons) for every recommendation.\n" +
                "4. Suggest relevant accessories (by name) that complement the recommended products.\n" +
                "5. Provide a short budget advice (e.g. if their budget is too low, suggest suitable options or a slight budget increase with savings justification).\n" +
                "6. Suggest 2-3 logical follow-up questions to help narrow down choices.\n\n" +
                "You MUST respond ONLY with a single valid JSON object strictly matching this schema (do not wrap in markdown blocks, just return raw JSON):\n" +
                "{\n" +
                "  \"reasoning\": \"Step-by-step analysis of user query and preference context\",\n" +
                "  \"products\": [\n" +
                "    {\n" +
                "      \"productId\": <integer product id>,\n" +
                "      \"score\": <relevance score 0-100>,\n" +
                "      \"rank\": <integer rank 1-5>,\n" +
                "      \"why\": \"Detailed reason explaining why this matches user budget, preferences, reviews, or performance needs\",\n" +
                "      \"pros\": [\"pro 1\", \"pro 2\"],\n" +
                "      \"cons\": [\"con 1\", \"con 2\"],\n" +
                "      \"bestFor\": \"Description of who should buy this product\",\n" +
                "      \"notSuitableFor\": \"Description of who should avoid this product\",\n" +
                "      \"reviewSummary\": \"Aggregated sentiment summary of pros, cons, and customer opinions\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"budgetAdvice\": \"Advice on budget matching or alternatives, or null\",\n" +
                "  \"accessories\": [\"Accessory Name 1\", \"Accessory Name 2\"],\n" +
                "  \"followUpQuestions\": [\"Follow-up Q1\", \"Follow-up Q2\"]\n" +
                "}";
    }

    /**
     * Injects context from UserPreferences, Cart, Wishlist, recently viewed behaviors, purchase history, and past feedback loop responses.
     */
    public static String buildUserPreferenceContext(
            Optional<AiMemory> memoryOpt,
            List<CartItem> cartItems,
            List<WishlistItem> wishlistItems,
            List<ShoppingBehaviour> behaviours,
            List<Order> orders,
            List<RecommendationFeedback> feedbacks,
            List<Product> catalog) {
        
        StringBuilder sb = new StringBuilder();
        
        // 1. AI Memory Context
        if (memoryOpt.isPresent()) {
            AiMemory memory = memoryOpt.get();
            sb.append(String.format("- Preferred Budget Limit: %s cents.\n", 
                    memory.getBudget() != null ? memory.getBudget() : "Unspecified"));
            sb.append(String.format("- Favorite Categories: %s.\n", 
                    memory.getFavoriteCategories() != null && !memory.getFavoriteCategories().isEmpty() 
                            ? String.join(", ", memory.getFavoriteCategories()) : "None specified yet"));
            sb.append(String.format("- Preferred Brands: %s.\n", 
                    memory.getFavoriteBrands() != null && !memory.getFavoriteBrands().isEmpty() 
                            ? String.join(", ", memory.getFavoriteBrands()) : "None specified yet"));
            if (memory.getUserProfile() != null) {
                sb.append(String.format("- User Persona/Profile: %s.\n", memory.getUserProfile()));
            }
        } else {
            sb.append("- User Profile: New visitor, no profile memory yet.\n");
        }

        // 2. Cart Context
        if (!cartItems.isEmpty()) {
            String cartStr = cartItems.stream()
                    .map(c -> catalog.stream().filter(p -> p.getId().equals(c.getProductId())).findFirst()
                            .map(Product::getName).orElse("Product ID: " + c.getProductId()))
                    .collect(Collectors.joining(", "));
            sb.append("- Current Cart Items: ").append(cartStr).append(".\n");
        }

        // 3. Wishlist Context
        if (!wishlistItems.isEmpty()) {
            String wishStr = wishlistItems.stream()
                    .map(w -> catalog.stream().filter(p -> p.getId().equals(w.getProductId())).findFirst()
                            .map(Product::getName).orElse("Product ID: " + w.getProductId()))
                    .collect(Collectors.joining(", "));
            sb.append("- Wishlist / Saved Items: ").append(wishStr).append(".\n");
        }

        // 4. Recently Viewed Products (extracted from behavior logs)
        List<Integer> recentlyViewedIds = behaviours.stream()
                .filter(b -> "view_product".equalsIgnoreCase(b.getActionType()) || "click_product".equalsIgnoreCase(b.getActionType()))
                .sorted(Comparator.comparing(ShoppingBehaviour::getTimestamp).reversed())
                .limit(5)
                .map(b -> {
                    if (b.getDetails() != null && b.getDetails().containsKey("productId")) {
                        return ((Number) b.getDetails().get("productId")).intValue();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (!recentlyViewedIds.isEmpty()) {
            String viewStr = recentlyViewedIds.stream()
                    .map(id -> catalog.stream().filter(p -> p.getId().equals(id)).findFirst()
                            .map(Product::getName).orElse("Product ID: " + id))
                    .collect(Collectors.joining(", "));
            sb.append("- Recently Viewed: ").append(viewStr).append(".\n");
        }

        // 5. Purchase History (Orders)
        if (!orders.isEmpty()) {
            String purchaseStr = orders.stream()
                    .filter(o -> o.getItems() != null)
                    .flatMap(o -> o.getItems().stream())
                    .map(OrderItem::getName)
                    .distinct()
                    .limit(5)
                    .collect(Collectors.joining(", "));
            sb.append("- Previous Purchases: ").append(purchaseStr).append(".\n");
        }

        // 6. Recommendation Feedback Loop Context (Self-Learning Tuning)
        if (feedbacks != null && !feedbacks.isEmpty()) {
            sb.append("- Past AI Recommendation Feedbacks:\n");
            feedbacks.stream().limit(10).forEach(fb -> {
                String status = fb.getIsHelpful() ? "HELPFUL (Accepted)" : "NOT HELPFUL (Rejected)";
                String name = catalog.stream().filter(p -> p.getId().equals(fb.getProductId())).findFirst()
                        .map(Product::getName).orElse("Product ID " + fb.getProductId());
                sb.append(String.format("  * Product: %s | Rating: %d/5 | Feedback: %s | User Comments: %s\n",
                        name, fb.getRating(), status, fb.getComment() != null ? fb.getComment() : "None"));
            });
            sb.append("  (IMPORTANT: Use this feedback context to prioritize brands, budgets, or categories they rated highly, and avoid recommending brands or categories they marked NOT HELPFUL or rated lowly).\n");
        }

        return sb.toString();
    }

    /**
     * Builds prompt for AI Product Comparison including side-by-side spec comparisons and specific category awards.
     */
    public static String buildComparePrompt(List<Product> products, String userNeeds) {
        String productDescriptions = products.stream()
                .map(p -> String.format("ID:%d | Name:%s | Brand:%s | Price:%.0f cents | Rating:%.1f/5 | Reviews Count:%d | Description:%s\nSpecs: %s",
                        p.getId(), p.getName(), p.getBrand(), p.getPrice(), p.getRating(), p.getReviewCount(), p.getDescription(), 
                        p.getSpecs() != null ? p.getSpecs().toString() : "None"))
                .collect(Collectors.joining("\n\n"));

        return "Compare these products side-by-side in detail. Take into consideration these user requirements: " + (userNeeds != null ? userNeeds : "best overall value") + ".\n\n" +
                "Products to compare:\n" + productDescriptions + "\n\n" +
                "Evaluate and score each product (from 0 to 100) across all compared aspects.\n\n" +
                "You must award specific choices (Best Overall, Best Value, Best Gaming, Best Office, Best Student, Best Camera, Best Battery, Best Performance, Premium Choice) based on the specs of the products.\n\n" +
                "You MUST respond ONLY with a valid JSON object matching this schema (no markdown wrapper, just raw JSON):\n" +
                "{\n" +
                "  \"winnerId\": <integer product id of the best matching product>,\n" +
                "  \"analysis\": \"In-depth comparative analysis detailing major pros and cons of each product\",\n" +
                "  \"awards\": {\n" +
                "    \"bestOverall\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Overall winner\"\n" +
                "    },\n" +
                "    \"bestValue\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Value winner\"\n" +
                "    },\n" +
                "    \"bestGaming\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Gaming winner\"\n" +
                "    },\n" +
                "    \"bestOffice\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Office winner\"\n" +
                "    },\n" +
                "    \"bestStudent\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Student winner\"\n" +
                "    },\n" +
                "    \"bestCamera\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Camera winner\"\n" +
                "    },\n" +
                "    \"bestBattery\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Battery winner\"\n" +
                "    },\n" +
                "    \"bestPerformance\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Best Performance winner\"\n" +
                "    },\n" +
                "    \"premiumChoice\": {\n" +
                "       \"productId\": <integer>,\n" +
                "       \"why\": \"Reasoning for Premium Choice winner\"\n" +
                "    }\n" +
                "  },\n" +
                "  \"comparisonTable\": [\n" +
                "    {\n" +
                "      \"aspect\": \"Processor|RAM|Storage|Battery|Camera|Display|Build Quality|Performance|Warranty|Weight|Connectivity|AI Score|Sustainability Score|Overall Score\",\n" +
                "      \"scores\": {\n" +
                "        \"<productId1>\": <integer score 0-100>,\n" +
                "        \"<productId2>\": <integer score 0-100>\n" +
                "      }\n" +
                "    }\n" +
                "  ],\n" +
                "  \"recommendation\": {\n" +
                "     \"whySelected\": \"Summary justification of winner\",\n" +
                "     \"advantages\": [\"Advantage 1\", \"Advantage 2\"],\n" +
                "     \"disadvantages\": [\"Disadvantage 1\", \"Disadvantage 2\"],\n" +
                "     \"suitableUser\": \"Description of the ideal user context\",\n" +
                "     \"confidenceScore\": <integer 0-100>,\n" +
                "     \"overallVerdict\": \"Final concluding statement\"\n" +
                "  }\n" +
                "}";
    }

    /**
     * Builds prompt for review summarization, pros/cons, sentiment, and fake review detection.
     */
    public static String buildReviewSummaryPrompt(Product product, List<Review> reviews) {
        String reviewList = reviews.isEmpty() 
                ? "No customer reviews submitted yet." 
                : reviews.stream()
                        .map(r -> String.format("Reviewer: %s | Rating: %.1f/5 | Comment: %s", 
                                r.getReviewerName(), r.getRating(), r.getComment()))
                        .collect(Collectors.joining("\n"));

        return "Analyze the customer reviews for the following product and generate an aggregated review intelligence report.\n" +
                "Product: " + product.getName() + " by " + product.getBrand() + "\n" +
                "Description: " + product.getDescription() + "\n\n" +
                "Customer Reviews:\n" + reviewList + "\n\n" +
                "Your task is to:\n" +
                "1. Summarize major positive feedback (pros) and negative feedback (cons) into bullet points.\n" +
                "2. Identify common complaints reported by users.\n" +
                "3. Provide an overall customer opinion verdict.\n" +
                "4. Assess review authenticity (fake review detection) and output a fakeReviewScore from 0 (completely organic) to 100 (suspiciously fake or bot-like review patterns).\n" +
                "5. Detect overall review sentiment: \"Very Positive\", \"Positive\", \"Mixed\", or \"Negative\".\n\n" +
                "You MUST respond ONLY with a valid JSON object matching this schema (no markdown wrapper, just raw JSON):\n" +
                "{\n" +
                "  \"pros\": [\"pro 1\", \"pro 2\"],\n" +
                "  \"cons\": [\"con 1\", \"con 2\"],\n" +
                "  \"commonComplaints\": \"Summary of common customer pain points, or 'None'\",\n" +
                "  \"overallOpinion\": \"General summary of consumer satisfaction and consensus\",\n" +
                "  \"fakeReviewScore\": <integer 0-100 indicating probability of fake reviews>,\n" +
                "  \"sentiment\": \"<Very Positive|Positive|Mixed|Negative>\"\n" +
                "}";
    }

    /**
     * Builds prompt for AI Shopping Goal Planner.
     */
    public static String buildGoalPlannerPrompt(String goalTitle, String goalDetails, Double budget, List<Product> catalog) {
        String productList = catalog.stream()
                .map(p -> String.format("ID:%d | %s | %s | %s | Price:%.0f cents | Rating:%.1f/5",
                        p.getId(), p.getName(), p.getBrand(), p.getCategory(), p.getPrice(), p.getRating()))
                .collect(Collectors.joining("\n"));

        return "You are an expert AI Shopping Goal Planner. The user wants to prepare a shopping plan for the goal: \"" + goalTitle + "\".\n" +
                "User goal description/details: " + (goalDetails != null ? goalDetails : "Default goal details") + "\n" +
                "Total allocated budget limit: " + (budget != null ? budget : "No budget limit") + " dollars.\n\n" +
                "Product catalog to select from (recommend real IDs):\n" + productList + "\n\n" +
                "Your task is to:\n" +
                "1. Suggest a list of recommended product categories/items needed to achieve this goal.\n" +
                "2. Map specific product IDs from the catalog that match each category.\n" +
                "3. Allocate budget percentages for each suggested item category (make sure they sum up to 100%).\n" +
                "4. Define a priority order (e.g. Must Have, Highly Recommended, Nice to Have) for all items.\n" +
                "5. Provide alternative cheaper product recommendations (IDs) to help them save budget.\n" +
                "6. Estimate total cost (in cents).\n\n" +
                "You MUST respond ONLY with a valid JSON object matching this schema (no markdown wrapper, just raw JSON):\n" +
                "{\n" +
                "  \"description\": \"Brief summary of this goal plan and general planning advice\",\n" +
                "  \"items\": [\n" +
                "     {\n" +
                "        \"category\": \"Category name (e.g. Laptop)\",\n" +
                "        \"productId\": <integer matching product id>,\n" +
                "        \"budgetAllocationPct\": <integer budget percent, e.g. 50>,\n" +
                "        \"priority\": \"Must Have|Highly Recommended|Nice to Have\"\n" +
                "     }\n" +
                "  ],\n" +
                "  \"priorityOrder\": [\"First item category\", \"Second item category\"],\n" +
                "  \"alternativeCheaper\": [\n" +
                "     {\n" +
                "        \"originalProductId\": <integer>,\n" +
                "        \"alternativeProductId\": <integer>,\n" +
                "        \"savingsCents\": <integer savings value in cents>\n" +
                "     }\n" +
                "  ],\n" +
                "  \"estimatedTotalCents\": <integer total cents of recommended items>\n" +
                "}";
    }

    /**
     * Builds prompt for Festival offerings and seasonal sales analysis.
     */
    public static String buildFestivalPrompt(String festivalName, List<Product> catalog) {
        String productList = catalog.stream()
                .map(p -> String.format("ID:%d | %s | %s | %s | Price:%.0f cents | Rating:%.1f/5",
                        p.getId(), p.getName(), p.getBrand(), p.getCategory(), p.getPrice(), p.getRating()))
                .collect(Collectors.joining("\n"));

        return "Analyze the product catalog and recommend the best seasonal items, offers, and gift combinations for the upcoming event: \"" + festivalName + "\".\n\n" +
                "Product Catalog:\n" + productList + "\n\n" +
                "Your task is to:\n" +
                "1. Select the top 4 products suitable for this seasonal theme or gifting.\n" +
                "2. Provide special promotional discounts (in percent) for the festival catalog.\n" +
                "3. Explain why each recommended product fits the context of this event.\n" +
                "4. Suggest 2-3 logical gift combinations/bundles from the recommended products.\n\n" +
                "You MUST respond ONLY with a valid JSON object matching this schema (no markdown wrapper, just raw JSON):\n" +
                "{\n" +
                "  \"eventDescription\": \"Brief thematic description of this festival shopping season\",\n" +
                "  \"offers\": [\n" +
                "     {\n" +
                "        \"productId\": <integer>,\n" +
                "        \"thematicReason\": \"Explanation of why this product matches the theme/festival\",\n" +
                "        \"discountPct\": <integer discount, e.g. 15>\n" +
                "     }\n" +
                "  ],\n" +
                "  \"giftCombinations\": [\n" +
                "     {\n" +
                "        \"bundleName\": \"Themed Bundle Name (e.g. Tech Gift Box)\",\n" +
                "        \"productIds\": [<integer>, <integer>],\n" +
                "        \"totalThematicDiscountPct\": <integer>\n" +
                "     }\n" +
                "  ]\n" +
                "}";
    }
}
