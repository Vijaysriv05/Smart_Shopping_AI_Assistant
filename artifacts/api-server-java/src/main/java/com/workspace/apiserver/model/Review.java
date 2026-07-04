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
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer productId;
    private String reviewerName;
    private Double rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    private String sentiment; // e.g., "Positive", "Negative", "Neutral"
    private Boolean isFake; // Flag for fake review detection

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
