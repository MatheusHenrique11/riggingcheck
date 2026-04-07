package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LoginRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginResponse;
import com.riggingcheck.riggingcheckapi.dto.RegisterEmpresaRequest;
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

        String token = jwtService.generateToken(funcionario);
        Empresa empresa = empresaOpt.get();

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