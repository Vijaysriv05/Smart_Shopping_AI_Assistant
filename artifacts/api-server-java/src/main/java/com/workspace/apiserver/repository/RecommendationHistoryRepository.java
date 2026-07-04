package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.RecommendationHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Integer> {
    List<RecommendationHistory> findBySessionId(String sessionId);
    List<RecommendationHistory> findBySessionId(String sessionId, Pageable pageable);
}
