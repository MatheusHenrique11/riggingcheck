package com.riggingcheck.riggingcheckapi.service;

import org.springframework.stereotype.Service;

@Service
public class SlingService {

    public SlingResponse calculate(SlingRequest req) {
        double angleRad = Math.toRadians(req.angleFromHorizontal());
        double loadFactor = 1.0 / Math.sin(angleRad);
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