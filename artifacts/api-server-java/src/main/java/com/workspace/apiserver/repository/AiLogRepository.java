package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.AiLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiLogRepository extends JpaRepository<AiLog, Integer> {
    List<AiLog> findBySessionId(String sessionId);
    List<AiLog> findBySessionId(String sessionId, Pageable pageable);
}
