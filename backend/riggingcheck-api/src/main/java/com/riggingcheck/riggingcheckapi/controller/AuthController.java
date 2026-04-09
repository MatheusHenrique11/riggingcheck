package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.LoginRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginResponse;
import com.riggingcheck.riggingcheckapi.dto.RegisterEmpresaRequest;
import com.riggingcheck.riggingcheckapi.dto.SetupRequest;
import com.riggingcheck.riggingcheckapi.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<Void> registerEmpresa(@Valid @RequestBody RegisterEmpresaRequest request) {
        authService.registerEmpresa(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Endpoint de uso único para criar o primeiro SUPER_ADMIN.
     * Retorna erro se SUPER_ADMIN já existir.
     */
    @PostMapping("/setup")
    public ResponseEntity<Void> setup(@Valid @RequestBody SetupRequest request) {
        authService.setupSuperAdmin(request);
        return ResponseEntity.ok().build();
    }
}