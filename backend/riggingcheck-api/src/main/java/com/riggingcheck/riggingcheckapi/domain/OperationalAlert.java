package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.SeveridadeAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAlerta;
import com.riggingcheck.riggingcheckapi.domain.enums.TipoAlerta;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Alerta operacional interno — Fase 19A.
 * Gerado automaticamente para condições críticas de acessórios, equipe e planos.
 * Não envia e-mail (escopo Fase 19B).
 */
@Entity
@Table(name = "operational_alerts", indexes = {
    @Index(name = "idx_alert_empresa",   columnList = "empresa_id"),
    @Index(name = "idx_alert_status",    columnList = "status"),
    @Index(name = "idx_alert_tipo",      columnList = "tipo"),
    @Index(name = "idx_alert_entidade",  columnList = "entidade_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class OperationalAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 40)
    private TipoAlerta tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "severidade", nullable = false, length = 20)
    private SeveridadeAlerta severidade;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    @Column(name = "mensagem", columnDefinition = "TEXT")
    private String mensagem;

    @Column(name = "entidade_tipo", length = 30)
    private String entidadeTipo;

    @Column(name = "entidade_id")
    private UUID entidadeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private StatusAlerta status = StatusAlerta.NOVO;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "acknowledged_by_id")
    private UUID acknowledgedById;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = StatusAlerta.NOVO;
    }
}
