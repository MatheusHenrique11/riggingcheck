package com.riggingcheck.riggingcheckapi.domain;

import com.riggingcheck.riggingcheckapi.domain.enums.FuncaoOperacional;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vínculo formal entre um funcionário e um plano de içamento.
 * Registra a função operacional e permite rastreabilidade e validação de competências.
 */
@Entity
@Table(name = "operation_team_members", indexes = {
    @Index(name = "idx_team_member_plano",    columnList = "solicitacao_liberacao_id"),
    @Index(name = "idx_team_member_empresa",  columnList = "empresa_id"),
    @Index(name = "idx_team_member_func",     columnList = "funcionario_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Filter(name = "tenantFilter", condition = "empresa_id = :empresaId")
public class OperationTeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "solicitacao_liberacao_id", nullable = false)
    private UUID solicitacaoLiberacaoId;

    @Column(name = "funcionario_id", nullable = false)
    private UUID funcionarioId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "funcao_operacional", nullable = false, length = 30)
    private FuncaoOperacional funcaoOperacional;

    @Builder.Default
    @Column(name = "responsavel", nullable = false)
    private Boolean responsavel = false;

    @Column(name = "observacao", length = 500)
    private String observacao;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
