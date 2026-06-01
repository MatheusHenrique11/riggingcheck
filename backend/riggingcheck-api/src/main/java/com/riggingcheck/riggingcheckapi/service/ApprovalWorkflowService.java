package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceResult;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceValidationService;
import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.*;
import com.riggingcheck.riggingcheckapi.domain.enums.TechnicalStatus;
import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import com.riggingcheck.riggingcheckapi.dto.*;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.*;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ApprovalWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(ApprovalWorkflowService.class);

    private final SolicitacaoLiberacaoRepository planRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final RiggingPlanVersionRepository versionRepository;
    private final ApprovalDecisionRepository decisionRepository;
    private final ApprovalCommentRepository commentRepository;
    private final ComplianceValidationService complianceService;
    private final AuditLogService auditLogService;
    private final AuthorizationHelper authHelper;

    public ApprovalWorkflowService(
            SolicitacaoLiberacaoRepository planRepository,
            FuncionarioRepository funcionarioRepository,
            RiggingPlanVersionRepository versionRepository,
            ApprovalDecisionRepository decisionRepository,
            ApprovalCommentRepository commentRepository,
            ComplianceValidationService complianceService,
            AuditLogService auditLogService,
            AuthorizationHelper authHelper) {
        this.planRepository    = planRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.versionRepository = versionRepository;
        this.decisionRepository = decisionRepository;
        this.commentRepository = commentRepository;
        this.complianceService = complianceService;
        this.auditLogService   = auditLogService;
        this.authHelper        = authHelper;
    }

    // ── Submeter plano para aprovação ────────────────────────────────────────────

    @Transactional
    public LiberacaoResponse submeter(UUID planId, String emailSubmitter) {
        Funcionario submitter = buscarFuncionario(emailSubmitter);
        SolicitacaoLiberacao plan = buscarPlano(planId);

        authHelper.requireMesmaEmpresaOuSuper(submitter, plan.getEmpresaId());
        validarEditavel(plan);

        ComplianceResult compliance = complianceService.validate(plan);
        plan.setTechnicalStatus(compliance.overallStatus());
        plan.setComplianceMessages(toComplianceSummary(compliance));

        boolean isResubmission = plan.getWorkflowStatus() == WorkflowStatus.CHANGES_REQUESTED;
        plan.setWorkflowStatus(isResubmission ? WorkflowStatus.RESUBMITTED : WorkflowStatus.SUBMITTED);

        int newVersion = (plan.getCurrentVersion() == null ? 0 : plan.getCurrentVersion()) + 1;
        plan.setCurrentVersion(newVersion);

        SolicitacaoLiberacao saved = planRepository.save(plan);

        RiggingPlanVersion version = RiggingPlanVersion.builder()
                .planId(saved.getId())
                .empresaId(saved.getEmpresaId())
                .versionNumber(newVersion)
                .technicalStatus(compliance.overallStatus())
                .complianceMessages(toComplianceSummary(compliance))
                .snapshotJson("v%d | OS=%s | techStatus=%s".formatted(
                        newVersion, saved.getOperacaoOs(), compliance.overallStatus()))
                .createdById(submitter.getId())
                .createdByName(submitter.getNome())
                .build();
        versionRepository.save(version);

        auditLogService.log(submitter, isResubmission ? "PLAN_RESUBMITTED" : "PLAN_SUBMITTED",
                "RIGGING_PLAN", saved.getId(),
                "technicalStatus=%s version=%d".formatted(compliance.overallStatus(), newVersion));

        log.info("Plano {} submetido v{} por {} | technicalStatus={}", planId, newVersion,
                emailSubmitter, compliance.overallStatus());
        return toResponse(saved);
    }

    // ── Aprovar ──────────────────────────────────────────────────────────────────

    @Transactional
    public LiberacaoResponse aprovar(UUID planId, WorkflowDecisionRequest req, String emailApprover) {
        Funcionario approver = buscarFuncionario(emailApprover);
        SolicitacaoLiberacao plan = buscarPlano(planId);

        authHelper.requireAdminComResolucao(approver);
        authHelper.requireMesmaEmpresaOuSuper(approver, plan.getEmpresaId());
        validarPendente(plan);

        if (plan.getTechnicalStatus() == TechnicalStatus.BLOCKED) {
            if (!authHelper.podeAprovarBloqueado(approver)) {
                throw new AcessoNegadoException();
            }
            if (req == null || req.justification() == null || req.justification().isBlank()) {
                throw new RegraDeNegocioException(
                    "Justificativa obrigatória para aprovar plano com status BLOCKED.");
            }
        }

        WorkflowStatus decision = Boolean.TRUE.equals(req != null && req.isException() != null && req.isException())
                ? WorkflowStatus.APPROVED_WITH_RESTRICTIONS
                : WorkflowStatus.APPROVED;

        plan.setWorkflowStatus(decision);
        plan.setAprovadoPorId(approver.getId());
        plan.setAprovadoPorNome(approver.getNome());
        plan.setObservacao(req != null ? req.justification() : null);
        plan.setIsLocked(true);

        // Gera token de validação pública na primeira aprovação (imutável)
        if (plan.getPublicValidationToken() == null) {
            plan.setPublicValidationToken(
                java.util.UUID.randomUUID().toString().replace("-", ""));
        }

        SolicitacaoLiberacao saved = planRepository.save(plan);

        registrarDecisao(saved, approver, decision,
                req != null ? req.justification() : null,
                plan.getTechnicalStatus() == TechnicalStatus.BLOCKED);

        auditLogService.log(approver, "PLAN_APPROVED", "RIGGING_PLAN", saved.getId(),
                "decision=%s blocked=%s".formatted(decision, plan.getTechnicalStatus() == TechnicalStatus.BLOCKED));

        log.info("Plano {} aprovado por {} | decision={}", planId, emailApprover, decision);
        return toResponse(saved);
    }

    // ── Solicitar ajuste ─────────────────────────────────────────────────────────

    @Transactional
    public LiberacaoResponse solicitarAjuste(UUID planId, WorkflowDecisionRequest req, String emailReviewer) {
        Funcionario reviewer = buscarFuncionario(emailReviewer);
        SolicitacaoLiberacao plan = buscarPlano(planId);

        authHelper.requireAdminComResolucao(reviewer);
        authHelper.requireMesmaEmpresaOuSuper(reviewer, plan.getEmpresaId());
        validarPendente(plan);

        if (req == null || req.justification() == null || req.justification().isBlank()) {
            throw new RegraDeNegocioException("Descreva quais ajustes são necessários.");
        }

        plan.setWorkflowStatus(WorkflowStatus.CHANGES_REQUESTED);
        plan.setObservacao(req.justification());
        SolicitacaoLiberacao saved = planRepository.save(plan);

        registrarDecisao(saved, reviewer, WorkflowStatus.CHANGES_REQUESTED, req.justification(), false);
        auditLogService.log(reviewer, "PLAN_CHANGES_REQUESTED", "RIGGING_PLAN", saved.getId(),
                "justification=%s".formatted(req.justification()));

        log.info("Plano {} retornado para ajuste por {}", planId, emailReviewer);
        return toResponse(saved);
    }

    // ── Recusar ──────────────────────────────────────────────────────────────────

    @Transactional
    public LiberacaoResponse recusar(UUID planId, WorkflowDecisionRequest req, String emailReviewer) {
        Funcionario reviewer = buscarFuncionario(emailReviewer);
        SolicitacaoLiberacao plan = buscarPlano(planId);

        authHelper.requireAdminComResolucao(reviewer);
        authHelper.requireMesmaEmpresaOuSuper(reviewer, plan.getEmpresaId());
        validarPendente(plan);

        plan.setWorkflowStatus(WorkflowStatus.REJECTED);
        plan.setObservacao(req != null ? req.justification() : null);
        SolicitacaoLiberacao saved = planRepository.save(plan);

        registrarDecisao(saved, reviewer, WorkflowStatus.REJECTED,
                req != null ? req.justification() : null, false);
        auditLogService.log(reviewer, "PLAN_REJECTED", "RIGGING_PLAN", saved.getId(),
                "justification=%s".formatted(req != null ? req.justification() : ""));

        log.info("Plano {} recusado por {}", planId, emailReviewer);
        return toResponse(saved);
    }

    // ── Compliance preview ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ComplianceResultDto previewCompliance(UUID planId, String email) {
        Funcionario user = buscarFuncionario(email);
        SolicitacaoLiberacao plan = buscarPlano(planId);
        authHelper.requireMesmaEmpresaOuSuper(user, plan.getEmpresaId());

        ComplianceResult result = complianceService.validate(plan);
        return toComplianceDto(result);
    }

    // ── Histórico de decisões ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ApprovalDecisionResponse> historico(UUID planId, String email) {
        Funcionario user = buscarFuncionario(email);
        SolicitacaoLiberacao plan = buscarPlano(planId);
        authHelper.requireMesmaEmpresaOuSuper(user, plan.getEmpresaId());

        return decisionRepository.findByPlanIdOrderByDecidedAtDesc(planId)
                .stream().map(this::toDecisionResponse).toList();
    }

    // ── Versões ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PlanVersionResponse> versoes(UUID planId, String email) {
        Funcionario user = buscarFuncionario(email);
        SolicitacaoLiberacao plan = buscarPlano(planId);
        authHelper.requireMesmaEmpresaOuSuper(user, plan.getEmpresaId());

        return versionRepository.findByPlanIdOrderByVersionNumberDesc(planId)
                .stream().map(this::toVersionResponse).toList();
    }

    // ── Adicionar comentário ─────────────────────────────────────────────────────

    @Transactional
    public void comentar(UUID planId, ApprovalCommentRequest req, String email) {
        Funcionario user = buscarFuncionario(email);
        SolicitacaoLiberacao plan = buscarPlano(planId);
        authHelper.requireMesmaEmpresaOuSuper(user, plan.getEmpresaId());

        ApprovalComment comment = ApprovalComment.builder()
                .planId(planId)
                .empresaId(plan.getEmpresaId())
                .authorId(user.getId())
                .authorName(user.getNome())
                .authorRole(user.getRole().name())
                .fieldRef(req.fieldRef())
                .content(req.content())
                .versionNumber(plan.getCurrentVersion())
                .build();
        commentRepository.save(comment);
    }

    // ── Helpers privados ─────────────────────────────────────────────────────────

    private void validarEditavel(SolicitacaoLiberacao plan) {
        if (Boolean.TRUE.equals(plan.getIsLocked())) {
            throw new RegraDeNegocioException(
                "Plano aprovado está bloqueado para edição. Crie uma revisão.");
        }
        WorkflowStatus ws = plan.getWorkflowStatus();
        if (ws == WorkflowStatus.SUBMITTED || ws == WorkflowStatus.UNDER_REVIEW
                || ws == WorkflowStatus.RESUBMITTED) {
            throw new RegraDeNegocioException(
                "Plano já está em análise. Aguarde a decisão ou solicite cancelamento.");
        }
    }

    private void validarPendente(SolicitacaoLiberacao plan) {
        WorkflowStatus ws = plan.getWorkflowStatus();
        if (ws != WorkflowStatus.SUBMITTED && ws != WorkflowStatus.UNDER_REVIEW
                && ws != WorkflowStatus.RESUBMITTED) {
            throw new RegraDeNegocioException(
                "Plano não está aguardando aprovação. Status atual: " + ws);
        }
    }

    private void registrarDecisao(SolicitacaoLiberacao plan, Funcionario actor,
                                   WorkflowStatus decision, String justification, boolean isException) {
        ApprovalDecision d = ApprovalDecision.builder()
                .planId(plan.getId())
                .empresaId(plan.getEmpresaId())
                .versionNumber(plan.getCurrentVersion())
                .decision(decision)
                .decidedById(actor.getId())
                .decidedByName(actor.getNome())
                .decidedByRole(actor.getRole().name())
                .justification(justification)
                .isException(isException)
                .build();
        decisionRepository.save(d);
    }

    private Funcionario buscarFuncionario(String email) {
        return funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private SolicitacaoLiberacao buscarPlano(UUID id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Plano de içamento"));
    }

    private String toComplianceSummary(ComplianceResult r) {
        if (r.violations().isEmpty()) return "COMPLIANT";
        StringBuilder sb = new StringBuilder();
        for (var v : r.violations()) {
            sb.append("[").append(v.severity()).append("] ")
              .append(v.ruleId()).append(": ").append(v.message()).append("\n");
        }
        return sb.toString().trim();
    }

    private ComplianceResultDto toComplianceDto(ComplianceResult r) {
        List<ComplianceResultDto.ViolationDto> vDtos = r.violations().stream()
                .map(v -> new ComplianceResultDto.ViolationDto(
                        v.severity(), v.ruleId(), v.message(), v.norm(), v.recommendedAction()))
                .toList();
        return new ComplianceResultDto(r.overallStatus(), r.isBlocked(), vDtos);
    }

    private ApprovalDecisionResponse toDecisionResponse(ApprovalDecision d) {
        return new ApprovalDecisionResponse(d.getId(), d.getPlanId(), d.getVersionNumber(),
                d.getDecision(), d.getDecidedByName(), d.getDecidedByRole(),
                d.getJustification(), d.getIsException(), d.getDecidedAt());
    }

    private PlanVersionResponse toVersionResponse(RiggingPlanVersion v) {
        return new PlanVersionResponse(v.getId(), v.getPlanId(), v.getVersionNumber(),
                v.getTechnicalStatus(), v.getComplianceMessages(), v.getCreatedByName(), v.getCreatedAt());
    }

    private LiberacaoResponse toResponse(SolicitacaoLiberacao sol) {
        return LiberacaoResponse.builder()
                .id(sol.getId())
                .empresaNome(sol.getEmpresaNome())
                .operacaoOs(sol.getOperacaoOs())
                .riggerNome(sol.getRiggerNome())
                .status(sol.getStatus() != null ? sol.getStatus().name() : null)
                .workflowStatus(sol.getWorkflowStatus() != null ? sol.getWorkflowStatus().name() : null)
                .technicalStatus(sol.getTechnicalStatus() != null ? sol.getTechnicalStatus().name() : null)
                .publicValidationToken(sol.getPublicValidationToken())
                .aprovadoPorNome(sol.getAprovadoPorNome())
                .observacao(sol.getObservacao())
                .criadoEm(sol.getCriadoEm())
                .resolvidoEm(sol.getResolvidoEm())
                .capGuindasteKg(sol.getCapGuindasteKg())
                .capCargaKg(sol.getCapCargaKg())
                .capAparelhoKg(sol.getCapAparelhoKg())
                .capTotalKg(sol.getCapTotalKg())
                .capUsoPercent(sol.getCapUsoPercent())
                .capRisco(sol.getCapRisco())
                .eslNumPernas(sol.getEslNumPernas())
                .eslAnguloGraus(sol.getEslAnguloGraus())
                .eslTensaoPorPernaKg(sol.getEslTensaoPorPernaKg())
                .eslFatorCarga(sol.getEslFatorCarga())
                .eslRisco(sol.getEslRisco())
                .eslAnguloAviso(sol.getEslAnguloAviso())
                .eslWllKg(sol.getEslWllKg())
                .eslWllUsoPercent(sol.getEslWllUsoPercent())
                .eslTemManilha(sol.getEslTemManilha())
                .eslManilhaCapacidadeKg(sol.getEslManilhaCapacidadeKg())
                .eslManilhaUsoPercent(sol.getEslManilhaUsoPercent())
                .eslManilhaCompativel(sol.getEslManilhaCompativel())
                .build();
    }
}
