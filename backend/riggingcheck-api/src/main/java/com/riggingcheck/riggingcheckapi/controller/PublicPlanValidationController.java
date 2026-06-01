package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.PublicPlanValidationResponse;
import com.riggingcheck.riggingcheckapi.service.PublicPlanValidationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint público de validação de planos aprovados — sem autenticação.
 * Coberto por SecurityConfig: requestMatchers("/api/public/**").permitAll()
 */
@RestController
@RequestMapping("/api/public/planos")
public class PublicPlanValidationController {

    private final PublicPlanValidationService validationService;

    public PublicPlanValidationController(PublicPlanValidationService validationService) {
        this.validationService = validationService;
    }

    @GetMapping("/{token}/validacao")
    public ResponseEntity<PublicPlanValidationResponse> validar(@PathVariable String token) {
        return ResponseEntity.ok(validationService.validar(token));
    }
}
