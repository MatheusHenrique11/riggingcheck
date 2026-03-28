package com.riggingcheck.riggingcheckapi.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/capacity")
@CrossOrigin(origins = "*")
public class CapacityController {

    @PostMapping("/verify")
    public CapacityResponse verify(@RequestBody CapacityRequest req) {
        double totalLoad = req.loadWeight() + req.riggingWeight();
        double usagePct = (totalLoad / req.craneCapacity()) * 100;
        String risk = usagePct < 70 ? "SAFE" : usagePct < 90 ? "WARNING" : "DANGER";
        return new CapacityResponse(totalLoad, usagePct,
                req.craneCapacity() - totalLoad, risk, usagePct < 90);
    }

    record CapacityRequest(double craneCapacity, double loadWeight, double riggingWeight) {}
    record CapacityResponse(double totalLoad, double usagePercent,
                            double availableMargin, String riskLevel, boolean approved) {}
}
