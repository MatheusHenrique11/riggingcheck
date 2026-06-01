package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.*;
import com.riggingcheck.riggingcheckapi.dto.InventoryHealthResponse;
import com.riggingcheck.riggingcheckapi.service.AcessorioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/acessorios")
public class AcessorioController {

    private final AcessorioService acessorioService;

    public AcessorioController(AcessorioService acessorioService) {
        this.acessorioService = acessorioService;
    }

    // ── Acessórios ────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<AcessorioResponse>> listar(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.listar(user.getUsername()));
    }

    @GetMapping("/dashboard-integridade")
    public ResponseEntity<InventoryHealthResponse> dashboardIntegridade(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.getDashboardIntegridade(user.getUsername()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<AcessorioResponse>> search(
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.search(q, user.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AcessorioResponse> buscar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.buscar(id, user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<AcessorioResponse> criar(
            @Valid @RequestBody AcessorioRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(acessorioService.criar(request, user.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AcessorioResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody AcessorioRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.atualizar(id, request, user.getUsername()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AcessorioResponse> atualizarStatus(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarStatusAcessorioRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.atualizarStatus(id, request, user.getUsername()));
    }

    // ── Certificados ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/certificados")
    public ResponseEntity<List<CertificadoResponse>> listarCertificados(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.listarCertificados(id, user.getUsername()));
    }

    @PostMapping("/{id}/certificados")
    public ResponseEntity<CertificadoResponse> adicionarCertificado(
            @PathVariable UUID id,
            @Valid @RequestBody CertificadoRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(acessorioService.adicionarCertificado(id, request, user.getUsername()));
    }

    // ── Inspeções ─────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/inspecoes")
    public ResponseEntity<List<InspecaoResponse>> listarInspecoes(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.listarInspecoes(id, user.getUsername()));
    }

    @PostMapping("/{id}/inspecoes")
    public ResponseEntity<InspecaoResponse> registrarInspecao(
            @PathVariable UUID id,
            @Valid @RequestBody InspecaoRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(acessorioService.registrarInspecao(id, request, user.getUsername()));
    }

    // ── QR Code ───────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/qr")
    public ResponseEntity<AcessorioQrResponse> gerarQr(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(acessorioService.gerarQr(id, user.getUsername()));
    }
}
