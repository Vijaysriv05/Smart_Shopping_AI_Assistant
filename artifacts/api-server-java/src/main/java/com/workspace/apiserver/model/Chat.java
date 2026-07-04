package com.workspace.apiserver.model;

import com.workspace.apiserver.util.JsonConverters;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "chats")
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;
    
    private String role; // "user" or "ai"
    
    @Column(columnDefinition = "TEXT")
    private String content;

    @Convert(converter = JsonConverters.ObjectListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<Object> products;

    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp;
}
