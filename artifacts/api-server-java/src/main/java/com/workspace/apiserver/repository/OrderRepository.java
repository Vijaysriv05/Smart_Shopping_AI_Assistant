package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findBySessionId(String sessionId);
}
