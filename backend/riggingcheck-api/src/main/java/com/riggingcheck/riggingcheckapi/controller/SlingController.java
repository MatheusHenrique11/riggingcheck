package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.SlingCalculateRequest;
import com.riggingcheck.riggingcheckapi.dto.SlingCalculateResponse;
import com.riggingcheck.riggingcheckapi.service.SlingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sling")
public class SlingController {

    private final SlingService slingService;

    public SlingController(SlingService slingService) {
        this.slingService = slingService;
    }

    @PostMapping("/calculate")
    public ResponseEntity<SlingCalculateResponse> calculate(@Valid @RequestBody SlingCalculateRequest req) {
        return ResponseEntity.ok(slingService.calculate(req));
    }
}
