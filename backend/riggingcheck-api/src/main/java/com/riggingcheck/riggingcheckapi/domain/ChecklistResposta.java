package com.riggingcheck.riggingcheckapi.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Resposta individual de cada item do checklist de campo NR-11 / N-2869.
 * Persiste o estado exato dos 26 itens no momento da submissão do plano.
 */
@Entity
@Table(name = "checklist_respostas", indexes = {
    @Index(name = "idx_checklist_solicitacao", columnList = "solicitacao_liberacao_id"),
    @Index(name = "idx_checklist_empresa",     columnList = "empresa_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistResposta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "solicitacao_liberacao_id", nullable = false)
    private UUID solicitacaoLiberacaoId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "codigo_item", nullable = false, length = 20)
    private String codigoItem;

    @Column(name = "categoria_item", length = 200)
    private String categoriaItem;

    @Column(name = "pergunta_item", columnDefinition = "TEXT")
    private String perguntaItem;

    @Column(name = "respondido", nullable = false)
    private Boolean respondido;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
