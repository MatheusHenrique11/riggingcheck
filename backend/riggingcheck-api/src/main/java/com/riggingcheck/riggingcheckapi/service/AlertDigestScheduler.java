package com.riggingcheck.riggingcheckapi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler do digest diário de alertas.
 * Bean criado apenas quando ALERT_DIGEST_ENABLED=true, evitando execução em testes.
 */
@Component
@ConditionalOnProperty(name = "alert.digest.enabled", havingValue = "true")
public class AlertDigestScheduler {

    private static final Logger log = LoggerFactory.getLogger(AlertDigestScheduler.class);

    private final AlertDigestService digestService;

    public AlertDigestScheduler(AlertDigestService digestService) {
        this.digestService = digestService;
    }

    @Scheduled(cron = "${alert.digest.cron:0 0 7 * * MON-FRI}")
    public void executarDigestDiario() {
        log.info("Iniciando digest diário de alertas operacionais...");
        int total = digestService.enviarDigestParaTodas();
        log.info("Digest diário concluído: {} e-mail(s) enviado(s).", total);
    }
}
