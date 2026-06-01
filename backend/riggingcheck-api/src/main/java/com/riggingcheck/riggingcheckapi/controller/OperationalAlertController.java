package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.AlertSummaryResponse;
import com.riggingcheck.riggingcheckapi.dto.OperationalAlertResponse;
import com.riggingcheck.riggingcheckapi.service.OperationalAlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/alertas")
public class OperationalAlertController {

    private final OperationalAlertService alertService;

    public OperationalAlertController(OperationalAlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<List<OperationalAlertResponse>> listar(
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(alertService.listar(user.getUsername(), status));
    }

    @GetMapping("/resumo")
    public ResponseEntity<AlertSummaryResponse> resumo(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(alertService.resumo(user.getUsername()));
    }

    @PostMapping("/gerar")
    public ResponseEntity<Map<String, Integer>> gerar(
            @AuthenticationPrincipal UserDetails user) {
        int criados = alertService.gerar(user.getUsername());
        return ResponseEntity.ok(Map.of("gerados", criados));
    }

    @PatchMapping("/{id}/visualizar")
    public ResponseEntity<OperationalAlertResponse> visualizar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(alertService.visualizar(id, user.getUsername()));
    }

    @PatchMapping("/{id}/resolver")
    public ResponseEntity<OperationalAlertResponse> resolver(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(alertService.resolver(id, user.getUsername()));
    }

    @PatchMapping("/{id}/ignorar")
    public ResponseEntity<OperationalAlertResponse> ignorar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(alertService.ignorar(id, user.getUsername()));
    }
}
