package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.AlterarSenhaRequest;
import com.riggingcheck.riggingcheckapi.dto.AtualizarFuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.shared.AuthorizationHelper;
import com.riggingcheck.riggingcheckapi.shared.FuncionarioMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FuncionarioService {

    private static final Logger log = LoggerFactory.getLogger(FuncionarioService.class);

    private static final Set<RoleEnum> ROLES_PERMITIDAS_ADMIN = Set.of(
        RoleEnum.RIGGER, RoleEnum.OPERADOR_GUINDASTE, RoleEnum.GERENTE_OPERACOES, RoleEnum.LIDER_EQUIPE
    );

    private static final Set<RoleEnum> ROLES_PERMITIDAS_SUPER = Set.of(
        RoleEnum.RIGGER, RoleEnum.OPERADOR_GUINDASTE, RoleEnum.GERENTE_OPERACOES,
        RoleEnum.LIDER_EQUIPE, RoleEnum.ADMIN_EMPRESA
    );

    private final FuncionarioRepository funcionarioRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final AuthorizationHelper authorizationHelper;
    private final FuncionarioMapper mapper;

    public FuncionarioService(FuncionarioRepository funcionarioRepository,
                              BCryptPasswordEncoder passwordEncoder,
                              AuthorizationHelper authorizationHelper,
                              FuncionarioMapper mapper) {
        this.funcionarioRepository = funcionarioRepository;
        this.passwordEncoder        = passwordEncoder;
        this.authorizationHelper    = authorizationHelper;
        this.mapper                 = mapper;
    }

    @Transactional
    public FuncionarioResponse criar(FuncionarioRequest request, String emailAdmin) {
        Funcionario admin = buscarPorEmailOuLancar(emailAdmin);
        authorizationHelper.requireAdmin(admin);

        RoleEnum role = resolverRole(request.getRole());
        validarRolePermitida(role, admin);
        validarEmailDisponivel(request.getEmail());

        Funcionario novo = new Funcionario();
        novo.setEmpresaId(admin.getEmpresaId());
        novo.setNome(request.getNome());
        novo.setEmail(request.getEmail());
        novo.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        novo.setRole(role);
        novo.setAtivo(true);

        log.info("Funcionário criado: {} | role: {} | por: {}", novo.getEmail(), role, emailAdmin);
        return mapper.toResponse(funcionarioRepository.save(novo));
    }

    public List<FuncionarioResponse> listar(String emailAdmin) {
        Funcionario admin = buscarPorEmailOuLancar(emailAdmin);
        authorizationHelper.requireAdmin(admin);

        return funcionarioRepository
                .findByEmpresaIdOrderByCriadoEmDesc(admin.getEmpresaId())
                .stream()
                .filter(f -> !f.getId().equals(admin.getId()))
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional
    public void desativar(UUID id, String emailAdmin) {
        Funcionario admin       = buscarPorEmailOuLancar(emailAdmin);
        Funcionario funcionario = buscarPorIdOuLancar(id);

        authorizationHelper.requireAdmin(admin);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, funcionario.getEmpresaId());

        if (funcionario.getId().equals(admin.getId())) {
            throw new RegraDeNegocioException("Não é possível desativar sua própria conta");
        }

        funcionario.setAtivo(false);
        funcionarioRepository.save(funcionario);
        log.info("Funcionário desativado: {} | por: {}", id, emailAdmin);
    }

    @Transactional
    public void reativar(UUID id, String emailAdmin) {
        Funcionario admin       = buscarPorEmailOuLancar(emailAdmin);
        Funcionario funcionario = buscarPorIdOuLancar(id);

        authorizationHelper.requireAdmin(admin);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, funcionario.getEmpresaId());

        funcionario.setAtivo(true);
        funcionarioRepository.save(funcionario);
        log.info("Funcionário reativado: {} | por: {}", id, emailAdmin);
    }

    @Transactional
    public void alterarSenha(String emailFuncionario, AlterarSenhaRequest request) {
        Funcionario funcionario = buscarPorEmailOuLancar(emailFuncionario);

        if (!passwordEncoder.matches(request.getSenhaAtual(), funcionario.getPasswordHash())) {
            throw new RegraDeNegocioException("Senha atual incorreta");
        }

        funcionario.setPasswordHash(passwordEncoder.encode(request.getNovaSenha()));
        funcionarioRepository.save(funcionario);
        log.info("Senha alterada para: {}", emailFuncionario);
    }

    @Transactional
    public FuncionarioResponse atualizar(UUID id, AtualizarFuncionarioRequest request, String emailAdmin) {
        Funcionario admin       = buscarPorEmailOuLancar(emailAdmin);
        Funcionario funcionario = buscarPorIdOuLancar(id);

        authorizationHelper.requireAdmin(admin);
        authorizationHelper.requireMesmaEmpresaOuSuper(admin, funcionario.getEmpresaId());

        RoleEnum role = resolverRole(request.getRole());
        validarRolePermitida(role, admin);

        boolean emailAlterado = !funcionario.getEmail().equalsIgnoreCase(request.getEmail());
        if (emailAlterado) validarEmailDisponivel(request.getEmail());

        funcionario.setNome(request.getNome());
        funcionario.setEmail(request.getEmail());
        funcionario.setRole(role);

        log.info("Funcionário atualizado: {} | role: {} | por: {}", id, role, emailAdmin);
        return mapper.toResponse(funcionarioRepository.save(funcionario));
    }

    // ── Helpers privados ────────────────────────────────────────────────────────

    private Funcionario buscarPorEmailOuLancar(String email) {
        return funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
    }

    private Funcionario buscarPorIdOuLancar(UUID id) {
        return funcionarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));
    }

    private RoleEnum resolverRole(String roleStr) {
        try {
            return RoleEnum.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Cargo inválido: " + roleStr);
        }
    }

    private void validarRolePermitida(RoleEnum role, Funcionario admin) {
        Set<RoleEnum> permitidas = admin.getRole() == RoleEnum.SUPER_ADMIN
                ? ROLES_PERMITIDAS_SUPER : ROLES_PERMITIDAS_ADMIN;
        if (!permitidas.contains(role)) {
            throw new AcessoNegadoException();
        }
    }

    private void validarEmailDisponivel(String email) {
        if (funcionarioRepository.findByEmail(email).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }
    }
}
