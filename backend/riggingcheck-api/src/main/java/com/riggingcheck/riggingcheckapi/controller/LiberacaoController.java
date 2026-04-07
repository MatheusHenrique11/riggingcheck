package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoResponse;
import com.riggingcheck.riggingcheckapi.dto.ResolverLiberacaoRequest;
import com.riggingcheck.riggingcheckapi.service.LiberacaoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/liberacoes")
public class LiberacaoController {

    private final LiberacaoService liberacaoService;

    public LiberacaoController(LiberacaoService liberacaoService) {
        this.liberacaoService = liberacaoService;
    }

    // Rigger solicita liberação
    @PostMapping
    public ResponseEntity<LiberacaoResponse> solicitar(
            @Valid @RequestBody LiberacaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(liberacaoService.solicitar(request, userDetails.getUsername()));
    }

    // Admin lista solicitações — ?status=PENDENTE|APROVADO|NEGADO|TODOS
    @GetMapping
    public ResponseEntity<List<LiberacaoResponse>> listar(
            @RequestParam(defaultValue = "PENDENTE") String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(liberacaoService.listar(status, userDetails.getUsername()));
    }

    // Rigger ou admin consulta uma solicitação específica (polling)
    @GetMapping("/{id}")
    public ResponseEntity<LiberacaoResponse> buscar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(liberacaoService.buscar(id, userDetails.getUsername()));
    }

    // Admin aprova
    @PostMapping("/{id}/aprovar")
    public ResponseEntity<LiberacaoResponse> aprovar(
            @PathVariable UUID id,
            @RequestBody(required = false) ResolverLiberacaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(liberacaoService.aprovar(id,
                request != null ? request : new ResolverLiberacaoRequest(),
                userDetails.getUsername()));
    }

    // Admin nega
    @PostMapping("/{id}/negar")
    public ResponseEntity<LiberacaoResponse> negar(
            @PathVariable UUID id,
            @RequestBody(required = false) ResolverLiberacaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(liberacaoService.negar(id,
                request != null ? request : new ResolverLiberacaoRequest(),
                userDetails.getUsername()));
    }
}
