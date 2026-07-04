package com.workspace.apiserver.model;

import com.workspace.apiserver.util.JsonConverters;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "shopping_behaviour")
public class ShoppingBehaviour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String sessionId;
    private String actionType;

    @Convert(converter = JsonConverters.StringMapConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> details;

    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp;
}
