package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.ApprovalComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApprovalCommentRepository extends JpaRepository<ApprovalComment, UUID> {
    List<ApprovalComment> findByPlanIdOrderByCreatedAtAsc(UUID planId);
    List<ApprovalComment> findByPlanIdAndVersionNumberOrderByCreatedAtAsc(UUID planId, Integer versionNumber);
}
