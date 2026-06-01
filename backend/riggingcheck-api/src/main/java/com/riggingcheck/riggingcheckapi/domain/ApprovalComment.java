package com.riggingcheck.riggingcheckapi.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "approval_comments", indexes = {
    @Index(name = "idx_comment_plan", columnList = "plan_id"),
    @Index(name = "idx_comment_empresa", columnList = "empresa_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class ApprovalComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "author_name", nullable = false)
    private String authorName;

    @Column(name = "author_role", length = 50)
    private String authorRole;

    /** Campo específico sendo comentado (nullable = comentário geral). */
    @Column(name = "field_ref", length = 100)
    private String fieldRef;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "version_number")
    private Integer versionNumber;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
