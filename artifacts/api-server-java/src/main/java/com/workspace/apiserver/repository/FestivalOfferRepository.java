package com.workspace.apiserver.repository;

import com.workspace.apiserver.model.FestivalOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FestivalOfferRepository extends JpaRepository<FestivalOffer, Integer> {
    List<FestivalOffer> findByIsActive(Boolean isActive);
}
