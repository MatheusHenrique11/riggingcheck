package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.dto.EmpresaAdminRequest;
import com.riggingcheck.riggingcheckapi.dto.EmpresaAdminResponse;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ── Empresas ──────────────────────────────────────────────────────────────────

    @GetMapping("/empresas")
    public ResponseEntity<List<EmpresaAdminResponse>> listarEmpresas() {
        return ResponseEntity.ok(adminService.listarEmpresas());
    }

    @PostMapping("/empresas")
    public ResponseEntity<EmpresaAdminResponse> criarEmpresa(@Valid @RequestBody EmpresaAdminRequest request) {
        return ResponseEntity.ok(adminService.criarEmpresa(request));
    }

    @PostMapping("/empresas/{id}/ativar")
    public ResponseEntity<Void> ativarEmpresa(@PathVariable UUID id) {
        adminService.alternarStatusEmpresa(id, true);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/empresas/{id}/desativar")
    public ResponseEntity<Void> desativarEmpresa(@PathVariable UUID id) {
        adminService.alternarStatusEmpresa(id, false);
        return ResponseEntity.ok().build();
    }

    // ── Funcionários de uma empresa (escopo super admin) ──────────────────────────

    @GetMapping("/empresas/{id}/funcionarios")
    public ResponseEntity<List<FuncionarioResponse>> listarFuncionarios(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.listarFuncionariosEmpresa(id));
    }

    @PostMapping("/empresas/{id}/funcionarios")
    public ResponseEntity<FuncionarioResponse> criarFuncionario(
            @PathVariable UUID id,
            @Valid @RequestBody FuncionarioRequest request) {
        return ResponseEntity.ok(adminService.criarFuncionarioEmpresa(id, request));
    }

    @PostMapping("/empresas/{id}/funcionarios/{fid}/desativar")
    public ResponseEntity<Void> desativarFuncionario(@PathVariable UUID id, @PathVariable UUID fid) {
        adminService.alternarStatusFuncionario(id, fid, false);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/empresas/{id}/funcionarios/{fid}/reativar")
    public ResponseEntity<Void> reativarFuncionario(@PathVariable UUID id, @PathVariable UUID fid) {
        adminService.alternarStatusFuncionario(id, fid, true);
        return ResponseEntity.ok().build();
    }

    // ── Chave de API ──────────────────────────────────────────────────────────────

    @GetMapping("/chave")
    public ResponseEntity<Map<String, String>> obterChave(Principal principal) {
        String chave = adminService.obterChaveApi(principal.getName());
        return ResponseEntity.ok(Map.of("chave", chave));
    }

    @PostMapping("/chave/gerar")
    public ResponseEntity<Map<String, String>> gerarChave(Principal principal) {
        String chave = adminService.gerarChaveApi(principal.getName());
        return ResponseEntity.ok(Map.of("chave", chave));
    }
}
