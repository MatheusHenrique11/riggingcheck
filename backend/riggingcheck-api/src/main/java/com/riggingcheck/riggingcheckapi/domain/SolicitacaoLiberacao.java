package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "solicitacoes_liberacao")
@Data
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class SolicitacaoLiberacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "empresa_nome", nullable = false)
    private String empresaNome;

    @Column(name = "operacao_os", nullable = false)
    private String operacaoOs;

    @Column(name = "rigger_nome", nullable = false)
    private String riggerNome;

    @Column(name = "solicitado_por_id", nullable = false)
    private UUID solicitadoPorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private StatusLiberacao status;

    // ── Dados de Capacidade ──────────────────────────────────────────────────────
    @Column(name = "cap_guindaste_kg")
    private Double capGuindasteKg;

    @Column(name = "cap_carga_kg")
    private Double capCargaKg;

    @Column(name = "cap_aparelho_kg")
    private Double capAparelhoKg;

    @Column(name = "cap_total_kg")
    private Double capTotalKg;

    @Column(name = "cap_uso_percent")
    private Double capUsoPercent;

    @Column(name = "cap_risco")
    private String capRisco;

    // ── Dados de Eslinga ─────────────────────────────────────────────────────────
    @Column(name = "esl_num_pernas")
    private Integer eslNumPernas;

    @Column(name = "esl_angulo_graus")
    private Double eslAnguloGraus;

    @Column(name = "esl_tensao_por_perna_kg")
    private Double eslTensaoPorPernaKg;

    @Column(name = "esl_fator_carga")
    private Double eslFatorCarga;

    @Column(name = "esl_risco")
    private String eslRisco;

    @Column(name = "esl_angulo_aviso")
    private Boolean eslAnguloAviso;

    @Column(name = "esl_wll_kg")
    private Double eslWllKg;

    @Column(name = "esl_wll_uso_percent")
    private Double eslWllUsoPercent;

    @Column(name = "esl_tem_manilha")
    private Boolean eslTemManilha;

    @Column(name = "esl_manilha_capacidade_kg")
    private Double eslManilhaCapacidadeKg;

    @Column(name = "esl_manilha_uso_percent")
    private Double eslManilhaUsoPercent;

    @Column(name = "esl_manilha_compativel")
    private Boolean eslManilhaCompativel;

    // ── Compliance e Workflow ────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "technical_status", columnDefinition = "VARCHAR(20)")
    private TechnicalStatus technicalStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_status", columnDefinition = "VARCHAR(40)")
    private WorkflowStatus workflowStatus;

    @Column(name = "current_version", nullable = false)
    private Integer currentVersion = 1;

    /** Plano bloqueado para edição após aprovação; revisão cria nova versão. */
    @Column(name = "is_locked", nullable = false)
    private Boolean isLocked = false;

    @Column(name = "compliance_messages", columnDefinition = "TEXT")
    private String complianceMessages;

    // ── Dados Operacionais do Wizard ──────────────────────────────────────────────

    @Column(name = "local_operacao", length = 300)
    private String localOperacao;

    @Column(name = "data_operacao")
    private LocalDate dataOperacao;

    @Column(name = "supervisor_nome", length = 200)
    private String supervisorNome;

    @Column(name = "descricao_atividade", columnDefinition = "TEXT")
    private String descricaoAtividade;

    @Column(name = "petrobras_data_json", columnDefinition = "TEXT")
    private String petrobrasDataJson;

    // ── Campos adicionais para regras de compliance ──────────────────────────────

    @Column(name = "checklist_completo")
    private Boolean checklistCompleto;

    @Column(name = "dois_ou_mais_guindastes")
    private Boolean doisOuMaisGuindastes;

    @Column(name = "area_classificada")
    private Boolean areaClassificada;

    /** false = rede elétrica próxima sem distância validada → BLOCKED. */
    @Column(name = "rede_eletrica_validada")
    private Boolean redeEletricaValidada;

    @Column(name = "pressao_patolas_kpa")
    private Double pressaoPatolasKpa;

    @Column(name = "resistencia_solo_kpa")
    private Double resistenciaSoloKpa;

    /** false = certificado ausente ou vencido → BLOCKED quando inventário vinculado. */
    @Column(name = "certificados_validados")
    private Boolean certificadosValidados;

    // ── Validação Pública (Fase 20) ──────────────────────────────────────────────

    /**
     * Token público de validação gerado na aprovação. Imutável e opaco (UUID hex 128-bit).
     * Usado para validação sem autenticação via /public/planos/{token}/validacao.
     * Null para planos não aprovados ou anteriores à Fase 20.
     */
    @Column(name = "public_validation_token", unique = true, length = 64)
    private String publicValidationToken;

    // ── Resolução ────────────────────────────────────────────────────────────────
    @Column(name = "aprovado_por_id")
    private UUID aprovadoPorId;

    @Column(name = "aprovado_por_nome")
    private String aprovadoPorNome;

    @Column(name = "observacao")
    private String observacao;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "resolvido_em")
    private LocalDateTime resolvidoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        status = StatusLiberacao.ANALISAR;
        workflowStatus = WorkflowStatus.DRAFT;
        if (currentVersion == null) currentVersion = 1;
        if (isLocked == null) isLocked = false;
    }
}
