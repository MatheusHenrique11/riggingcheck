package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.service.AlertDigestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/alertas")
public class AlertDigestController {

    private static final Set<RoleEnum> ROLES_PERMITIDOS = Set.of(
        RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN_EMPRESA, RoleEnum.SAFETY_ADMIN
    );

    private final AlertDigestService   digestService;
    private final FuncionarioRepository funcionarioRepository;

    public AlertDigestController(AlertDigestService digestService,
                                  FuncionarioRepository funcionarioRepository) {
        this.digestService         = digestService;
        this.funcionarioRepository = funcionarioRepository;
    }

    /**
     * Dispara o digest manualmente. Uso para testes e acionamento emergencial.
     * Acesso: SUPER_ADMIN, ADMIN_EMPRESA, SAFETY_ADMIN.
     */
    @PostMapping("/enviar-digest")
    public ResponseEntity<Map<String, Integer>> enviarDigest(
            @AuthenticationPrincipal UserDetails user) {

        Funcionario actor = funcionarioRepository.findByEmail(user.getUsername())
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));

        if (!actor.getAtivo() || !ROLES_PERMITIDOS.contains(actor.getRole())) {
            throw new AcessoNegadoException();
        }

        int enviados = actor.getRole() == RoleEnum.SUPER_ADMIN
            ? digestService.enviarDigestParaTodas()
            : digestService.enviarDigestParaEmpresa(actor.getEmpresaId());

        return ResponseEntity.ok(Map.of("enviados", enviados));
    }
}
