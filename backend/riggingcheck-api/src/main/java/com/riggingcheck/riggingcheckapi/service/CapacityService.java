package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyRequest;
import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyResponse;
import com.riggingcheck.riggingcheckapi.shared.RiskCalculator;
import org.springframework.stereotype.Service;

@Service
public class CapacityService {

    public CapacityVerifyResponse verify(CapacityVerifyRequest req) {
        double totalLoad   = req.loadWeight() + req.riggingWeight();
        double usagePct    = (totalLoad / req.craneCapacity()) * 100;
        double margem      = req.craneCapacity() - totalLoad;
        String risk        = RiskCalculator.fromUsagePercent(usagePct);
        boolean approved   = usagePct < RiskCalculator.WARNING_THRESHOLD;

        return new CapacityVerifyResponse(totalLoad, usagePct, margem, risk, approved);
    }
}
