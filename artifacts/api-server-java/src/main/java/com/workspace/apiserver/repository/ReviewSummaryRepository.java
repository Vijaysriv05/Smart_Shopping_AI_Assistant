package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.ReviewSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReviewSummaryRepository extends JpaRepository<ReviewSummary, Integer> {
    Optional<ReviewSummary> findByProductId(Integer productId);
}
