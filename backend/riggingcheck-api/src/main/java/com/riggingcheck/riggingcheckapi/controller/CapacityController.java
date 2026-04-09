package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyRequest;
import com.riggingcheck.riggingcheckapi.dto.CapacityVerifyResponse;
import com.riggingcheck.riggingcheckapi.service.CapacityService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/capacity")
public class CapacityController {

    private final CapacityService capacityService;

    public CapacityController(CapacityService capacityService) {
        this.capacityService = capacityService;
    }

    @PostMapping("/verify")
    public ResponseEntity<CapacityVerifyResponse> verify(@Valid @RequestBody CapacityVerifyRequest req) {
        return ResponseEntity.ok(capacityService.verify(req));
    }
}
