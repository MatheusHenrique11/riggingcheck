package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.dto.EmpresaAdminRequest;
import com.riggingcheck.riggingcheckapi.dto.EmpresaAdminResponse;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioRequest;
import com.riggingcheck.riggingcheckapi.dto.FuncionarioResponse;
import com.riggingcheck.riggingcheckapi.exception.AcessoNegadoException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminService {

    private static final String PREFIXO_CHAVE_API = "RC-";

    private static final Set<RoleEnum> ROLES_FUNCIONARIO =
            Set.of(RoleEnum.RIGGER, RoleEnum.LIDER_EQUIPE, RoleEnum.GERENTE_OPERACOES, RoleEnum.ADMIN_EMPRESA);

    private final EmpresaRepository empresaRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final SolicitacaoLiberacaoRepository liberacaoRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AdminService(EmpresaRepository empresaRepository,
                        FuncionarioRepository funcionarioRepository,
                        SolicitacaoLiberacaoRepository liberacaoRepository,
                        BCryptPasswordEncoder passwordEncoder) {
        this.empresaRepository = empresaRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.liberacaoRepository = liberacaoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Empresas ──────────────────────────────────────────────────────────────────

    public List<EmpresaAdminResponse> listarEmpresas() {
        return empresaRepository.findAllByOrderByCriadoEmDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EmpresaAdminResponse criarEmpresa(EmpresaAdminRequest request) {
        if (empresaRepository.findByCnpj(request.getCnpj()).isPresent()) {
            throw new RegraDeNegocioException("CNPJ já cadastrado");
        }
        if (funcionarioRepository.findByEmail(request.getAdminEmail()).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }

        Empresa empresa = new Empresa();
        empresa.setRazaoSocial(request.getRazaoSocial());
        empresa.setCnpj(request.getCnpj());
        empresa.setAtivo(true);
        empresa = empresaRepository.save(empresa);

        Funcionario admin = new Funcionario();
        admin.setEmpresaId(empresa.getId());
        admin.setNome(request.getAdminNome());
        admin.setEmail(request.getAdminEmail());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminSenha()));
        admin.setRole(RoleEnum.ADMIN_EMPRESA);
        admin.setAtivo(true);
        funcionarioRepository.save(admin);

        return toResponse(empresa);
    }

    @Transactional
    public void alternarStatusEmpresa(UUID empresaId, boolean ativar) {
        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));

        empresa.setAtivo(ativar);
        empresaRepository.save(empresa);

        List<Funcionario> funcionarios = funcionarioRepository.findByEmpresaIdOrderByCriadoEmDesc(empresaId);
        funcionarios.forEach(f -> f.setAtivo(ativar));
        funcionarioRepository.saveAll(funcionarios);
    }

    // ── Funcionários (escopo super admin — qualquer empresa) ──────────────────────

    public List<FuncionarioResponse> listarFuncionariosEmpresa(UUID empresaId) {
        empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));
        return funcionarioRepository.findByEmpresaIdOrderByCriadoEmDesc(empresaId)
                .stream()
                .map(this::toFuncionarioResponse)
                .toList();
    }

    @Transactional
    public FuncionarioResponse criarFuncionarioEmpresa(UUID empresaId, FuncionarioRequest request) {
        empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));

        RoleEnum role;
        try {
            role = RoleEnum.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RegraDeNegocioException("Cargo inválido: " + request.getRole());
        }

        if (!ROLES_FUNCIONARIO.contains(role)) {
            throw new RegraDeNegocioException("Cargo não permitido: " + request.getRole());
        }

        if (funcionarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }

        Funcionario f = new Funcionario();
        f.setEmpresaId(empresaId);
        f.setNome(request.getNome());
        f.setEmail(request.getEmail());
        f.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        f.setRole(role);
        f.setAtivo(true);

        return toFuncionarioResponse(funcionarioRepository.save(f));
    }

    @Transactional
    public void alternarStatusFuncionario(UUID empresaId, UUID funcionarioId, boolean ativar) {
        empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));

        Funcionario f = funcionarioRepository.findById(funcionarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Funcionário"));

        if (!f.getEmpresaId().equals(empresaId)) {
            throw new AcessoNegadoException();
        }

        f.setAtivo(ativar);
        funcionarioRepository.save(f);
    }

    // ── Chave de API ──────────────────────────────────────────────────────────────

    public String gerarChaveApi(String emailSuperAdmin) {
        Funcionario superAdmin = buscarSuperAdmin(emailSuperAdmin);
        String novaChave = PREFIXO_CHAVE_API + UUID.randomUUID().toString().toUpperCase().replace("-", "").substring(0, 24);
        superAdmin.setChaveApi(novaChave);
        funcionarioRepository.save(superAdmin);
        return novaChave;
    }

    public String obterChaveApi(String emailSuperAdmin) {
        Funcionario superAdmin = buscarSuperAdmin(emailSuperAdmin);
        String chave = superAdmin.getChaveApi();
        return chave != null ? chave : "";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private Funcionario buscarSuperAdmin(String email) {
        Funcionario funcionario = funcionarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário"));
        if (funcionario.getRole() != RoleEnum.SUPER_ADMIN) {
            throw new AcessoNegadoException();
        }
        return funcionario;
    }

    private EmpresaAdminResponse toResponse(Empresa empresa) {
        List<Funcionario> admins = funcionarioRepository
                .findByEmpresaIdAndRole(empresa.getId(), RoleEnum.ADMIN_EMPRESA);

        String adminNome  = admins.isEmpty() ? null : admins.get(0).getNome();
        String adminEmail = admins.isEmpty() ? null : admins.get(0).getEmail();
        long totalFunc    = empresaRepository.countFuncionariosAtivos(empresa.getId());

        long totalLib      = liberacaoRepository.countByEmpresaId(empresa.getId());
        long libAnalisar   = liberacaoRepository.countByEmpresaIdAndStatus(empresa.getId(), StatusLiberacao.ANALISAR);
        long libProsseguir = liberacaoRepository.countByEmpresaIdAndStatus(empresa.getId(), StatusLiberacao.PROSSEGUIR);
        long libParar      = liberacaoRepository.countByEmpresaIdAndStatus(empresa.getId(), StatusLiberacao.PARAR);

        return EmpresaAdminResponse.builder()
                .id(empresa.getId())
                .razaoSocial(empresa.getRazaoSocial())
                .cnpj(empresa.getCnpj())
                .ativo(!Boolean.FALSE.equals(empresa.getAtivo()))
                .criadoEm(empresa.getCriadoEm())
                .adminNome(adminNome)
                .adminEmail(adminEmail)
                .totalFuncionarios(totalFunc)
                .totalLiberacoes(totalLib)
                .liberacoesAnalisar(libAnalisar)
                .liberacoesProsseguir(libProsseguir)
                .liberacoesParar(libParar)
                .build();
    }

    private FuncionarioResponse toFuncionarioResponse(Funcionario f) {
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
