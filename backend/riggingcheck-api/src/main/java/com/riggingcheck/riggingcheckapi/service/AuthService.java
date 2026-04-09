package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LoginRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginResponse;
import com.riggingcheck.riggingcheckapi.dto.RegisterEmpresaRequest;
import com.riggingcheck.riggingcheckapi.dto.SetupRequest;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

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
                || !funcionarioOpt.get().getAtivo()
                || !passwordEncoder.matches(request.getPassword(), funcionarioOpt.get().getPasswordHash())) {
            throw new RuntimeException("Credenciais inválidas");
        }

        Funcionario funcionario = funcionarioOpt.get();

        Optional<Empresa> empresaOpt = empresaRepository.findById(funcionario.getEmpresaId());
        if (empresaOpt.isEmpty()) {
            throw new RuntimeException("Empresa não encontrada");
        }

        Empresa empresa = empresaOpt.get();
        if (Boolean.FALSE.equals(empresa.getAtivo())) {
            throw new RuntimeException("Credenciais inválidas");
        }

        String token = jwtService.generateToken(funcionario);

        return LoginResponse.builder()
                .token(token)
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
     * Só funciona se ainda não existe nenhum SUPER_ADMIN no banco.
     * Após o primeiro uso, retorna erro — endpoint de uso único.
     */
    @Transactional
    public void setupSuperAdmin(SetupRequest request) {
        boolean jaExiste = !funcionarioRepository.findByRole(RoleEnum.SUPER_ADMIN).isEmpty();
        if (jaExiste) {
            throw new RuntimeException("Setup já realizado. SUPER_ADMIN já existe.");
        }

        // SUPER_ADMIN não pertence a nenhuma empresa — usa empresa de sistema
        Empresa empresaSistema = empresaRepository.findByCnpj("00.000.000/0000-00")
                .orElseGet(() -> {
                    Empresa e = new Empresa();
                    e.setRazaoSocial("RiggingCheck Sistema");
                    e.setCnpj("00.000.000/0000-00");
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
        // Verificar se CNPJ já existe
        if (empresaRepository.findByCnpj(request.getCnpj()).isPresent()) {
            throw new RuntimeException("CNPJ já cadastrado");
        }

        // Verificar se email já existe
        if (funcionarioRepository.findByEmail(request.getAdminEmail()).isPresent()) {
            throw new RuntimeException("Email já cadastrado");
        }

        // Criar empresa
        Empresa empresa = new Empresa();
        empresa.setRazaoSocial(request.getRazaoSocial());
        empresa.setCnpj(request.getCnpj());
        empresa = empresaRepository.save(empresa);

        // Criar administrador
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