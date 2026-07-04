package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.model.ShoppingBehaviour;
import com.workspace.apiserver.model.WishlistItem;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.repository.ShoppingBehaviourRepository;
import com.workspace.apiserver.repository.WishlistRepository;
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
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class WishlistController {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final ShoppingBehaviourRepository shoppingBehaviourRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WishlistItemResponse {
        private Integer id;
        private String sessionId;
        private Integer productId;
        private Product product;
        private Date addedAt;
    }

    @GetMapping
    public ResponseEntity<List<WishlistItemResponse>> getWishlist(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<WishlistItem> items = wishlistRepository.findBySessionId(sessionId);
            List<WishlistItemResponse> responses = new ArrayList<>();

            for (WishlistItem item : items) {
                Optional<Product> product = productRepository.findById(item.getProductId());
                if (product.isPresent()) {
                    responses.add(WishlistItemResponse.builder()
                            .id(item.getId())
                            .sessionId(item.getSessionId())
                            .productId(item.getProductId())
                            .product(product.get())
                            .addedAt(item.getAddedAt())
                            .build());
                }
            }
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Failed to fetch wishlist: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addToWishlist(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Integer productId = (Integer) body.get("productId");
            String requestSessionId = (String) body.get("sessionId");
            String sessionId = SessionUtils.getSessionId(request, requestSessionId);

            if (productId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "productId required"));
            }

            Optional<Product> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Product not found"));
            }

            Optional<WishlistItem> existing = wishlistRepository.findBySessionIdAndProductId(sessionId, productId);
            WishlistItem savedItem;
            if (existing.isPresent()) {
                savedItem = existing.get();
            } else {
                WishlistItem item = WishlistItem.builder()
                        .sessionId(sessionId)
                        .productId(productId)
                        .addedAt(new Date())
                        .build();
                savedItem = wishlistRepository.save(item);
            }

            // Save behavior
            ShoppingBehaviour behaviour = ShoppingBehaviour.builder()
                    .sessionId(sessionId)
                    .actionType("wishlist_add")
                    .details(Map.of("productId", productId))
                    .timestamp(new Date())
                    .build();
            shoppingBehaviourRepository.save(behaviour);

            WishlistItemResponse response = WishlistItemResponse.builder()
                    .id(savedItem.getId())
                    .sessionId(savedItem.getSessionId())
                    .productId(savedItem.getProductId())
                    .product(productOpt.get())
                    .addedAt(savedItem.getAddedAt())
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to add to wishlist: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> removeFromWishlist(@PathVariable Integer id) {
        try {
            wishlistRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to remove from wishlist by id {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
