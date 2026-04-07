package com.riggingcheck.riggingcheckapi.service;

import org.springframework.stereotype.Service;

@Service
public class CapacityService {

    public CapacityResponse verify(CapacityRequest req) {
        double totalLoad = req.loadWeight() + req.riggingWeight();
        double usagePct = (totalLoad / req.craneCapacity()) * 100;
        String risk = usagePct < 70 ? "SAFE" : usagePct < 90 ? "WARNING" : "DANGER";
        return new CapacityResponse(totalLoad, usagePct,
                req.craneCapacity() - totalLoad, risk, usagePct < 90);
    }

    public record CapacityRequest(double craneCapacity, double loadWeight, double riggingWeight) {}
    public record CapacityResponse(double totalLoad, double usagePercent,
                                   double availableMargin, String riskLevel, boolean approved) {}
}