package com.workspace.apiserver.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.apiserver.model.Category;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.repository.CategoryRepository;
import com.workspace.apiserver.repository.ProductRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            log.info("Checking database columns for potential order checkout schema conflicts...");
            jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN items JSON DEFAULT NULL");
            log.info("Successfully altered orders table to make items column nullable.");
        } catch (Exception e) {
            log.info("Notice: orders table items column modification skipped (either table/column does not exist or is already modified): {}", e.getMessage());
        }

        if (categoryRepository.count() == 0 && productRepository.count() == 0) {
            log.info("Database is empty. Starting database seeding from initial_data.json...");
            try {
                InputStream inputStream = new ClassPathResource("initial_data.json").getInputStream();
                InitialData data = objectMapper.readValue(inputStream, InitialData.class);

                log.info("Loaded {} categories and {} products from JSON.", 
                        data.getCategories().size(), data.getProducts().size());

                // Seed categories
                for (Category cat : data.getCategories()) {
                    // Set ID to null so Hibernate generates it starting from 1
                    cat.setId(null);
                    categoryRepository.save(cat);
                }
                log.info("Successfully seeded categories.");

                // Seed products
                for (Product prod : data.getProducts()) {
                    prod.setId(null);
                    if (prod.getCreatedAt() == null) {
                        prod.setCreatedAt(new Date());
                    }
                    productRepository.save(prod);
                }
                log.info("Successfully seeded products with real image URLs.");

            } catch (Exception e) {
                log.error("Failed to seed database: ", e);
            }
        } else {
            log.info("Database already contains data. Skipping seeding.");
        }
    }

    @Data
    private static class InitialData {
        private List<Category> categories;
        private List<Product> products;
    }
}
