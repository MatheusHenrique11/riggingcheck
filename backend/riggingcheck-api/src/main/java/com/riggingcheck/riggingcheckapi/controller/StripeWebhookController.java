package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.service.BillingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final BillingService billingService;

    public StripeWebhookController(BillingService billingService) {
        this.billingService = billingService;
    }

    /**
     * Recebe eventos do Stripe. O corpo deve ser lido como String bruta para que a
     * verificação de assinatura HMAC-SHA256 do Webhook.constructEvent funcione corretamente.
     * Este endpoint é público (sem JWT) mas autenticado pela assinatura Stripe.
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            billingService.processarWebhook(payload, sigHeader);
            return ResponseEntity.ok().build();
        } catch (RegraDeNegocioException e) {
            log.warn("Webhook Stripe rejeitado: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Erro inesperado no webhook Stripe", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
