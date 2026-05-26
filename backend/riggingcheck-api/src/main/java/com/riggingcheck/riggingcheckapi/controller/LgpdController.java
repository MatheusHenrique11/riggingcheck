package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.LgpdConsentRequest;
import com.riggingcheck.riggingcheckapi.dto.LgpdExportResponse;
import com.riggingcheck.riggingcheckapi.service.JwtService;
import com.riggingcheck.riggingcheckapi.service.LgpdService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/lgpd")
public class LgpdController {

    private final LgpdService lgpdService;
    private final JwtService jwtService;

    public LgpdController(LgpdService lgpdService, JwtService jwtService) {
        this.lgpdService = lgpdService;
        this.jwtService = jwtService;
    }

    @PostMapping("/consentimento")
    public ResponseEntity<Void> atualizarConsentimento(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody LgpdConsentRequest request) {
        UUID funcionarioId = extrairFuncionarioId(authHeader);
        lgpdService.atualizarConsentimento(funcionarioId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/excluir-conta")
    public ResponseEntity<Void> excluirConta(
            @RequestHeader("Authorization") String authHeader) {
        UUID funcionarioId = extrairFuncionarioId(authHeader);
        lgpdService.anonimizarConta(funcionarioId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/exportar")
    public ResponseEntity<LgpdExportResponse> exportarDados(
            @RequestHeader("Authorization") String authHeader) {
        UUID funcionarioId = extrairFuncionarioId(authHeader);
        return ResponseEntity.ok(lgpdService.exportarDados(funcionarioId));
    }

    private UUID extrairFuncionarioId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtService.getUserIdFromToken(token);
    }
}
