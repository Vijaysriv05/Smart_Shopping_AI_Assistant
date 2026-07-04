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
@Table(name = "inventory")
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private Integer productId;

    private Integer stock;
    private Integer velocityScore;
    private Integer daysUntilStockout;
    private Boolean shouldRestock;
    private String priority; // "critical", "high", "normal"

    @Temporal(TemporalType.TIMESTAMP)
    private Date lastRestocked;
}
