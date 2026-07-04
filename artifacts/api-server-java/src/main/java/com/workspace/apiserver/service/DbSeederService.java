package com.workspace.apiserver.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.apiserver.model.Category;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.repository.CategoryRepository;
import com.workspace.apiserver.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Date;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class DbSeederService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    public void seedDatabase() {
        try {
            log.info("Checking database seeding requirements...");
            long categoryCount = categoryRepository.count();
            long productCount = productRepository.count();

            if (categoryCount == 0 || productCount == 0) {
                log.info("Database is empty or missing collections. Seeding from initial_data.json...");
                ClassPathResource resource = new ClassPathResource("initial_data.json");
                try (InputStream inputStream = resource.getInputStream()) {
                    JsonNode root = objectMapper.readTree(inputStream);

                    if (categoryCount == 0 && root.has("categories")) {
                        List<Category> categories = objectMapper.convertValue(
                                root.get("categories"),
                                new TypeReference<List<Category>>() {}
                        );
                        categoryRepository.saveAll(categories);
                        log.info("Successfully seeded {} categories.", categories.size());
                    } else {
                        log.info("Categories collection already has data. Skipping category seeding.");
                    }

                    if (productCount == 0 && root.has("products")) {
                        List<Product> products = objectMapper.convertValue(
                                root.get("products"),
                                new TypeReference<List<Product>>() {}
                        );
                        for (Product product : products) {
                            if (product.getCreatedAt() == null) {
                                product.setCreatedAt(new Date());
                            }
                        }
                        productRepository.saveAll(products);
                        log.info("Successfully seeded {} products.", products.size());
                    } else {
                        log.info("Products collection already has data. Skipping product seeding.");
                    }
                }
            } else {
                log.info("Database already seeded with products and categories. Skipping seeding.");
            }
        } catch (Exception e) {
            log.error("Failed to seed database: ", e);
        }
    }
}
