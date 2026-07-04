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
@Table(name = "product_comparisons")
public class ProductComparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;

    @Convert(converter = JsonConverters.IntegerListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<Integer> productIds;

    private Integer winnerId;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
