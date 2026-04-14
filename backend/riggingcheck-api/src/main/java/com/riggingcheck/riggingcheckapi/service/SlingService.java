package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.dto.SlingCalculateRequest;
import com.riggingcheck.riggingcheckapi.dto.SlingCalculateResponse;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.shared.RiskCalculator;
import org.springframework.stereotype.Service;

@Service
public class SlingService {

    private static final double SIN_MINIMO = 0.001;

    public SlingCalculateResponse calculate(SlingCalculateRequest req) {
        boolean temManilha = Boolean.TRUE.equals(req.temManilha());
        validarManilha(temManilha, req.manilhaCapacidadeKg());

        double tensionPerLeg = calcularTensaoPorPerna(req);
        double wllUsage      = (tensionPerLeg / req.wll()) * 100;
        String riskLevel     = RiskCalculator.fromUsagePercent(wllUsage);

        Double manilhaUsoPercent = null;
        Boolean manilhaCompativel = null;

        if (temManilha) {
            manilhaUsoPercent = (tensionPerLeg / req.manilhaCapacidadeKg()) * 100;
            manilhaCompativel = req.manilhaCapacidadeKg() >= tensionPerLeg;
            riskLevel = RiskCalculator.worst(riskLevel, RiskCalculator.fromUsagePercent(manilhaUsoPercent));
        }

        return new SlingCalculateResponse(
            tensionPerLeg,
            1.0 / Math.max(Math.sin(Math.toRadians(req.angleFromHorizontal())), SIN_MINIMO),
            wllUsage,
            riskLevel,
            req.angleFromHorizontal() < 45,
            temManilha,
            temManilha ? req.manilhaCapacidadeKg() : null,
            manilhaUsoPercent,
            manilhaCompativel
        );
    }

    private double calcularTensaoPorPerna(SlingCalculateRequest req) {
        double sinAngle = Math.max(Math.sin(Math.toRadians(req.angleFromHorizontal())), SIN_MINIMO);
        return (req.loadWeight() / req.numberOfLegs()) * (1.0 / sinAngle);
    }

    private void validarManilha(boolean temManilha, Double capacidade) {
        if (temManilha && (capacidade == null || capacidade <= 0)) {
            throw new RegraDeNegocioException("Informe a capacidade da manilha (valor positivo)");
        }
    }
}
