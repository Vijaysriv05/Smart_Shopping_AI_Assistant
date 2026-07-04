package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.model.Category;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.repository.CategoryRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<Product>> listProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "50") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset) {

        try {
            String filterSearch = search;
            String filterCategory = category;
            String filterBrand = brand;
            Double filterMinPrice = minPrice;
            Double filterMaxPrice = maxPrice;

            if (search != null && !search.trim().isEmpty()) {
                ParsedNL parsedNL = parseNaturalLanguage(search);
                if (filterCategory == null) filterCategory = parsedNL.getCategory();
                if (filterBrand == null) filterBrand = parsedNL.getBrand();
                if (filterMinPrice == null) filterMinPrice = parsedNL.getMinPrice();
                if (filterMaxPrice == null) filterMaxPrice = parsedNL.getMaxPrice();
                filterSearch = parsedNL.getSearch();
            }

            final String finalCat = filterCategory;
            final String finalBrand = filterBrand;
            final Double finalMinPrice = filterMinPrice;
            final Double finalMaxPrice = filterMaxPrice;
            final String finalSearch = filterSearch;

            // Fetch products
            List<Product> products = productRepository.findAll();

            // Filter in memory for compatibility and natural language searches
            Stream<Product> stream = products.stream();

            if (finalCat != null && !finalCat.trim().isEmpty()) {
                stream = stream.filter(p -> finalCat.equalsIgnoreCase(p.getCategory()));
            }
            if (finalBrand != null && !finalBrand.trim().isEmpty()) {
                stream = stream.filter(p -> finalBrand.equalsIgnoreCase(p.getBrand()));
            }
            if (finalMinPrice != null) {
                stream = stream.filter(p -> p.getPrice() >= finalMinPrice);
            }
            if (finalMaxPrice != null) {
                stream = stream.filter(p -> p.getPrice() <= finalMaxPrice);
            }
            if (finalSearch != null && !finalSearch.trim().isEmpty()) {
                String searchLower = finalSearch.toLowerCase().trim();
                stream = stream.filter(p -> 
                    (p.getName() != null && p.getName().toLowerCase().contains(searchLower)) ||
                    (p.getBrand() != null && p.getBrand().toLowerCase().contains(searchLower)) ||
                    (p.getCategory() != null && p.getCategory().toLowerCase().contains(searchLower)) ||
                    (p.getDescription() != null && p.getDescription().toLowerCase().contains(searchLower))
                );
            }

            // Sorting by ID descending (which acts like createdAt DESC)
            List<Product> filtered = stream
                    .sorted((p1, p2) -> p2.getId().compareTo(p1.getId()))
                    .skip(offset)
                    .limit(limit)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(filtered);

        } catch (Exception e) {
            log.error("Failed to list products: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/featured")
    public ResponseEntity<List<Product>> getFeaturedProducts() {
        try {
            List<Product> featured = productRepository.findByIsFeatured(true);
            return ResponseEntity.ok(featured);
        } catch (Exception e) {
            log.error("Failed to get featured products: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Integer id) {
        try {
            Optional<Product> product = productRepository.findById(id);
            return product.map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        } catch (Exception e) {
            log.error("Failed to get product by id {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product productInput) {
        try {
            productInput.setCreatedAt(new Date());
            if (productInput.getInStock() == null) productInput.setInStock(true);
            if (productInput.getIsFeatured() == null) productInput.setIsFeatured(false);
            if (productInput.getRating() == null) productInput.setRating(0.0);
            if (productInput.getReviewCount() == null) productInput.setReviewCount(0);

            Product saved = productRepository.save(productInput);
            updateCategoryCounts();

            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            log.error("Failed to create product: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private void updateCategoryCounts() {
        try {
            categoryRepository.findAll().forEach(cat -> {
                long count = productRepository.findByCategory(cat.getName()).size();
                cat.setProductCount((int) count);
                categoryRepository.save(cat);
            });
        } catch (Exception e) {
            log.error("Failed to update category product counts: ", e);
        }
    }

    @Data
    @Builder
    private static class ParsedNL {
        private String category;
        private String brand;
        private Double minPrice;
        private Double maxPrice;
        private String search;
    }

    private ParsedNL parseNaturalLanguage(String search) {
        String cleanSearch = search.toLowerCase().trim();
        String category = null;
        String brand = null;
        Double maxPrice = null;
        Double minPrice = null;
        String remainingQuery = search;

        // 1. Extract Price (under/below/less than)
        Pattern underPattern = Pattern.compile("(?:under|below|less than|max|budget)\\s*(?:rs\\.?|rs|inr|\\$|₹)?\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
        Matcher underMatcher = underPattern.matcher(cleanSearch);
        if (underMatcher.find()) {
            maxPrice = Double.parseDouble(underMatcher.group(1)) * 100;
        }

        Pattern overPattern = Pattern.compile("(?:over|above|more than|min)\\s*(?:rs\\.?|rs|inr|\\$|₹)?\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
        Matcher overMatcher = overPattern.matcher(cleanSearch);
        if (overMatcher.find()) {
            minPrice = Double.parseDouble(overMatcher.group(1)) * 100;
        }

        // 2. Category Maps
        Map<String, String[]> categoryKeywords = new HashMap<>();
        categoryKeywords.put("Laptops", new String[]{"laptop", "laptops", "macbook"});
        categoryKeywords.put("Smartphones", new String[]{"phone", "smartphone", "mobile", "iphone"});
        categoryKeywords.put("Headphones", new String[]{"headphone", "headphones", "earbud", "earbuds"});
        categoryKeywords.put("Tablets", new String[]{"tablet", "tablets", "ipad"});
        categoryKeywords.put("Smartwatches", new String[]{"watch", "smartwatch", "fitness tracker"});

        for (Map.Entry<String, String[]> entry : categoryKeywords.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (cleanSearch.contains(keyword)) {
                    category = entry.getKey();
                    break;
                }
            }
            if (category != null) break;
        }

        // 3. Brands Maps
        String[] brands = new String[]{"Apple", "Samsung", "Google", "Dell", "Sony", "Bose", "HP", "Lenovo", "Asus", "Xiaomi", "OnePlus"};
        for (String b : brands) {
            if (cleanSearch.contains(b.toLowerCase())) {
                brand = b;
                break;
            }
        }

        return ParsedNL.builder()
                .category(category)
                .brand(brand)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .search(remainingQuery)
                .build();
    }
}
