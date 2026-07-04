package com.workspace.apiserver.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;
    
    @Column(columnDefinition = "TEXT")
    private String message;
    
    private String type; // "price_drop", "new_arrival", "discount"
    private Boolean isRead;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
