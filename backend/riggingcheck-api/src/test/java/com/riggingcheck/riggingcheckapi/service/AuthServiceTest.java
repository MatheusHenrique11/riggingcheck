package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.dto.LoginRequest;
import com.riggingcheck.riggingcheckapi.dto.LoginResponse;
import com.riggingcheck.riggingcheckapi.dto.SetupRequest;
import com.riggingcheck.riggingcheckapi.exception.CredenciaisInvalidasException;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private FuncionarioRepository funcionarioRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private JwtService jwtService;
    @Mock private BCryptPasswordEncoder passwordEncoder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
            funcionarioRepository, empresaRepository, jwtService, passwordEncoder
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Funcionario funcionarioAtivo(UUID empresaId) {
        Funcionario f = new Funcionario();
        f.setId(UUID.randomUUID());
        f.setEmpresaId(empresaId);
        f.setNome("Operador Teste");
        f.setEmail("op@empresa.com");
        f.setPasswordHash("$2a$hashed");
        f.setRole(RoleEnum.OPERADOR);
        f.setAtivo(true);
        return f;
    }

    private Empresa empresaAtiva(UUID id) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setRazaoSocial("Empresa Teste Ltda");
        e.setCnpj("12.345.678/0001-90");
        e.setAtivo(true);
        return e;
    }

    // ── login — caminho feliz ────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsLoginResponse() {
        UUID empresaId = UUID.randomUUID();
        Funcionario func = funcionarioAtivo(empresaId);
        Empresa empresa = empresaAtiva(empresaId);

        LoginRequest req = new LoginRequest();
        req.setEmail("op@empresa.com");
        req.setPassword("senha123");

        when(funcionarioRepository.findByEmail("op@empresa.com")).thenReturn(Optional.of(func));
        when(passwordEncoder.matches("senha123", "$2a$hashed")).thenReturn(true);
        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresa));
        when(jwtService.generateToken(func)).thenReturn("jwt-token-gerado");

        LoginResponse res = authService.login(req);

        assertThat(res.getToken()).isEqualTo("jwt-token-gerado");
        assertThat(res.getUserName()).isEqualTo("Operador Teste");
        assertThat(res.getRole()).isEqualTo(RoleEnum.OPERADOR);
        assertThat(res.getEmpresaName()).isEqualTo("Empresa Teste Ltda");
        assertThat(res.getUserId()).isEqualTo(func.getId());
    }

    @Test
    void login_callsJwtServiceToGenerateToken() {
        UUID empresaId = UUID.randomUUID();
        Funcionario func = funcionarioAtivo(empresaId);

        LoginRequest req = new LoginRequest();
        req.setEmail("op@empresa.com");
        req.setPassword("senha123");

        when(funcionarioRepository.findByEmail(anyString())).thenReturn(Optional.of(func));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresaAtiva(empresaId)));
        when(jwtService.generateToken(func)).thenReturn("token");

        authService.login(req);

        verify(jwtService, times(1)).generateToken(func);
    }

    // ── login — usuário não encontrado ───────────────────────────────────────────

    @Test
    void login_userNotFound_throwsCredenciaisInvalidasException() {
        LoginRequest req = new LoginRequest();
        req.setEmail("naoexiste@empresa.com");
        req.setPassword("qualquer");

        when(funcionarioRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(CredenciaisInvalidasException.class);
    }

    // ── login — usuário inativo ───────────────────────────────────────────────────

    @Test
    void login_inactiveUser_throwsCredenciaisInvalidasException() {
        Funcionario func = new Funcionario();
        func.setAtivo(false);
        func.setEmail("inativo@empresa.com");
        func.setPasswordHash("hash");

        LoginRequest req = new LoginRequest();
        req.setEmail("inativo@empresa.com");
        req.setPassword("senha");

        when(funcionarioRepository.findByEmail("inativo@empresa.com")).thenReturn(Optional.of(func));

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(CredenciaisInvalidasException.class);
    }

    // ── login — senha errada ─────────────────────────────────────────────────────

    @Test
    void login_wrongPassword_throwsCredenciaisInvalidasException() {
        UUID empresaId = UUID.randomUUID();
        Funcionario func = funcionarioAtivo(empresaId);

        LoginRequest req = new LoginRequest();
        req.setEmail("op@empresa.com");
        req.setPassword("senha-errada");

        when(funcionarioRepository.findByEmail("op@empresa.com")).thenReturn(Optional.of(func));
        when(passwordEncoder.matches("senha-errada", "$2a$hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(CredenciaisInvalidasException.class);
    }

    // ── login — empresa inativa ──────────────────────────────────────────────────

    @Test
    void login_inactiveCompany_throwsCredenciaisInvalidasException() {
        UUID empresaId = UUID.randomUUID();
        Funcionario func = funcionarioAtivo(empresaId);

        Empresa empresaInativa = empresaAtiva(empresaId);
        empresaInativa.setAtivo(false);

        LoginRequest req = new LoginRequest();
        req.setEmail("op@empresa.com");
        req.setPassword("senha123");

        when(funcionarioRepository.findByEmail("op@empresa.com")).thenReturn(Optional.of(func));
        when(passwordEncoder.matches("senha123", "$2a$hashed")).thenReturn(true);
        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresaInativa));

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(CredenciaisInvalidasException.class);
    }

    // ── setupSuperAdmin ──────────────────────────────────────────────────────────

    @Test
    void setupSuperAdmin_noExistingAdmin_createsSuperAdminWithCorrectRole() {
        SetupRequest req = new SetupRequest();
        req.setNome("Admin Inicial");
        req.setEmail("admin@riggingcheck.com");
        req.setSenha("SenhaSegura1@");

        UUID empresaId = UUID.randomUUID();
        Empresa empresaSistema = new Empresa();
        empresaSistema.setId(empresaId);
        empresaSistema.setRazaoSocial("RiggingCheck Sistema");
        empresaSistema.setCnpj("00.000.000/0000-00");
        empresaSistema.setAtivo(true);

        when(funcionarioRepository.findByRole(RoleEnum.SUPER_ADMIN)).thenReturn(List.of());
        when(empresaRepository.findByCnpj("00.000.000/0000-00")).thenReturn(Optional.of(empresaSistema));
        when(passwordEncoder.encode("SenhaSegura1@")).thenReturn("hashed-senha");
        when(funcionarioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> authService.setupSuperAdmin(req));

        verify(funcionarioRepository).save(argThat(f ->
            f.getRole() == RoleEnum.SUPER_ADMIN
            && "admin@riggingcheck.com".equals(f.getEmail())
            && "Admin Inicial".equals(f.getNome())
            && "hashed-senha".equals(f.getPasswordHash())
            && Boolean.TRUE.equals(f.getAtivo())
        ));
    }

    @Test
    void setupSuperAdmin_superAdminAlreadyExists_throwsRegraDeNegocioException() {
        SetupRequest req = new SetupRequest();
        req.setNome("Duplicado");
        req.setEmail("dup@riggingcheck.com");
        req.setSenha("SenhaSegura1@");

        Funcionario existente = new Funcionario();
        existente.setRole(RoleEnum.SUPER_ADMIN);

        when(funcionarioRepository.findByRole(RoleEnum.SUPER_ADMIN)).thenReturn(List.of(existente));

        assertThatThrownBy(() -> authService.setupSuperAdmin(req))
            .isInstanceOf(RegraDeNegocioException.class)
            .hasMessageContaining("SUPER_ADMIN");
    }

    @Test
    void setupSuperAdmin_createsSystemEmpresaWhenNotExists() {
        SetupRequest req = new SetupRequest();
        req.setNome("Admin");
        req.setEmail("admin@riggingcheck.com");
        req.setSenha("SenhaSegura1@");

        when(funcionarioRepository.findByRole(RoleEnum.SUPER_ADMIN)).thenReturn(List.of());
        when(empresaRepository.findByCnpj("00.000.000/0000-00")).thenReturn(Optional.empty());
        when(empresaRepository.save(any())).thenAnswer(inv -> {
            Empresa e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(funcionarioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> authService.setupSuperAdmin(req));

        // Verifica que tentou criar a empresa sistema
        verify(empresaRepository).save(argThat(e ->
            "00.000.000/0000-00".equals(e.getCnpj())
            && "RiggingCheck Sistema".equals(e.getRazaoSocial())
        ));
    }
}
