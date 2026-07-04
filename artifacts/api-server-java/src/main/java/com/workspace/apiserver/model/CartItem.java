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
@Table(name = "cart", uniqueConstraints = {
    @UniqueConstraint(name = "session_product_idx", columnNames = {"sessionId", "productId"})
})
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;
    private Integer productId;
    private Integer quantity;

    @Temporal(TemporalType.TIMESTAMP)
    private Date addedAt;
}
