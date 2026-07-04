package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findBySessionIdOrderByCreatedAtDesc(String sessionId);
    List<Notification> findBySessionIdAndIsRead(String sessionId, Boolean isRead);
}
