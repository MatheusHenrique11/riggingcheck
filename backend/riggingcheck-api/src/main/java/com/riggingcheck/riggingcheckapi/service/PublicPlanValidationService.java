package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import com.riggingcheck.riggingcheckapi.dto.PublicPlanValidationResponse;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.OperationTeamMemberRepository;
import com.riggingcheck.riggingcheckapi.repository.RiggingPlanAccessoryRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Serviço de validação pública de planos — Fase 20.
 * Não requer autenticação. Expõe apenas dados mínimos e não sensíveis.
 */
@Service
public class PublicPlanValidationService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FMT_D = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final RiggingPlanAccessoryRepository planAccessoryRepository;
    private final OperationTeamMemberRepository  teamRepository;

    public PublicPlanValidationService(
            SolicitacaoLiberacaoRepository liberacaoRepository,
            RiggingPlanAccessoryRepository planAccessoryRepository,
            OperationTeamMemberRepository teamRepository) {
        this.liberacaoRepository  = liberacaoRepository;
        this.planAccessoryRepository = planAccessoryRepository;
        this.teamRepository       = teamRepository;
    }

    @Transactional(readOnly = true)
    public PublicPlanValidationResponse validar(String token) {
        SolicitacaoLiberacao plan = liberacaoRepository.findByPublicValidationToken(token)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Plano"));

        int qtdAcessorios = planAccessoryRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(plan.getId()).size();

        int qtdMembros = teamRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(plan.getId()).size();

        return new PublicPlanValidationResponse(
            plan.getOperacaoOs(),
            plan.getEmpresaNome(),
            plan.getLocalOperacao(),
            plan.getDataOperacao() != null ? plan.getDataOperacao().format(FMT_D) : null,
            traduzirTechnicalStatus(plan.getTechnicalStatus()),
            traduzirWorkflowStatus(plan),
            traduzirCompliance(plan.getTechnicalStatus()),
            plan.getResolvidoEm() != null ? plan.getResolvidoEm().format(FMT) : null,
            "Liderança autorizada",
            "v" + (plan.getCurrentVersion() != null ? plan.getCurrentVersion() : 1),
            qtdAcessorios,
            qtdMembros,
            calcularMensagem(plan),
            LocalDateTime.now().format(FMT)
        );
    }

    // ── Helpers sem dados sensíveis ────────────────────────────────────────────

    private String calcularMensagem(SolicitacaoLiberacao plan) {
        // Legacy approval
        if (plan.getStatus() == StatusLiberacao.PROSSEGUIR
                && (plan.getWorkflowStatus() == null || plan.getWorkflowStatus() == WorkflowStatus.DRAFT)) {
            return "PLANO APROVADO E VÁLIDO";
        }
        if (plan.getWorkflowStatus() == WorkflowStatus.APPROVED) {
            return "PLANO APROVADO E VÁLIDO";
        }
        if (plan.getWorkflowStatus() == WorkflowStatus.APPROVED_WITH_RESTRICTIONS) {
            return "PLANO APROVADO COM RESTRIÇÃO";
        }
        if (plan.getWorkflowStatus() == WorkflowStatus.REJECTED) {
            return "PLANO RECUSADO";
        }
        if (plan.getTechnicalStatus() == TechnicalStatus.BLOCKED) {
            return "PLANO BLOQUEADO";
        }
        return "PLANO INVALIDADO / EM REVISÃO";
    }

    private String traduzirTechnicalStatus(TechnicalStatus ts) {
        if (ts == null) return "Não avaliado";
        return switch (ts) {
            case COMPLIANT  -> "Conforme";
            case WARNING    -> "Atenção";
            case RESTRICTED -> "Restrito";
            case BLOCKED    -> "Bloqueado";
        };
    }

    private String traduzirWorkflowStatus(SolicitacaoLiberacao plan) {
        if (plan.getStatus() == StatusLiberacao.PROSSEGUIR) return "Aprovado";
        if (plan.getWorkflowStatus() == null) return "Rascunho";
        return switch (plan.getWorkflowStatus()) {
            case APPROVED                  -> "Aprovado";
            case APPROVED_WITH_RESTRICTIONS -> "Aprovado com ressalvas";
            case REJECTED                  -> "Recusado";
            case SUBMITTED, RESUBMITTED, UNDER_REVIEW -> "Aguardando aprovação";
            case CHANGES_REQUESTED         -> "Em revisão";
            default                        -> plan.getWorkflowStatus().name();
        };
    }

    private String traduzirCompliance(TechnicalStatus ts) {
        if (ts == null) return "Não avaliado";
        return switch (ts) {
            case COMPLIANT  -> "Em conformidade";
            case WARNING    -> "Atenção";
            case RESTRICTED -> "Com restrições";
            case BLOCKED    -> "Bloqueado";
        };
    }
}
