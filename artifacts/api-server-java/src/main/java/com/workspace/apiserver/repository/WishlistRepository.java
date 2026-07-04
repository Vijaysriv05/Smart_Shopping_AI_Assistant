package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<WishlistItem, Integer> {
    List<WishlistItem> findBySessionId(String sessionId);
    Optional<WishlistItem> findBySessionIdAndProductId(String sessionId, Integer productId);

    @Transactional
    void deleteBySessionIdAndProductId(String sessionId, Integer productId);
}
