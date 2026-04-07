package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.service.FuncionarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/funcionarios")
public class FuncionarioController {

    private final FuncionarioService funcionarioService;

    public FuncionarioController(FuncionarioService funcionarioService) {
        this.funcionarioService = funcionarioService;
    }

    @PostMapping
    public ResponseEntity<FuncionarioResponse> criar(
            @Valid @RequestBody FuncionarioRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(funcionarioService.criar(request, userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<FuncionarioResponse>> listar(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(funcionarioService.listar(userDetails.getUsername()));
    }

    @PostMapping("/{id}/desativar")
    public ResponseEntity<Void> desativar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        funcionarioService.desativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reativar")
    public ResponseEntity<Void> reativar(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        funcionarioService.reativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
