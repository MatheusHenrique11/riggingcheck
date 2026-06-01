package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.PublicAcessorioResponse;
import com.riggingcheck.riggingcheckapi.service.PublicAcessorioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Endpoints públicos de acessórios — sem autenticação.
 * Utilizado pela consulta via QR Code.
 * NÃO expõe dados sensíveis da empresa ou do usuário.
 */
@RestController
@RequestMapping("/api/public/acessorios")
public class PublicAcessorioController {

    private final PublicAcessorioService publicAcessorioService;

    public PublicAcessorioController(PublicAcessorioService publicAcessorioService) {
        this.publicAcessorioService = publicAcessorioService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicAcessorioResponse> consultar(@PathVariable UUID id) {
        return ResponseEntity.ok(publicAcessorioService.consultar(id));
    }
}
