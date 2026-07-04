package com.workspace.apiserver.controller;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.workspace.apiserver.model.AiLog;
import com.workspace.apiserver.model.Order;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.model.User;
import com.workspace.apiserver.repository.AiLogRepository;
import com.workspace.apiserver.repository.OrderRepository;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.repository.UserRepository;
import com.workspace.apiserver.util.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AdminController {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AiLogRepository aiLogRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminOverviewStats {
        private int productCount;
        private int categoryCount;
        private int userCount;
        private int orderCount;
        private double totalRevenue;
        private int lowStockCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminOverviewResponse {
        private AdminOverviewStats stats;
        private List<Product> lowStock;
        private List<Order> recentOrders;
    }

    private DecodedJWT checkAdmin(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        String token = header.substring(7);
        DecodedJWT decoded = JwtUtils.verifyToken(token);
        if (decoded == null) {
            return null;
        }
        String role = decoded.getClaim("role").asString();
        if (!"admin".equalsIgnoreCase(role)) {
            return null;
        }
        return decoded;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(HttpServletRequest request) {
        try {
            DecodedJWT decoded = checkAdmin(request);
            if (decoded == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }

            List<Product> products = productRepository.findAll();
            List<User> users = userRepository.findAll();
            List<Order> orders = orderRepository.findAll();

            // Unique categories from products
            long categoryCount = products.stream()
                    .map(Product::getCategory)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();

            List<Product> lowStock = products.stream()
                    .filter(p -> p.getInStock() == null || !p.getInStock())
                    .limit(10)
                    .collect(Collectors.toList());

            double totalRevenue = orders.stream()
                    .mapToDouble(Order::getTotalAmount)
                    .sum();

            AdminOverviewStats stats = AdminOverviewStats.builder()
                    .productCount(products.size())
                    .categoryCount((int) categoryCount)
                    .userCount(users.size())
                    .orderCount(orders.size())
                    .totalRevenue(totalRevenue)
                    .lowStockCount(lowStock.size())
                    .build();

            // Recent orders (last 10)
            List<Order> recentOrders = orders.stream()
                    .sorted((o1, o2) -> {
                        if (o1.getCreatedAt() == null || o2.getCreatedAt() == null) return 0;
                        return o2.getCreatedAt().compareTo(o1.getCreatedAt());
                    })
                    .limit(10)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(AdminOverviewResponse.builder()
                    .stats(stats)
                    .lowStock(lowStock)
                    .recentOrders(recentOrders)
                    .build());
        } catch (Exception e) {
            log.error("Failed to fetch admin overview: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(HttpServletRequest request) {
        try {
            DecodedJWT decoded = checkAdmin(request);
            if (decoded == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            List<User> users = userRepository.findAll();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Failed to fetch admin users: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getOrders(HttpServletRequest request) {
        try {
            DecodedJWT decoded = checkAdmin(request);
            if (decoded == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            List<Order> orders = orderRepository.findAll();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Failed to fetch admin orders: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/ai-logs")
    public ResponseEntity<?> getAiLogs(HttpServletRequest request) {
        try {
            DecodedJWT decoded = checkAdmin(request);
            if (decoded == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            // Page request for the last 100 AI logs
            PageRequest pageRequest = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "timestamp"));
            List<AiLog> logs = aiLogRepository.findAll(pageRequest).getContent();
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            log.error("Failed to fetch admin AI logs: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/inventory")
    public ResponseEntity<?> getInventory(HttpServletRequest request) {
        try {
            DecodedJWT decoded = checkAdmin(request);
            if (decoded == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            List<Product> products = productRepository.findAll();
            List<Map<String, Object>> inventory = products.stream()
                    .map(p -> Map.<String, Object>of(
                            "id", p.getId(),
                            "name", p.getName(),
                            "brand", p.getBrand(),
                            "category", p.getCategory(),
                            "price", p.getPrice(),
                            "inStock", p.getInStock() != null ? p.getInStock() : false,
                            "rating", p.getRating(),
                            "reviewCount", p.getReviewCount()
                    ))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(inventory);
        } catch (Exception e) {
            log.error("Failed to fetch admin inventory: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
