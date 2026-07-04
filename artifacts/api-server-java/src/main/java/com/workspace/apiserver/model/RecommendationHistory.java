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
@Table(name = "recommendation_history")
public class RecommendationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;
    
    @Column(columnDefinition = "TEXT")
    private String query;
    
    @Column(columnDefinition = "TEXT")
    private String reasoning;

    @Convert(converter = JsonConverters.IntegerListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<Integer> productIds;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
