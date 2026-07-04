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
@Table(name = "review_summaries")
public class ReviewSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private Integer productId;

    @Convert(converter = JsonConverters.StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> pros;

    @Convert(converter = JsonConverters.StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> cons;

    @Column(columnDefinition = "TEXT")
    private String commonComplaints;

    @Column(columnDefinition = "TEXT")
    private String overallOpinion;

    private String sentiment; // "Very Positive", "Positive", "Mixed", "Negative"
    private Integer fakeReviewScore; // 0-100 score of simulated fake review confidence

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;
}
