package com.riggingcheck.riggingcheckapi.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vínculo entre um plano de içamento (SolicitacaoLiberacao) e um acessório do inventário.
 * Armazena snapshot do estado técnico no momento da submissão, garantindo rastreabilidade
 * mesmo que o acessório seja alterado no inventário posteriormente.
 */
@Entity
@Table(name = "rigging_plan_accessories", indexes = {
    @Index(name = "idx_plan_acc_solicitacao", columnList = "solicitacao_liberacao_id"),
    @Index(name = "idx_plan_acc_empresa",     columnList = "empresa_id"),
    @Index(name = "idx_plan_acc_acessorio",   columnList = "acessorio_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiggingPlanAccessory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "solicitacao_liberacao_id", nullable = false)
    private UUID solicitacaoLiberacaoId;

    @Column(name = "acessorio_id", nullable = false)
    private UUID acessorioId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    // ── Snapshot do inventário no momento da submissão ────────────────────────────

    @Column(name = "codigo_interno_snapshot", nullable = false, length = 100)
    private String codigoInternoSnapshot;

    @Column(name = "tipo_snapshot", length = 30)
    private String tipoSnapshot;

    @Column(name = "descricao_snapshot", length = 500)
    private String descricaoSnapshot;

    @Column(name = "wll_kg_snapshot")
    private Double wllKgSnapshot;

    @Column(name = "status_snapshot", length = 20)
    private String statusSnapshot;

    @Column(name = "certificado_status_snapshot", length = 20)
    private String certificadoStatusSnapshot;

    @Column(name = "ultima_inspecao_resultado_snapshot", length = 30)
    private String ultimaInspecaoResultadoSnapshot;

    // ── Dados do plano ────────────────────────────────────────────────────────────

    @Column(name = "carga_aplicada_kg")
    private Double cargaAplicadaKg;

    @Column(name = "observacao", length = 500)
    private String observacao;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
