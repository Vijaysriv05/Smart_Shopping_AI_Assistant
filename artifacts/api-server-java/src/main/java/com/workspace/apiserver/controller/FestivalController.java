package com.workspace.apiserver.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.apiserver.model.FestivalOffer;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.repository.FestivalOfferRepository;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.service.AiService;
import com.workspace.apiserver.util.PromptTemplates;
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
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/festivals")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class FestivalController {

    private final FestivalOfferRepository festivalOfferRepository;
    private final ProductRepository productRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EventSummary {
        private String name;
        private String description;
        private int daysRemaining;
        private String targetCategory;
        private List<Map<String, Object>> recommendations;
        private List<Map<String, Object>> giftCombinations;
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveFestivalOffers() {
        try {
            LocalDate today = LocalDate.now();
            int month = today.getMonthValue();

            // Detect current event name based on calendar month
            String detectedEventName;
            String defaultCategory;
            if (month == 1) {
                detectedEventName = "Pongal & New Year Sale";
                defaultCategory = "Fashion";
            } else if (month == 2) {
                detectedEventName = "Valentine's Day Sale";
                defaultCategory = "Smartwatches";
            } else if (month == 5) {
                detectedEventName = "Mother's Day";
                defaultCategory = "Tablets";
            } else if (month == 6) {
                detectedEventName = "Back to School & Father's Day";
                defaultCategory = "Laptops";
            } else if (month == 7 || month == 8) {
                detectedEventName = "Monsoon Offers & Summer Sale";
                defaultCategory = "Headphones";
            } else if (month == 10 || month == 11) {
                detectedEventName = "Diwali Festival & Black Friday";
                defaultCategory = "Smartphones";
            } else {
                detectedEventName = "Christmas & Winter Sale";
                defaultCategory = "Laptops";
            }

            List<Product> catalog = productRepository.findAll();
            if (catalog.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            // Build dynamic countdown (e.g. end of the current month)
            LocalDate targetEnd = today.withDayOfMonth(today.lengthOfMonth());
            int daysRemaining = (int) ChronoUnit.DAYS.between(today, targetEnd);
            if (daysRemaining <= 0) daysRemaining = 12; // safety fallback

            // Query Gemini to analyze catalog and generate festival layout
            Map<String, Object> festivalData;
            try {
                String prompt = PromptTemplates.buildFestivalPrompt(detectedEventName, catalog);
                String responseText = aiService.callGemini(prompt, true);
                festivalData = objectMapper.readValue(responseText.trim(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.warn("Gemini festival generation failed, using rule-based fallback: {}", e.getMessage());
                festivalData = buildFallbackFestivalData(detectedEventName, catalog, defaultCategory);
            }

            // Map results to final summary
            String eventDescription = (String) festivalData.getOrDefault("eventDescription", "Seasonal thematic shopping campaign.");
            List<Map<String, Object>> rawOffers = (List<Map<String, Object>>) festivalData.getOrDefault("offers", List.of());
            List<Map<String, Object>> rawBundles = (List<Map<String, Object>>) festivalData.getOrDefault("giftCombinations", List.of());

            List<Map<String, Object>> recommendations = new ArrayList<>();
            for (Map<String, Object> offer : rawOffers) {
                Number pidNum = (Number) offer.get("productId");
                if (pidNum == null) continue;
                int pid = pidNum.intValue();

                Optional<Product> prodOpt = catalog.stream().filter(p -> p.getId() == pid).findFirst();
                if (prodOpt.isPresent()) {
                    Product p = prodOpt.get();
                    recommendations.add(Map.of(
                            "product", p,
                            "discountPct", offer.getOrDefault("discountPct", 15),
                            "thematicReason", offer.getOrDefault("thematicReason", "Fits the festival shopping mood.")
                    ));
                }
            }

            List<Map<String, Object>> giftCombinations = new ArrayList<>();
            for (Map<String, Object> bundle : rawBundles) {
                List<Number> pids = (List<Number>) bundle.get("productIds");
                List<Product> bundleProducts = new ArrayList<>();
                if (pids != null) {
                    for (Number pid : pids) {
                        catalog.stream().filter(p -> p.getId().equals(pid.intValue())).findFirst()
                                .ifPresent(bundleProducts::add);
                    }
                }
                giftCombinations.add(Map.of(
                        "bundleName", bundle.getOrDefault("bundleName", "Seasonal Gift Combo"),
                        "products", bundleProducts,
                        "discountPct", bundle.getOrDefault("totalThematicDiscountPct", 20)
                ));
            }

            EventSummary summary = EventSummary.builder()
                    .name(detectedEventName)
                    .description(eventDescription)
                    .daysRemaining(daysRemaining)
                    .targetCategory(defaultCategory)
                    .recommendations(recommendations)
                    .giftCombinations(giftCombinations)
                    .build();

            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Failed to load active festival offers: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private Map<String, Object> buildFallbackFestivalData(String eventName, List<Product> catalog, String category) {
        List<Product> filtered = catalog.stream()
                .filter(p -> category.equalsIgnoreCase(p.getCategory()))
                .limit(4)
                .collect(Collectors.toList());
        if (filtered.isEmpty()) {
            filtered = catalog.stream().limit(4).collect(Collectors.toList());
        }

        List<Map<String, Object>> offers = new ArrayList<>();
        for (Product p : filtered) {
            offers.add(Map.of(
                    "productId", p.getId(),
                    "thematicReason", String.format("Highly rated %s from %s makes a great item for %s.", p.getName(), p.getBrand(), eventName),
                    "discountPct", 15
            ));
        }

        List<Map<String, Object>> bundles = new ArrayList<>();
        if (filtered.size() >= 2) {
            bundles.add(Map.of(
                    "bundleName", eventName + " Premium Combo",
                    "productIds", List.of(filtered.get(0).getId(), filtered.get(1).getId()),
                    "totalThematicDiscountPct", 20
            ));
        }

        return Map.of(
                "eventDescription", String.format("Celebrate %s with exclusive deals on top-tier products.", eventName),
                "offers", offers,
                "giftCombinations", bundles
        );
    }
}
