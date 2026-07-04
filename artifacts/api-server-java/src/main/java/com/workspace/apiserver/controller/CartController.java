package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.CartItem;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.model.ShoppingBehaviour;
import com.workspace.apiserver.repository.CartRepository;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.repository.ShoppingBehaviourRepository;
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

import java.util.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class CartController {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final ShoppingBehaviourRepository shoppingBehaviourRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItemResponse {
        private Integer id;
        private String sessionId;
        private Integer productId;
        private Integer quantity;
        private Product product;
        private Date addedAt;
    }

    @GetMapping
    public ResponseEntity<List<CartItemResponse>> getCart(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<CartItem> items = cartRepository.findBySessionId(sessionId);
            List<CartItemResponse> responses = new ArrayList<>();

            for (CartItem item : items) {
                Optional<Product> product = productRepository.findById(item.getProductId());
                if (product.isPresent()) {
                    responses.add(CartItemResponse.builder()
                            .id(item.getId())
                            .sessionId(item.getSessionId())
                            .productId(item.getProductId())
                            .quantity(item.getQuantity())
                            .product(product.get())
                            .addedAt(item.getAddedAt())
                            .build());
                }
            }
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Failed to fetch cart: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addToCart(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Integer productId = (Integer) body.get("productId");
            Integer quantity = (Integer) body.getOrDefault("quantity", 1);
            String requestSessionId = (String) body.get("sessionId");
            String sessionId = SessionUtils.getSessionId(request, requestSessionId);

            if (productId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "productId required"));
            }

            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Product not found"));
            }

            Optional<CartItem> existing = cartRepository.findBySessionIdAndProductId(sessionId, productId);
            CartItem savedItem;
            if (existing.isPresent()) {
                CartItem item = existing.get();
                item.setQuantity(item.getQuantity() + quantity);
                savedItem = cartRepository.save(item);
            } else {
                CartItem item = CartItem.builder()
                        .sessionId(sessionId)
                        .productId(productId)
                        .quantity(quantity)
                        .addedAt(new Date())
                        .build();
                savedItem = cartRepository.save(item);
            }

            // Save behavior
            ShoppingBehaviour behaviour = ShoppingBehaviour.builder()
                    .sessionId(sessionId)
                    .actionType("add_to_cart")
                    .details(Map.of("productId", productId, "quantity", quantity))
                    .timestamp(new Date())
                    .build();
            shoppingBehaviourRepository.save(behaviour);

            CartItemResponse response = CartItemResponse.builder()
                    .id(savedItem.getId())
                    .sessionId(savedItem.getSessionId())
                    .productId(savedItem.getProductId())
                    .quantity(savedItem.getQuantity())
                    .product(productOpt.get())
                    .addedAt(savedItem.getAddedAt())
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to add to cart: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> removeFromCart(@PathVariable Integer id) {
        try {
            cartRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to remove from cart by id {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
