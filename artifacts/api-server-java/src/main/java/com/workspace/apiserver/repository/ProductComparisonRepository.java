package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.ProductComparison;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductComparisonRepository extends JpaRepository<ProductComparison, Integer> {
    List<ProductComparison> findBySessionId(String sessionId);
}
