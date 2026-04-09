package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LoginRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginResponse;
import com.riggingcheck.riggingcheckapi.dto.RegisterEmpresaRequest;
import com.riggingcheck.riggingcheckapi.dto.SetupRequest;
import com.riggingcheck.riggingcheckapi.exception.CredenciaisInvalidasException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.exception.RecursoNaoEncontradoException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private static final String CNPJ_SISTEMA = "00.000.000/0000-00";

    private final FuncionarioRepository funcionarioRepository;
    private final EmpresaRepository empresaRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(FuncionarioRepository funcionarioRepository,
                       EmpresaRepository empresaRepository,
                       JwtService jwtService,
                       BCryptPasswordEncoder passwordEncoder) {
        this.funcionarioRepository = funcionarioRepository;
        this.empresaRepository = empresaRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        Optional<Funcionario> funcionarioOpt = funcionarioRepository.findByEmail(request.getEmail());

        if (funcionarioOpt.isEmpty()
                || Boolean.FALSE.equals(funcionarioOpt.get().getAtivo())
                || !passwordEncoder.matches(request.getPassword(), funcionarioOpt.get().getPasswordHash())) {
            throw new CredenciaisInvalidasException();
        }

        Funcionario funcionario = funcionarioOpt.get();

        Empresa empresa = empresaRepository.findById(funcionario.getEmpresaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa"));

        if (Boolean.FALSE.equals(empresa.getAtivo())) {
            throw new CredenciaisInvalidasException();
        }

        return LoginResponse.builder()
                .token(jwtService.generateToken(funcionario))
                .userId(funcionario.getId())
                .userName(funcionario.getNome())
                .role(funcionario.getRole())
                .empresaId(empresa.getId())
                .empresaName(empresa.getRazaoSocial())
                .empresaCnpj(empresa.getCnpj())
                .build();
    }

    /**
     * Cria o primeiro SUPER_ADMIN do sistema.
     * Isolamento SERIALIZABLE previne race condition em chamadas simultâneas.
     * Só funciona se ainda não existe nenhum SUPER_ADMIN no banco.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void setupSuperAdmin(SetupRequest request) {
        if (!funcionarioRepository.findByRole(RoleEnum.SUPER_ADMIN).isEmpty()) {
            throw new RegraDeNegocioException("Setup já realizado. SUPER_ADMIN já existe.");
        }

        Empresa empresaSistema = empresaRepository.findByCnpj(CNPJ_SISTEMA)
                .orElseGet(() -> {
                    Empresa e = new Empresa();
                    e.setRazaoSocial("RiggingCheck Sistema");
                    e.setCnpj(CNPJ_SISTEMA);
                    e.setAtivo(true);
                    return empresaRepository.save(e);
                });

        Funcionario superAdmin = new Funcionario();
        superAdmin.setEmpresaId(empresaSistema.getId());
        superAdmin.setNome(request.getNome());
        superAdmin.setEmail(request.getEmail());
        superAdmin.setPasswordHash(passwordEncoder.encode(request.getSenha()));
        superAdmin.setRole(RoleEnum.SUPER_ADMIN);
        superAdmin.setAtivo(true);
        funcionarioRepository.save(superAdmin);
    }

    @Transactional
    public void registerEmpresa(RegisterEmpresaRequest request) {
        if (empresaRepository.findByCnpj(request.getCnpj()).isPresent()) {
            throw new RegraDeNegocioException("CNPJ já cadastrado");
        }
        if (funcionarioRepository.findByEmail(request.getAdminEmail()).isPresent()) {
            throw new RegraDeNegocioException("Email já cadastrado");
        }

        Empresa empresa = new Empresa();
        empresa.setRazaoSocial(request.getRazaoSocial());
        empresa.setCnpj(request.getCnpj());
        empresa = empresaRepository.save(empresa);

        Funcionario admin = new Funcionario();
        admin.setEmpresaId(empresa.getId());
        admin.setNome(request.getAdminName());
        admin.setEmail(request.getAdminEmail());
        admin.setPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        admin.setRole(RoleEnum.ADMIN_EMPRESA);
        admin.setAtivo(true);
        funcionarioRepository.save(admin);
    }
}
