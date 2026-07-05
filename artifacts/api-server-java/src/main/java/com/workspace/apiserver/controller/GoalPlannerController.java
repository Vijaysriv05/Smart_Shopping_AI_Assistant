package com.workspace.apiserver.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.apiserver.model.ShoppingGoal;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.repository.ShoppingGoalRepository;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.service.AiService;
import com.workspace.apiserver.util.PromptTemplates;
import com.workspace.apiserver.util.SessionUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/goals")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class GoalPlannerController {

    private final ShoppingGoalRepository goalRepository;
    private final ProductRepository productRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<ShoppingGoal>> getGoals(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<ShoppingGoal> goals = goalRepository.findBySessionId(sessionId);
            return ResponseEntity.ok(goals);
        } catch (Exception e) {
            log.error("Failed to fetch shopping goals: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createGoal(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            String title = (String) body.get("title");
            String description = (String) body.get("description");
            Double budget = body.get("budget") != null ? ((Number) body.get("budget")).doubleValue() : 2000.0;

            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "title is required"));
            }

            List<Product> catalog = productRepository.findAll();
            if (catalog.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "No catalog products available to plan"));
            }

            // Query Gemini to make a structured goal planner
            Map<String, Object> plannerData;
            try {
                String prompt = PromptTemplates.buildGoalPlannerPrompt(title, description, budget, catalog);
                String responseText = aiService.callGemini(prompt, true);
                plannerData = objectMapper.readValue(responseText.trim(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.warn("Gemini goal planning failed, using fallback: {}", e.getMessage());
                plannerData = buildFallbackGoalData(title, budget, catalog);
            }

            // Map list of planner items to strings for DB storage
            List<Map<String, Object>> itemsList = (List<Map<String, Object>>) plannerData.getOrDefault("items", List.of());
            List<String> items = itemsList.stream()
                    .map(item -> {
                        int pid = ((Number) item.get("productId")).intValue();
                        String categoryName = (String) item.get("category");
                        String priority = (String) item.get("priority");
                        int pct = ((Number) item.get("budgetAllocationPct")).intValue();
                        return String.format("%s|%d|%s|%d", categoryName, pid, priority, pct);
                    })
                    .collect(Collectors.toList());

            List<String> priorityOrder = (List<String>) plannerData.getOrDefault("priorityOrder", List.of());

            List<Map<String, Object>> cheaperList = (List<Map<String, Object>>) plannerData.getOrDefault("alternativeCheaper", List.of());
            List<String> alternativeCheaper = cheaperList.stream()
                    .map(alt -> {
                        int original = ((Number) alt.get("originalProductId")).intValue();
                        int cheaper = ((Number) alt.get("alternativeProductId")).intValue();
                        int savings = ((Number) alt.get("savingsCents")).intValue();
                        return String.format("%d|%d|%d", original, cheaper, savings);
                    })
                    .collect(Collectors.toList());

            ShoppingGoal goal = ShoppingGoal.builder()
                    .sessionId(sessionId)
                    .title(title)
                    .description((String) plannerData.getOrDefault("description", description))
                    .budget(budget)
                    .priority("high")
                    .timeline("1 Month")
                    .items(items)
                    .priorityOrder(priorityOrder)
                    .alternativeCheaper(alternativeCheaper)
                    .isCompleted(false)
                    .createdAt(new Date())
                    .build();

            ShoppingGoal saved = goalRepository.save(goal);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            log.error("Failed to plan goal: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateGoal(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        try {
            Optional<ShoppingGoal> goalOpt = goalRepository.findById(id);
            if (goalOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            ShoppingGoal goal = goalOpt.get();
            if (body.containsKey("isCompleted")) {
                goal.setIsCompleted((Boolean) body.get("isCompleted"));
            }
            if (body.containsKey("budget")) {
                goal.setBudget(((Number) body.get("budget")).doubleValue());
            }
            if (body.containsKey("timeline")) {
                goal.setTimeline((String) body.get("timeline"));
            }

            ShoppingGoal saved = goalRepository.save(goal);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to update goal plan: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGoal(@PathVariable Integer id) {
        try {
            goalRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to delete goal plan: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private Map<String, Object> buildFallbackGoalData(String title, Double budget, List<Product> catalog) {
        String cleanTitle = title.toLowerCase();
        Set<String> targetCategories = new HashSet<>();

        // Map keywords to categories
        if (cleanTitle.matches(".*\\b(college|school|study|exam|class|learn|education|student|university)\\b.*")) {
            targetCategories.add("Books");
            targetCategories.add("Office Supplies");
        }
        if (cleanTitle.matches(".*\\b(work|office|job|desk|business|write|productivity)\\b.*")) {
            targetCategories.add("Office Supplies");
            targetCategories.add("Accessories");
        }
        if (cleanTitle.matches(".*\\b(baby|kid|child|infant|toy|parent|mom|dad|toddler)\\b.*")) {
            targetCategories.add("Baby Products");
        }
        if (cleanTitle.matches(".*\\b(pet|dog|cat|animal|bird|fish|puppy|kitten)\\b.*")) {
            targetCategories.add("Pet Supplies");
        }
        if (cleanTitle.matches(".*\\b(jewel|ring|necklace|bracelet|gold|silver|diamond|anniversary|wedding|earring)\\b.*")) {
            targetCategories.add("Jewellery");
            targetCategories.add("Accessories");
        }
        if (cleanTitle.matches(".*\\b(sport|game|outdoor|fitness|run|swim|travel|sunglasses|active|workout)\\b.*")) {
            targetCategories.add("Accessories");
            targetCategories.add("Pet Supplies");
        }

        // Try to filter products from target categories
        List<Product> matchedProducts = catalog.stream()
                .filter(p -> targetCategories.contains(p.getCategory()))
                .collect(Collectors.toList());

        // If no categories match, search name, description, brand, tags, category for keywords
        if (matchedProducts.isEmpty()) {
            String[] keywords = cleanTitle.split("\\s+");
            matchedProducts = catalog.stream()
                    .filter(p -> {
                        for (String kw : keywords) {
                            if (kw.length() < 3) continue;
                            if ((p.getName() != null && p.getName().toLowerCase().contains(kw)) ||
                                (p.getDescription() != null && p.getDescription().toLowerCase().contains(kw)) ||
                                (p.getBrand() != null && p.getBrand().toLowerCase().contains(kw)) ||
                                (p.getCategory() != null && p.getCategory().toLowerCase().contains(kw))) {
                                return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
        }

        // If still empty, fall back to a diverse selection
        if (matchedProducts.isEmpty()) {
            Map<String, Product> diverseMap = new HashMap<>();
            for (Product p : catalog) {
                if (p.getCategory() != null) {
                    diverseMap.putIfAbsent(p.getCategory(), p);
                }
            }
            matchedProducts = new ArrayList<>(diverseMap.values());
        }

        // Sort by rating desc
        matchedProducts.sort((p1, p2) -> Double.compare(
                p2.getRating() != null ? p2.getRating() : 0.0,
                p1.getRating() != null ? p1.getRating() : 0.0
        ));

        // Limit to 3 items
        List<Product> selectedProducts = matchedProducts.stream().limit(3).collect(Collectors.toList());

        // Build items list
        List<Map<String, Object>> items = new ArrayList<>();
        int[] allocations = selectedProducts.size() == 3 ? new int[]{50, 30, 20} :
                            selectedProducts.size() == 2 ? new int[]{60, 40} : new int[]{100};
        String[] priorities = new String[]{"Must Have", "Highly Recommended", "Nice to Have"};

        for (int i = 0; i < selectedProducts.size(); i++) {
            Product p = selectedProducts.get(i);
            items.add(Map.of(
                    "category", p.getCategory(),
                    "productId", p.getId(),
                    "budgetAllocationPct", allocations[i],
                    "priority", priorities[i]
            ));
        }

        // Build alternative cheaper recommendations
        List<Map<String, Object>> alternativeCheaper = new ArrayList<>();
        for (Product p : selectedProducts) {
            Optional<Product> cheaperOpt = catalog.stream()
                    .filter(alt -> alt.getCategory() != null && alt.getCategory().equals(p.getCategory()))
                    .filter(alt -> alt.getPrice() != null && p.getPrice() != null && alt.getPrice() < p.getPrice())
                    .min(Comparator.comparingDouble(Product::getPrice));

            if (cheaperOpt.isPresent()) {
                Product cheaper = cheaperOpt.get();
                alternativeCheaper.add(Map.of(
                        "originalProductId", p.getId(),
                        "alternativeProductId", cheaper.getId(),
                        "savingsCents", (int) Math.round(p.getPrice() - cheaper.getPrice())
                ));
            }
        }

        return Map.of(
                "description", String.format("A budget-friendly planner for your goal: %s.", title),
                "items", items,
                "priorityOrder", selectedProducts.stream().map(Product::getCategory).collect(Collectors.toList()),
                "alternativeCheaper", alternativeCheaper,
                "estimatedTotalCents", selectedProducts.stream().mapToDouble(p -> p.getPrice() != null ? p.getPrice() : 0.0).sum()
        );
    }
}
