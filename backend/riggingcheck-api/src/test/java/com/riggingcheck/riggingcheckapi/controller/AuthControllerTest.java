package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para /api/auth/*.
 *
 * @Transactional garante que os dados inseridos em @BeforeEach são visíveis
 * no mesmo contexto e revertidos automaticamente após cada teste.
 *
 * Nota: POST /api/auth/login e /api/auth/register são endpoints públicos —
 * não precisam de autenticação.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EmpresaRepository empresaRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    private static final String EMAIL_TESTE    = "rigger.auth.test@empresa.com";
    private static final String SENHA_CORRETA  = "senhaValida99";

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setRazaoSocial("Empresa Auth Test");
        empresa.setCnpj("55.444.333/0001-88");
        empresa.setAtivo(true);
        empresa = empresaRepository.save(empresa);

        Funcionario user = new Funcionario();
        user.setEmpresaId(empresa.getId());
        user.setNome("Rigger Teste");
        user.setEmail(EMAIL_TESTE);
        user.setPasswordHash(new BCryptPasswordEncoder().encode(SENHA_CORRETA));
        user.setRole(RoleEnum.RIGGER);
        user.setAtivo(true);
        funcionarioRepository.save(user);
    }

    // ── POST /api/auth/login ─────────────────────────────────────────────────────

    @Test
    void login_credenciaisValidas_returns200ComToken() throws Exception {
        String body = """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(EMAIL_TESTE, SENHA_CORRETA);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.userName").value("Rigger Teste"))
                .andExpect(jsonPath("$.role").value("RIGGER"));
    }

    @Test
    void login_senhaErrada_returns401() throws Exception {
        String body = """
                {
                  "email": "%s",
                  "password": "senhaErrada"
                }
                """.formatted(EMAIL_TESTE);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void login_usuarioInexistente_returns401() throws Exception {
        String body = """
                {
                  "email": "naoexiste@empresa.com",
                  "password": "qualquerSenha1"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_semCampoPassword_returns400() throws Exception {
        String body = """
                {
                  "email": "teste@empresa.com"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_emailInvalido_returns400() throws Exception {
        String body = """
                {
                  "email": "isso-nao-e-email",
                  "password": "senha123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_bodyVazio_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_usuarioInativo_returns401() throws Exception {
        // Marca o usuário como inativo
        funcionarioRepository.findByEmail(EMAIL_TESTE).ifPresent(u -> {
            u.setAtivo(false);
            funcionarioRepository.save(u);
        });

        String body = """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(EMAIL_TESTE, SENHA_CORRETA);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ── POST /api/auth/register — requer SUPER_ADMIN ────────────────────────────

    @Test
    void register_novaEmpresa_returns200() throws Exception {
        String body = """
                {
                  "razaoSocial": "Nova Empresa LTDA",
                  "cnpj": "99.888.777/0001-11",
                  "adminName": "Admin Novo",
                  "adminEmail": "admin.novo.unico@empresa.com",
                  "adminPassword": "senhaSegura123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .with(user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    void register_semAutenticacao_returns403() throws Exception {
        // /api/auth/register exige SUPER_ADMIN — anônimo deve receber 403
        String body = """
                {
                  "razaoSocial": "Qualquer Empresa",
                  "cnpj": "11.111.111/0001-11",
                  "adminName": "Admin",
                  "adminEmail": "admin@qualquer.com",
                  "adminPassword": "senhaSegura123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void register_cnpjDuplicado_returns400() throws Exception {
        // CNPJ "55.444.333/0001-88" já foi inserido no @BeforeEach
        String body = """
                {
                  "razaoSocial": "Empresa Duplicada",
                  "cnpj": "55.444.333/0001-88",
                  "adminName": "Admin",
                  "adminEmail": "novo.unico@email.com",
                  "adminPassword": "senhaSegura123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .with(user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("CNPJ já cadastrado"));
    }

    @Test
    void register_emailAdminDuplicado_returns400() throws Exception {
        // EMAIL_TESTE já foi inserido no @BeforeEach
        String body = """
                {
                  "razaoSocial": "Outra Empresa",
                  "cnpj": "77.666.555/0001-44",
                  "adminName": "Admin",
                  "adminEmail": "%s",
                  "adminPassword": "senhaSegura123"
                }
                """.formatted(EMAIL_TESTE);

        mockMvc.perform(post("/api/auth/register")
                        .with(user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Email já cadastrado"));
    }

    @Test
    void register_bodyVazio_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .with(user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_senhaAdminCurta_returns400() throws Exception {
        // adminPassword com menos de 8 caracteres deve ser rejeitado por @Size
        String body = """
                {
                  "razaoSocial": "Empresa Valida",
                  "cnpj": "11.222.333/0001-55",
                  "adminName": "Admin",
                  "adminEmail": "admin.curto@empresa.com",
                  "adminPassword": "curta"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .with(user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ── POST /api/auth/setup ─────────────────────────────────────────────────────

    @Test
    void setup_quandoSuperAdminJaExiste_returns400() throws Exception {
        // O contexto Spring já criou um SUPER_ADMIN no @PostConstruct da aplicação
        String body = """
                {
                  "nome": "Tentativa",
                  "email": "tentativa@sistema.com",
                  "senha": "senhaSetup123"
                }
                """;

        mockMvc.perform(post("/api/auth/setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Setup já realizado. SUPER_ADMIN já existe."));
    }
}
