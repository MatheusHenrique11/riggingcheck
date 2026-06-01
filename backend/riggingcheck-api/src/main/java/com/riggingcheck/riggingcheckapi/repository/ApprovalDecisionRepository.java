package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.ApprovalDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApprovalDecisionRepository extends JpaRepository<ApprovalDecision, UUID> {
    List<ApprovalDecision> findByPlanIdOrderByDecidedAtDesc(UUID planId);
}
