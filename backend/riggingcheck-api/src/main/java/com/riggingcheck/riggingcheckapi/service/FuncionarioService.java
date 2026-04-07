package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FuncionarioService {

    private final FuncionarioRepository funcionarioRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    // Roles que um ADMIN_EMPRESA ou GERENTE_OPERACOES pode criar
    private static final Set<String> ROLES_PERMITIDAS_ADMIN = Set.of("RIGGER", "GERENTE_OPERACOES");
    // SUPER_ADMIN também pode criar ADMIN_EMPRESA
    private static final Set<String> ROLES_PERMITIDAS_SUPER = Set.of("RIGGER", "GERENTE_OPERACOES", "ADMIN_EMPRESA");

    public FuncionarioService(FuncionarioRepository funcionarioRepository,
                              BCryptPasswordEncoder passwordEncoder) {
        this.funcionarioRepository = funcionarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public FuncionarioResponse criar(FuncionarioRequest request, String emailAdmin) {
        Funcionario admin = buscarAdmin(emailAdmin);

        String roleStr = request.getRole().toUpperCase();
        Set<String> rolesPermitidas = admin.getRole() == RoleEnum.SUPER_ADMIN
                ? ROLES_PERMITIDAS_SUPER : ROLES_PERMITIDAS_ADMIN;

        if (!rolesPermitidas.contains(roleStr)) {
            throw new RuntimeException("Cargo inválido ou sem permissão para criar este cargo");
        }

        if (funcionarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email já cadastrado");
        }

        Funcionario f = new Funcionario();
        f.setEmpresaId(admin.getEmpresaId());
        f.setNome(request.getNome());
        f.setEmail(request.getEmail());
        f.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        f.setRole(RoleEnum.valueOf(roleStr));
        f.setAtivo(true);

        return toResponse(funcionarioRepository.save(f));
    }

    public List<FuncionarioResponse> listar(String emailAdmin) {
        Funcionario admin = buscarAdmin(emailAdmin);
        return funcionarioRepository.findByEmpresaIdOrderByCriadoEmDesc(admin.getEmpresaId())
                .stream()
                .filter(f -> !f.getId().equals(admin.getId())) // não exibe o próprio admin
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void desativar(UUID id, String emailAdmin) {
        Funcionario admin = buscarAdmin(emailAdmin);

        Funcionario funcionario = funcionarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        if (!admin.getRole().equals(RoleEnum.SUPER_ADMIN)
                && !funcionario.getEmpresaId().equals(admin.getEmpresaId())) {
            throw new RuntimeException("Acesso negado");
        }

        if (funcionario.getId().equals(admin.getId())) {
            throw new RuntimeException("Não é possível desativar sua própria conta");
        }

        funcionario.setAtivo(false);
        funcionarioRepository.save(funcionario);
    }

    @Transactional
    public void reativar(UUID id, String emailAdmin) {
        Funcionario admin = buscarAdmin(emailAdmin);

        Funcionario funcionario = funcionarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        if (!admin.getRole().equals(RoleEnum.SUPER_ADMIN)
                && !funcionario.getEmpresaId().equals(admin.getEmpresaId())) {
            throw new RuntimeException("Acesso negado");
        }

        funcionario.setAtivo(true);
        funcionarioRepository.save(funcionario);
    }

    private Funcionario buscarAdmin(String email) {
        Funcionario admin = funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (admin.getRole() != RoleEnum.ADMIN_EMPRESA
                && admin.getRole() != RoleEnum.GERENTE_OPERACOES
                && admin.getRole() != RoleEnum.SUPER_ADMIN) {
            throw new RuntimeException("Acesso negado: apenas administradores podem gerenciar funcionários");
        }
        return admin;
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
