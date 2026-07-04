package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Integer> {
    List<Chat> findBySessionId(String sessionId);

    @Transactional
    void deleteBySessionId(String sessionId);
}
