package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.Analytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalyticsRepository extends JpaRepository<Analytics, Integer> {
    List<Analytics> findByMetricName(String metricName);
}
