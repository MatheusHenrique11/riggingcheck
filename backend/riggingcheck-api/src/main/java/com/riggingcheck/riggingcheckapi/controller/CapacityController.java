package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.service.CapacityService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/capacity")
public class CapacityController {

    private final CapacityService capacityService;

    public CapacityController(CapacityService capacityService) {
        this.capacityService = capacityService;
    }

    @PostMapping("/verify")
    public CapacityService.CapacityResponse verify(@RequestBody CapacityService.CapacityRequest req) {
        return capacityService.verify(req);
    }
}
