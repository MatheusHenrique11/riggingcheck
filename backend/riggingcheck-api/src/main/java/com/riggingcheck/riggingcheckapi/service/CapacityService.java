package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyRequest;
import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyResponse;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import org.springframework.stereotype.Service;

@Service
public class CapacityService {

    public CapacityVerifyResponse verify(CapacityVerifyRequest req) {
        double totalLoad = req.loadWeight() + req.riggingWeight();
        double usagePct = (totalLoad / req.craneCapacity()) * 100;
        String risk = usagePct < 70 ? "SAFE" : usagePct < 90 ? "WARNING" : "DANGER";
        return new CapacityVerifyResponse(totalLoad, usagePct, req.craneCapacity() - totalLoad, risk, usagePct < 90);
    }
}
