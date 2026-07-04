package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.ShoppingBehaviour;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShoppingBehaviourRepository extends JpaRepository<ShoppingBehaviour, Integer> {
    List<ShoppingBehaviour> findBySessionId(String sessionId);
}
