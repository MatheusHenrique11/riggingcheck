package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "rigging_plan_versions", indexes = {
    @Index(name = "idx_version_plan", columnList = "plan_id"),
    @Index(name = "idx_version_empresa", columnList = "empresa_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class RiggingPlanVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "technical_status", columnDefinition = "VARCHAR(20)")
    private TechnicalStatus technicalStatus;

    @Column(name = "snapshot_json", columnDefinition = "TEXT")
    private String snapshotJson;

    @Column(name = "compliance_messages", columnDefinition = "TEXT")
    private String complianceMessages;

    @Column(name = "created_by_id")
    private UUID createdById;

    @Column(name = "created_by_name")
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
