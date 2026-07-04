package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.RecommendationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationFeedbackRepository extends JpaRepository<RecommendationFeedback, Integer> {
    List<RecommendationFeedback> findBySessionId(String sessionId);
}
