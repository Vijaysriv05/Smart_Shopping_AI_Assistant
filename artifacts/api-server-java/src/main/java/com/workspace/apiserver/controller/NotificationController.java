package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.Notification;
import com.workspace.apiserver.repository.NotificationRepository;
import com.workspace.apiserver.util.SessionUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ai/notifications")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<Notification> alerts = notificationRepository.findBySessionIdOrderByCreatedAtDesc(sessionId);
            
            // Seed a dynamic welcome alert if notifications list is empty
            if (alerts.isEmpty()) {
                Notification alert = Notification.builder()
                        .sessionId(sessionId)
                        .message("Welcome to Goval AI! I will keep you updated on price drops, special discounts, and new arrivals.")
                        .type("welcome")
                        .isRead(false)
                        .createdAt(new Date())
                        .build();
                notificationRepository.save(alert);
                alerts = List.of(alert);
            }
            
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("Failed to load notifications: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/read/{id}")
    public ResponseEntity<?> markAsRead(@PathVariable Integer id) {
        try {
            Optional<Notification> alertOpt = notificationRepository.findById(id);
            if (alertOpt.isPresent()) {
                Notification alert = alertOpt.get();
                alert.setIsRead(true);
                notificationRepository.save(alert);
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to mark alert as read: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<Notification> unread = notificationRepository.findBySessionIdAndIsRead(sessionId, false);
            unread.forEach(u -> u.setIsRead(true));
            notificationRepository.saveAll(unread);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Failed to mark all alerts as read: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
