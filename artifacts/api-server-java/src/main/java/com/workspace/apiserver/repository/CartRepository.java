package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<CartItem, Integer> {
    List<CartItem> findBySessionId(String sessionId);
    Optional<CartItem> findBySessionIdAndProductId(String sessionId, Integer productId);
    
    @Transactional
    void deleteBySessionId(String sessionId);

    @Transactional
    void deleteBySessionIdAndProductId(String sessionId, Integer productId);
}
