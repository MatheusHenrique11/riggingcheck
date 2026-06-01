package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.compliance.ComplianceViolation;
import com.riggingcheck.riggingcheckapi.domain.OperationTeamMember;
import com.riggingcheck.riggingcheckapi.dto.OperationTeamMemberRequest;
import com.riggingcheck.riggingcheckapi.dto.OperationTeamMemberResponse;
import com.riggingcheck.riggingcheckapi.repository.OperationTeamMemberRepository;
import com.riggingcheck.riggingcheckapi.service.OperationTeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/planos/{id}/equipe")
public class OperationTeamController {

    private final OperationTeamService teamService;
    private final OperationTeamMemberRepository teamRepository;

    public OperationTeamController(OperationTeamService teamService,
                                   OperationTeamMemberRepository teamRepository) {
        this.teamService    = teamService;
        this.teamRepository = teamRepository;
    }

    @GetMapping
    public ResponseEntity<List<OperationTeamMemberResponse>> listar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(teamService.listar(id, user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<OperationTeamMemberResponse> adicionar(
            @PathVariable UUID id,
            @Valid @RequestBody OperationTeamMemberRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(teamService.adicionar(id, request, user.getUsername()));
    }

    @DeleteMapping("/{membroId}")
    public ResponseEntity<Void> remover(
            @PathVariable UUID id,
            @PathVariable UUID membroId,
            @AuthenticationPrincipal UserDetails user) {
        teamService.remover(id, membroId, user.getUsername());
        return ResponseEntity.noContent().build();
    }

    /** Avalia competências da equipe do plano, retornando violações no padrão Compliance. */
    @GetMapping("/compliance")
    public ResponseEntity<List<ComplianceViolation>> compliance(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        // listar já valida acesso; reusa o mesmo método
        teamService.listar(id, user.getUsername());
        List<OperationTeamMember> membros = teamRepository
            .findBySolicitacaoLiberacaoIdOrderByCreatedAtAsc(id);
        return ResponseEntity.ok(teamService.evaluateCompetencies(membros));
    }
}
