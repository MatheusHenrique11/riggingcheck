package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.dto.AtualizarFuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.EmpresaAdminRequest;
import com.riggingcheck.riggingcheckapi.dto.EmpresaAdminResponse;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
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
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final String PREFIXO_CHAVE_API = "RC-";

    private static final Set<RoleEnum> ROLES_FUNCIONARIO = Set.of(
        RoleEnum.RIGGER, RoleEnum.OPERADOR_GUINDASTE, RoleEnum.LIDER_EQUIPE,
        RoleEnum.GERENTE_OPERACOES, RoleEnum.ADMIN_EMPRESA
    );

    private final EmpresaRepository              empresaRepository;
    private final FuncionarioRepository          funcionarioRepository;
    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final BCryptPasswordEncoder          passwordEncoder;
    private final AuthorizationHelper            authorizationHelper;
    private final FuncionarioMapper              funcionarioMapper;

    public AdminService(EmpresaRepository empresaRepository,
                        FuncionarioRepository funcionarioRepository,
                        SolicitacaoLiberacaoRepository liberacaoRepository,
                        BCryptPasswordEncoder passwordEncoder,
                        AuthorizationHelper authorizationHelper,
                        FuncionarioMapper funcionarioMapper) {
        this.empresaRepository     = empresaRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.liberacaoRepository   = liberacaoRepository;
        this.passwordEncoder        = passwordEncoder;
        this.authorizationHelper   = authorizationHelper;
        this.funcionarioMapper     = funcionarioMapper;
    }

    // ── Empresas ──────────────────────────────────────────────────────────────────

    public List<EmpresaAdminResponse> listarEmpresas() {
        return empresaRepository.findAllByOrderByCriadoEmDesc()
                .stream()
                .map(this::toEmpresaResponse)
                .toList();
    }

    @Transactional
    public EmpresaAdminResponse criarEmpresa(EmpresaAdminRequest request) {
        validarCnpjDisponivel(request.getCnpj());
        validarEmailDisponivel(request.getAdminEmail());

        Empresa empresa = criarEntidadeEmpresa(request);
        criarAdminEmpresa(empresa.getId(), request);

        log.info("Empresa criada: {} | CNPJ: {}", empresa.getRazaoSocial(), empresa.getCnpj());
        return toEmpresaResponse(empresa);
    }

    @Transactional
    public void alternarStatusEmpresa(UUID empresaId, boolean ativar) {
        Empresa empresa = buscarEmpresaOuLancar(empresaId);
        List<Funcionario> funcionarios = funcionarioRepository.findByEmpresaIdOrderByCriadoEmDesc(empresaId);

        empresa.setAtivo(ativar);
        funcionarios.forEach(f -> f.setAtivo(ativar));

        empresaRepository.save(empresa);
        funcionarioRepository.saveAll(funcionarios);
        log.info("Status da empresa {} alterado para ativo={}", empresaId, ativar);
    }

    // ── Funcionários (escopo super admin — qualquer empresa) ──────────────────────

    public List<FuncionarioResponse> listarFuncionariosEmpresa(UUID empresaId) {
        buscarEmpresaOuLancar(empresaId);
        return funcionarioRepository.findByEmpresaIdOrderByCriadoEmDesc(empresaId)
                .stream()
                .map(funcionarioMapper::toResponse)
                .toList();
    }

    @Transactional
    public FuncionarioResponse criarFuncionarioEmpresa(UUID empresaId, FuncionarioRequest request) {
        buscarEmpresaOuLancar(empresaId);
        RoleEnum role = resolverRolePermitida(request.getRole());
        validarEmailDisponivel(request.getEmail());

        Funcionario f = new Funcionario();
        f.setEmpresaId(empresaId);
        f.setNome(request.getNome());
        f.setEmail(request.getEmail());
        f.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        f.setRole(role);
        f.setAtivo(true);

        log.info("Funcionário criado via admin: {} | role: {} | empresa: {}", f.getEmail(), role, empresaId);
        return funcionarioMapper.toResponse(funcionarioRepository.save(f));
    }

    @Transactional
    public FuncionarioResponse atualizarFuncionarioEmpresa(UUID empresaId, UUID funcionarioId,
                                                           AtualizarFuncionarioRequest request) {
        buscarEmpresaOuLancar(empresaId);
        Funcionario f = buscarFuncionarioDaEmpresaOuLancar(empresaId, funcionarioId);
        RoleEnum role = resolverRolePermitida(request.getRole());

        boolean emailAlterado = !f.getEmail().equalsIgnoreCase(request.getEmail());
        if (emailAlterado) validarEmailDisponivel(request.getEmail());

        f.setNome(request.getNome());
        f.setEmail(request.getEmail());
        f.setRole(role);

        log.info("Funcionário {} atualizado via admin | empresa: {}", funcionarioId, empresaId);
        return funcionarioMapper.toResponse(funcionarioRepository.save(f));
    }

    @Transactional
    public void alternarStatusFuncionario(UUID empresaId, UUID funcionarioId, boolean ativar) {
        buscarEmpresaOuLancar(empresaId);
        Funcionario f = buscarFuncionarioDaEmpresaOuLancar(empresaId, funcionarioId);

        f.setAtivo(ativar);
        funcionarioRepository.save(f);
        log.info("Funcionário {} ativo={} | empresa: {}", funcionarioId, ativar, empresaId);
    }

    // ── Chave de API ──────────────────────────────────────────────────────────────

    public String gerarChaveApi(String emailSuperAdmin) {
        Funcionario superAdmin = buscarSuperAdminOuLancar(emailSuperAdmin);
        String novaChave = PREFIXO_CHAVE_API
                + UUID.randomUUID().toString().toUpperCase().replace("-", "").substring(0, 24);
        superAdmin.setChaveApi(novaChave);
        funcionarioRepository.save(superAdmin);
        log.info("Chave API gerada para: {}", emailSuperAdmin);
        return novaChave;
    }

    public String obterChaveApi(String emailSuperAdmin) {
        Funcionario superAdmin = buscarSuperAdminOuLancar(emailSuperAdmin);
        return superAdmin.getChaveApi() != null ? superAdmin.getChaveApi() : "";
    }

    // ── Helpers privados ─────────────────────────────────────────────────────────

    private Empresa criarEntidadeEmpresa(EmpresaAdminRequest request) {
        Empresa empresa = new Empresa();
        empresa.setRazaoSocial(request.getRazaoSocial());
        empresa.setCnpj(request.getCnpj());
        empresa.setAtivo(true);
        return empresaRepository.save(empresa);
    }

    private void criarAdminEmpresa(UUID empresaId, EmpresaAdminRequest request) {
        Funcionario admin = new Funcionario();
        admin.setEmpresaId(empresaId);
        admin.setNome(request.getAdminNome());
        admin.setEmail(request.getAdminEmail());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminSenha()));
        admin.setRole(RoleEnum.ADMIN_EMPRESA);
        admin.setAtivo(true);
        funcionarioRepository.save(admin);
    }

    private Empresa buscarEmpresaOuLancar(UUID empresaId) {
        return empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));
    }

    private Funcionario buscarFuncionarioDaEmpresaOuLancar(UUID empresaId, UUID funcionarioId) {
        Funcionario f = funcionarioRepository.findById(funcionarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));
        if (!f.getEmpresaId().equals(empresaId)) {
            throw new AcessoNegadoException();
        }
        return f;
    }

    private Funcionario buscarSuperAdminOuLancar(String email) {
        Funcionario f = funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
        authorizationHelper.requireSuperAdmin(f);
        return f;
    }

    private RoleEnum resolverRolePermitida(String roleStr) {
        RoleEnum role;
        try {
            role = RoleEnum.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Cargo inválido: " + roleStr);
        }
        if (!ROLES_FUNCIONARIO.contains(role)) {
            throw new RegraDeNegocioException("Cargo não permitido: " + roleStr);
        }
        return role;
    }

    private void validarCnpjDisponivel(String cnpj) {
        if (empresaRepository.findByCnpj(cnpj).isPresent()) {
            throw new RegraDeNegocioException("CNPJ já cadastrado");
        }
    }

    private void validarEmailDisponivel(String email) {
        if (funcionarioRepository.findByEmail(email).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }
    }

    private EmpresaAdminResponse toEmpresaResponse(Empresa empresa) {
        List<Funcionario> admins = funcionarioRepository
                .findByEmpresaIdAndRole(empresa.getId(), RoleEnum.ADMIN_EMPRESA);

        return EmpresaAdminResponse.builder()
                .id(empresa.getId())
                .razaoSocial(empresa.getRazaoSocial())
                .cnpj(empresa.getCnpj())
                .ativo(!Boolean.FALSE.equals(empresa.getAtivo()))
                .criadoEm(empresa.getCriadoEm())
                .adminNome(admins.isEmpty() ? null : admins.get(0).getNome())
                .adminEmail(admins.isEmpty() ? null : admins.get(0).getEmail())
                .totalFuncionarios(empresaRepository.countFuncionariosAtivos(empresa.getId()))
                .totalLiberacoes(liberacaoRepository.countByEmpresaId(empresa.getId()))
                .liberacoesAnalisar(liberacaoRepository.countByEmpresaIdAndStatus(empresa.getId(), StatusLiberacao.ANALISAR))
                .liberacoesProsseguir(liberacaoRepository.countByEmpresaIdAndStatus(empresa.getId(), StatusLiberacao.PROSSEGUIR))
                .liberacoesParar(liberacaoRepository.countByEmpresaIdAndStatus(empresa.getId(), StatusLiberacao.PARAR))
                .build();
    }
}
