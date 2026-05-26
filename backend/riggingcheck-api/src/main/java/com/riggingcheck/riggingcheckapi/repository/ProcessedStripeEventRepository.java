package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.ProcessedStripeEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProcessedStripeEventRepository extends JpaRepository<ProcessedStripeEvent, UUID> {

    boolean existsByStripeEventId(String stripeEventId);
}
