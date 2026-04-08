package com.riggingcheck.riggingcheckapi.service;

import org.springframework.stereotype.Service;

@Service
public class SlingService {

    public SlingResponse calculate(SlingRequest req) {
        if (req.loadWeight() <= 0)
            throw new RuntimeException("Peso da carga deve ser maior que zero");
        if (req.numberOfLegs() <= 0)
            throw new RuntimeException("Número de pernas deve ser maior que zero");
        if (req.angleFromHorizontal() <= 0 || req.angleFromHorizontal() > 90)
            throw new RuntimeException("Ângulo deve estar entre 1° e 90°");
        if (req.wll() != null && req.wll() <= 0)
            throw new RuntimeException("WLL deve ser maior que zero");

        double angleRad = Math.toRadians(req.angleFromHorizontal());
        double sinAngle = Math.sin(angleRad);
        if (sinAngle < 0.001) sinAngle = 0.001; // segurança: evita Infinity
        double loadFactor = 1.0 / sinAngle;
        double tension = (req.loadWeight() / req.numberOfLegs()) * loadFactor;

        String risk = "SAFE";
        Double wllUsage = null;
        if (req.wll() != null) {
            wllUsage = (tension / req.wll()) * 100;
            risk = wllUsage < 70 ? "SAFE" : wllUsage < 90 ? "WARNING" : "DANGER";
        }

        return new SlingResponse(tension, loadFactor, wllUsage, risk,
                req.angleFromHorizontal() < 45);
    }

    public record SlingRequest(double loadWeight, int numberOfLegs,
                               double angleFromHorizontal, Double wll) {}
    public record SlingResponse(double tensionPerLeg, double loadFactor,
                                Double wllUsagePercent, String riskLevel, boolean angleWarning) {}
}