package com.workspace.apiserver.model;

import com.workspace.apiserver.util.JsonConverters;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "shopping_reports")
public class ShoppingReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;
    
    private Integer totalOrders;
    private Double totalSpending;
    private Double totalSavings;
    private Integer couponsUsed;

    @Convert(converter = JsonConverters.StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> favoriteBrands;

    @Convert(converter = JsonConverters.StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> favoriteCategories;

    @Convert(converter = JsonConverters.StringMapConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> monthlySpending;

    @Convert(converter = JsonConverters.StringMapConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> weeklySpending;

    @Convert(converter = JsonConverters.StringMapConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> yearlySpending;

    private String trend;
    private Double budgetUtilization;
    private Double recommendationAccuracy;
    private Integer acceptedSuggestions;
    private Integer ignoredSuggestions;
    private Integer shoppingScore;
    private Integer loyaltyScore;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;
}
