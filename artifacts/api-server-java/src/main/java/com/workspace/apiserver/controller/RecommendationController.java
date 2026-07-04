package com.workspace.apiserver.controller;

import com.workspace.apiserver.model.RecommendationHistory;
import com.workspace.apiserver.repository.RecommendationHistoryRepository;
import com.workspace.apiserver.util.SessionUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class RecommendationController {

    private final RecommendationHistoryRepository recommendationHistoryRepository;

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(HttpServletRequest request) {
        try {
            String sessionId = SessionUtils.getSessionId(request, null);
            List<RecommendationHistory> history = recommendationHistoryRepository.findBySessionId(sessionId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("Failed to fetch recommendation history: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
