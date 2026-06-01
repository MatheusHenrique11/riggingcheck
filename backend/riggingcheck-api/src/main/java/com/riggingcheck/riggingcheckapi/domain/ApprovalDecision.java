package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "approval_decisions", indexes = {
    @Index(name = "idx_decision_plan", columnList = "plan_id"),
    @Index(name = "idx_decision_empresa", columnList = "empresa_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class ApprovalDecision {

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
    @Column(name = "decision", nullable = false, columnDefinition = "VARCHAR(40)")
    private WorkflowStatus decision;

    @Column(name = "decided_by_id", nullable = false)
    private UUID decidedById;

    @Column(name = "decided_by_name", nullable = false)
    private String decidedByName;

    @Column(name = "decided_by_role", length = 50)
    private String decidedByRole;

    @Column(name = "justification", columnDefinition = "TEXT")
    private String justification;

    /** true quando SUPER_ADMIN/SAFETY_ADMIN libera plano tecnicamente BLOCKED. */
    @Builder.Default
    @Column(name = "is_exception", nullable = false)
    private Boolean isException = false;

    @Column(name = "decided_at", nullable = false)
    private LocalDateTime decidedAt;

    @PrePersist
    protected void onCreate() {
        decidedAt = LocalDateTime.now();
    }
}
