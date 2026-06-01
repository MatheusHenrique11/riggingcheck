package com.riggingcheck.riggingcheckapi.repository;

import com.riggingcheck.riggingcheckapi.domain.RiggingPlanVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RiggingPlanVersionRepository extends JpaRepository<RiggingPlanVersion, UUID> {
    List<RiggingPlanVersion> findByPlanIdOrderByVersionNumberDesc(UUID planId);
    Optional<RiggingPlanVersion> findByPlanIdAndVersionNumber(UUID planId, int versionNumber);
    int countByPlanId(UUID planId);
}
