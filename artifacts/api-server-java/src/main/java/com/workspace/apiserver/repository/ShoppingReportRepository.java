package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.ShoppingReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShoppingReportRepository extends JpaRepository<ShoppingReport, Integer> {
    Optional<ShoppingReport> findBySessionId(String sessionId);
}
