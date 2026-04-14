package com.riggingcheck.riggingcheckapi.shared;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * Centraliza as verificações de autorização que se repetiam em
 * FuncionarioService, LiberacaoService e AdminService.
 */
@Component
public class AuthorizationHelper {

    private static final Set<RoleEnum> ROLES_ADMIN = Set.of(
        RoleEnum.ADMIN_EMPRESA,
        RoleEnum.GERENTE_OPERACOES,
        RoleEnum.LIDER_EQUIPE,
        RoleEnum.SUPER_ADMIN
    );

    /**
     * Exige que o funcionário seja admin (qualquer nível).
     * Também valida que a conta está ativa.
     */
    public void requireAdmin(Funcionario funcionario) {
        requireAtivo(funcionario);
        if (!ROLES_ADMIN.contains(funcionario.getRole())) {
            throw new AcessoNegadoException();
        }
    }

    /** Exige Super Admin. */
    public void requireSuperAdmin(Funcionario funcionario) {
        requireAtivo(funcionario);
        if (funcionario.getRole() != RoleEnum.SUPER_ADMIN) {
            throw new AcessoNegadoException();
        }
    }

    /**
     * Exige que o ator pertença à mesma empresa que o alvo,
     * ou que seja Super Admin (que pode acessar qualquer empresa).
     */
    public void requireMesmaEmpresaOuSuper(Funcionario ator, UUID empresaAlvoId) {
        if (ator.getRole() == RoleEnum.SUPER_ADMIN) return;
        if (!ator.getEmpresaId().equals(empresaAlvoId)) {
            throw new AcessoNegadoException();
        }
    }

    private void requireAtivo(Funcionario funcionario) {
        if (!Boolean.TRUE.equals(funcionario.getAtivo())) {
            throw new AcessoNegadoException();
        }
    }
}
