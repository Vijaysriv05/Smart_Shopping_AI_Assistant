package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.ShoppingGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShoppingGoalRepository extends JpaRepository<ShoppingGoal, Integer> {
    List<ShoppingGoal> findBySessionId(String sessionId);
}
