package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.CheckoutRequest;
import com.riggingcheck.riggingcheckapi.dto.CheckoutResponse;
import com.riggingcheck.riggingcheckapi.service.BillingService;
import com.riggingcheck.riggingcheckapi.service.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billingService;
    private final JwtService jwtService;

    public BillingController(BillingService billingService, JwtService jwtService) {
        this.billingService = billingService;
        this.jwtService = jwtService;
    }

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> criarCheckout(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CheckoutRequest request) {
        String token = authHeader.replace("Bearer ", "");
        UUID empresaId  = jwtService.getEmpresaIdFromToken(token);
        UUID funcionarioId = jwtService.getUserIdFromToken(token);
        String url = billingService.criarCheckoutSession(empresaId, funcionarioId, request.getPlanId());
        return ResponseEntity.ok(new CheckoutResponse(url));
    }
}
