package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.*;
import com.riggingcheck.riggingcheckapi.service.ApprovalWorkflowService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/planos")
public class ApprovalController {

    private final ApprovalWorkflowService workflowService;

    public ApprovalController(ApprovalWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    /** Operador/Rigger submete o plano para aprovação (cria nova versão). */
    @PostMapping("/{id}/submeter")
    public ResponseEntity<LiberacaoResponse> submeter(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.submeter(id, user.getUsername()));
    }

    /** Líder/Admin aprova o plano. BLOCKED exige SUPERADMIN/SAFETY_ADMIN + justificativa. */
    @PostMapping("/{id}/aprovar")
    public ResponseEntity<LiberacaoResponse> aprovar(
            @PathVariable UUID id,
            @RequestBody(required = false) WorkflowDecisionRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.aprovar(id, req, user.getUsername()));
    }

    /** Líder solicita ajustes ao operador. */
    @PostMapping("/{id}/solicitar-ajuste")
    public ResponseEntity<LiberacaoResponse> solicitarAjuste(
            @PathVariable UUID id,
            @Valid @RequestBody WorkflowDecisionRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.solicitarAjuste(id, req, user.getUsername()));
    }

    /** Líder recusa o plano definitivamente. */
    @PostMapping("/{id}/recusar")
    public ResponseEntity<LiberacaoResponse> recusar(
            @PathVariable UUID id,
            @RequestBody(required = false) WorkflowDecisionRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.recusar(id, req, user.getUsername()));
    }

    /** Preview de compliance antes de submeter (retorna status técnico sem alterar o plano). */
    @GetMapping("/{id}/compliance")
    public ResponseEntity<ComplianceResultDto> compliance(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.previewCompliance(id, user.getUsername()));
    }

    /** Histórico de decisões de aprovação do plano. */
    @GetMapping("/{id}/historico")
    public ResponseEntity<List<ApprovalDecisionResponse>> historico(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.historico(id, user.getUsername()));
    }

    /** Lista todas as versões do plano. */
    @GetMapping("/{id}/versoes")
    public ResponseEntity<List<PlanVersionResponse>> versoes(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workflowService.versoes(id, user.getUsername()));
    }

    /** Adiciona comentário ao plano (por campo ou geral). */
    @PostMapping("/{id}/comentarios")
    public ResponseEntity<Void> comentar(
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalCommentRequest req,
            @AuthenticationPrincipal UserDetails user) {
        workflowService.comentar(id, req, user.getUsername());
        return ResponseEntity.noContent().build();
    }
}
