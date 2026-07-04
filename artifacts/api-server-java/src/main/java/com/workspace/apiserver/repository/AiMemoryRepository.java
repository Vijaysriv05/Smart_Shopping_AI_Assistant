package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.AiMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiMemoryRepository extends JpaRepository<AiMemory, Integer> {
    Optional<AiMemory> findBySessionId(String sessionId);
}
