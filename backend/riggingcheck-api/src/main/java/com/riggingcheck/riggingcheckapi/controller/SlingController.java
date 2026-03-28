package com.riggingcheck.riggingcheckapi.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sling")
@CrossOrigin(origins = "*")
public class SlingController {

    @PostMapping("/calculate")
    public SlingResponse calculate(@RequestBody SlingRequest req) {
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

    record SlingRequest(double loadWeight, int numberOfLegs,
                        double angleFromHorizontal, Double wll) {}
    record SlingResponse(double tensionPerLeg, double loadFactor,
                         Double wllUsagePercent, String riskLevel, boolean angleWarning) {}
}
