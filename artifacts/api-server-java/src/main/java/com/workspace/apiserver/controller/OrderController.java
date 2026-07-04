package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.CartItem;
import com.workspace.apiserver.model.Order;
import com.workspace.apiserver.model.OrderItem;
import com.workspace.apiserver.model.Product;
import com.workspace.apiserver.model.ShoppingBehaviour;
import com.workspace.apiserver.repository.CartRepository;
import com.workspace.apiserver.repository.OrderRepository;
import com.workspace.apiserver.repository.ProductRepository;
import com.workspace.apiserver.repository.ShoppingBehaviourRepository;
import com.workspace.apiserver.util.SessionUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final ShoppingBehaviourRepository shoppingBehaviourRepository;

    @GetMapping
    public ResponseEntity<List<Order>> getOrders(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<Order> orders = orderRepository.findBySessionId(sessionId);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Failed to fetch orders: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createOrder(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<CartItem> cartItems = cartRepository.findBySessionId(sessionId);

            if (cartItems.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Cart is empty"));
            }

            Order order = Order.builder()
                    .sessionId(sessionId)
                    .status("confirmed")
                    .createdAt(new Date())
                    .build();

            List<OrderItem> items = new ArrayList<>();
            double totalAmount = 0.0;

            for (CartItem item : cartItems) {
                Optional<Product> productOpt = productRepository.findById(item.getProductId());
                if (productOpt.isPresent()) {
                    Product product = productOpt.get();
                    items.add(OrderItem.builder()
                            .order(order)
                            .productId(item.getProductId())
                            .name(product.getName())
                            .price(product.getPrice())
                            .quantity(item.getQuantity())
                            .build());
                    totalAmount += product.getPrice() * item.getQuantity();
                }
            }

            if (items.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Products in cart not found"));
            }

            order.setItems(items);
            order.setTotalAmount(totalAmount);

            Order savedOrder = orderRepository.save(order);

            // Clear Cart
            cartRepository.deleteBySessionId(sessionId);

            // Track behavior
            ShoppingBehaviour behaviour = ShoppingBehaviour.builder()
                    .sessionId(sessionId)
                    .actionType("checkout")
                    .details(Map.of("orderId", savedOrder.getId(), "totalAmount", totalAmount))
                    .timestamp(new Date())
                    .build();
            shoppingBehaviourRepository.save(behaviour);

            return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
        } catch (Exception e) {
            log.error("Checkout failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
