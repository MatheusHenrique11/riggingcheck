package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.service.SlingService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sling")
public class SlingController {

    private final SlingService slingService;

    public SlingController(SlingService slingService) {
        this.slingService = slingService;
    }

    @PostMapping("/calculate")
    public SlingService.SlingResponse calculate(@RequestBody SlingService.SlingRequest req) {
        return slingService.calculate(req);
    }
}
