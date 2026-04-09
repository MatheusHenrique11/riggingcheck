package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FuncionarioService {

    private static final Set<RoleEnum> ROLES_PERMITIDAS_ADMIN =
            Set.of(RoleEnum.RIGGER, RoleEnum.GERENTE_OPERACOES, RoleEnum.LIDER_EQUIPE);

    private static final Set<RoleEnum> ROLES_PERMITIDAS_SUPER =
            Set.of(RoleEnum.RIGGER, RoleEnum.GERENTE_OPERACOES, RoleEnum.LIDER_EQUIPE, RoleEnum.ADMIN_EMPRESA);

    private final FuncionarioRepository funcionarioRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public FuncionarioService(FuncionarioRepository funcionarioRepository,
                              BCryptPasswordEncoder passwordEncoder) {
        this.funcionarioRepository = funcionarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public FuncionarioResponse criar(FuncionarioRequest request, String emailAdmin) {
        Funcionario admin = buscarComPermissaoAdmin(emailAdmin);

        RoleEnum roleRequisitada;
        try {
            roleRequisitada = RoleEnum.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Cargo inválido: " + request.getRole());
        }

        Set<RoleEnum> rolesPermitidas = admin.getRole() == RoleEnum.SUPER_ADMIN
                ? ROLES_PERMITIDAS_SUPER : ROLES_PERMITIDAS_ADMIN;

        if (!rolesPermitidas.contains(roleRequisitada)) {
            throw new AcessoNegadoException();
        }

        if (funcionarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }

        Funcionario f = new Funcionario();
        f.setEmpresaId(admin.getEmpresaId());
        f.setNome(request.getNome());
        f.setEmail(request.getEmail());
        f.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        f.setRole(roleRequisitada);
        f.setAtivo(true);

        return toResponse(funcionarioRepository.save(f));
    }

    public List<FuncionarioResponse> listar(String emailAdmin) {
        Funcionario admin = buscarComPermissaoAdmin(emailAdmin);
        return funcionarioRepository.findByEmpresaIdOrderByCriadoEmDesc(admin.getEmpresaId())
                .stream()
                .filter(f -> !f.getId().equals(admin.getId()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void desativar(UUID id, String emailAdmin) {
        Funcionario admin = buscarComPermissaoAdmin(emailAdmin);
        Funcionario funcionario = buscarPorId(id);

        verificarMesmaEmpresa(admin, funcionario);

        if (funcionario.getId().equals(admin.getId())) {
            throw new RegraDeNegocioException("Não é possível desativar sua própria conta");
        }

        funcionario.setAtivo(false);
        funcionarioRepository.save(funcionario);
    }

    @Transactional
    public void reativar(UUID id, String emailAdmin) {
        Funcionario admin = buscarComPermissaoAdmin(emailAdmin);
        Funcionario funcionario = buscarPorId(id);

        verificarMesmaEmpresa(admin, funcionario);

        funcionario.setAtivo(true);
        funcionarioRepository.save(funcionario);
    }

    private Funcionario buscarComPermissaoAdmin(String email) {
        Funcionario admin = funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));

        if (admin.getRole() != RoleEnum.ADMIN_EMPRESA
                && admin.getRole() != RoleEnum.GERENTE_OPERACOES
                && admin.getRole() != RoleEnum.SUPER_ADMIN) {
            throw new AcessoNegadoException();
        }
        return admin;
    }

    private Funcionario buscarPorId(UUID id) {
        return funcionarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));
    }

    private void verificarMesmaEmpresa(Funcionario admin, Funcionario funcionario) {
        if (admin.getRole() != RoleEnum.SUPER_ADMIN
                && !funcionario.getEmpresaId().equals(admin.getEmpresaId())) {
            throw new AcessoNegadoException();
        }
    }

    private FuncionarioResponse toResponse(Funcionario f) {
        return FuncionarioResponse.builder()
                .id(f.getId())
                .nome(f.getNome())
                .email(f.getEmail())
                .role(f.getRole().name())
                .ativo(f.getAtivo())
                .criadoEm(f.getCriadoEm())
                .build();
    }
}
