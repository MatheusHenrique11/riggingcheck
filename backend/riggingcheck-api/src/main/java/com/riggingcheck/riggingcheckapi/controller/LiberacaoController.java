package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.LiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.LiberacaoResponse;
import com.riggingcheck.riggingcheckapi.dto.ResolverLiberacaoRequest;
import com.riggingcheck.riggingcheckapi.dto.RiggingPlanAccessoryResponse;
import com.riggingcheck.riggingcheckapi.service.DatabookService;
import com.riggingcheck.riggingcheckapi.service.LiberacaoService;
import com.riggingcheck.riggingcheckapi.service.RegulatoryComplianceReportService;
import com.riggingcheck.riggingcheckapi.service.RiggingPlanAccessoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/liberacoes")
public class LiberacaoController {

    private final LiberacaoService                    liberacaoService;
    private final RiggingPlanAccessoryService         planAccessoryService;
    private final DatabookService                     databookService;
    private final RegulatoryComplianceReportService   complianceReportService;

    public LiberacaoController(LiberacaoService liberacaoService,
                               RiggingPlanAccessoryService planAccessoryService,
                               DatabookService databookService,
                               RegulatoryComplianceReportService complianceReportService) {
        this.liberacaoService       = liberacaoService;
        this.planAccessoryService   = planAccessoryService;
        this.databookService        = databookService;
        this.complianceReportService = complianceReportService;
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
            @RequestParam(defaultValue = "ANALISAR") String status,
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

    // ── Databook PDF ──────────────────────────────────────────────────────────────

    @GetMapping(value = "/{id}/relatorio-conformidade", produces = "application/pdf")
    public ResponseEntity<byte[]> relatorioConformidade(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        byte[] pdf = complianceReportService.gerarRelatorio(id, userDetails.getUsername());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "conformidade-" + id + ".pdf");
        headers.setContentLength(pdf.length);
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @GetMapping(value = "/{id}/databook", produces = "application/pdf")
    public ResponseEntity<byte[]> databook(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        byte[] pdf = databookService.gerarDatabook(id, userDetails.getUsername());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "databook-" + id + ".pdf");
        headers.setContentLength(pdf.length);
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    // ── Acessórios vinculados ao plano ────────────────────────────────────────────

    @GetMapping("/{id}/acessorios")
    public ResponseEntity<List<RiggingPlanAccessoryResponse>> listarAcessorios(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(planAccessoryService.listar(id, userDetails.getUsername()));
    }

    @PostMapping("/{id}/acessorios")
    public ResponseEntity<RiggingPlanAccessoryResponse> vincularAcessorio(
            @PathVariable UUID id,
            @Valid @RequestBody LiberacaoRequest.AcessorioVinculoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(planAccessoryService.vincular(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}/acessorios/{acessorioId}")
    public ResponseEntity<Void> removerAcessorio(
            @PathVariable UUID id,
            @PathVariable UUID acessorioId,
            @AuthenticationPrincipal UserDetails userDetails) {
        planAccessoryService.remover(id, acessorioId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
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
