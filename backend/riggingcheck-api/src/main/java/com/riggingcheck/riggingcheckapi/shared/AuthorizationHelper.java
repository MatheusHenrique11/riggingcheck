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

    /**
     * Papéis que podem VISUALIZAR solicitações e listar equipe.
     * ADMIN_EMPRESA, GERENTE_OPERACOES, LIDER_EQUIPE, SUPER_ADMIN.
     */
    private static final Set<RoleEnum> ROLES_ADMIN = Set.of(
        RoleEnum.ADMIN_EMPRESA,
        RoleEnum.GERENTE_OPERACOES,
        RoleEnum.LIDER_EQUIPE,
        RoleEnum.SUPER_ADMIN
    );

    /**
     * Papéis que podem APROVAR ou REPROVAR solicitações.
     * ADMIN_EMPRESA, LIDER_EQUIPE, SUPER_ADMIN.
     * GERENTE_OPERACOES tem acesso somente leitura.
     */
    private static final Set<RoleEnum> ROLES_COM_RESOLUCAO = Set.of(
        RoleEnum.ADMIN_EMPRESA,
        RoleEnum.LIDER_EQUIPE,
        RoleEnum.SUPER_ADMIN
    );

    /**
     * Papéis que podem CRIAR, EDITAR e DESATIVAR funcionários.
     * ADMIN_EMPRESA, SUPER_ADMIN.
     */
    private static final Set<RoleEnum> ROLES_GESTOR_FUNCIONARIOS = Set.of(
        RoleEnum.ADMIN_EMPRESA,
        RoleEnum.SUPER_ADMIN
    );

    /** Exige acesso de visualização (solicitar + listar). */
    public void requireAdmin(Funcionario funcionario) {
        requireAtivo(funcionario);
        if (!ROLES_ADMIN.contains(funcionario.getRole())) {
            throw new AcessoNegadoException();
        }
    }

    /** Exige permissão para aprovar/reprovar içamentos. */
    public void requireAdminComResolucao(Funcionario funcionario) {
        requireAtivo(funcionario);
        if (!ROLES_COM_RESOLUCAO.contains(funcionario.getRole())) {
            throw new AcessoNegadoException();
        }
    }

    /** Exige permissão para gerenciar funcionários (CRUD). */
    public void requireGestorFuncionarios(Funcionario funcionario) {
        requireAtivo(funcionario);
        if (!ROLES_GESTOR_FUNCIONARIOS.contains(funcionario.getRole())) {
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
