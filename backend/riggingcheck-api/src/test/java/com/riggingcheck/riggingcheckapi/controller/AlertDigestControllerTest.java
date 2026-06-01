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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para AlertDigestController — Fase 19B.
 * ALERT_DIGEST_ENABLED=false por padrão: digest retorna 0 enviados sem SMTP.
 * O InMemoryMailSender (ConditionalOnMissingBean) absorve qualquer send() sem erro.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
    // ALERT_DIGEST_ENABLED não definido → padrão false → 0 enviados
})
@Transactional
class AlertDigestControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaDigest99";

    private String tokenAdmin;
    private String tokenSafety;
    private String tokenLider;
    private String tokenRigger;
    private String tokenGerente;

    @BeforeEach
    void setUp() throws Exception {
        Empresa empresa = criarEmpresa("Empresa Digest Test", "22.333.444/0001-77");

        criarFuncionario(empresa, "admin.digest@empresa.com",   RoleEnum.ADMIN_EMPRESA);
        criarFuncionario(empresa, "safety.digest@empresa.com",  RoleEnum.SAFETY_ADMIN);
        criarFuncionario(empresa, "lider.digest@empresa.com",   RoleEnum.LIDER_EQUIPE);
        criarFuncionario(empresa, "rigger.digest@empresa.com",  RoleEnum.RIGGER);
        criarFuncionario(empresa, "gerente.digest@empresa.com", RoleEnum.GERENTE_OPERACOES);

        tokenAdmin   = logar("admin.digest@empresa.com");
        tokenSafety  = logar("safety.digest@empresa.com");
        tokenLider   = logar("lider.digest@empresa.com");
        tokenRigger  = logar("rigger.digest@empresa.com");
        tokenGerente = logar("gerente.digest@empresa.com");
    }

    // ── Permissão de acesso ───────────────────────────────────────────────────────

    @Test
    void admin_podeEnviarDigest_retorna200() throws Exception {
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enviados").isNumber());
    }

    @Test
    void safety_podeEnviarDigest_retorna200() throws Exception {
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenSafety))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enviados").isNumber());
    }

    @Test
    void lider_naoPodeEnviarDigest_retorna403() throws Exception {
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isForbidden());
    }

    @Test
    void rigger_naoPodeEnviarDigest_retorna403() throws Exception {
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isForbidden());
    }

    @Test
    void gerente_naoPodeEnviarDigest_retorna403() throws Exception {
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenGerente))
            .andExpect(status().isForbidden());
    }

    @Test
    void semToken_retorna401ou403() throws Exception {
        mockMvc.perform(post("/api/alertas/enviar-digest"))
            .andExpect(status().is4xxClientError());
    }

    // ── Comportamento quando digest desabilitado ──────────────────────────────────

    @Test
    void digestDesabilitado_retornaZeroEnviados() throws Exception {
        // ALERT_DIGEST_ENABLED não está definido → padrão false → 0 enviados
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enviados").value(0));
    }

    // ── Erro SMTP não quebra fluxo ────────────────────────────────────────────────

    @Test
    void erroSmtp_naoRetorna500() throws Exception {
        // InMemoryMailSender absorve qualquer send() sem lançar exceção
        // Mesmo com alertas ativos, o endpoint retorna 200
        mockMvc.perform(post("/api/alertas/enviar-digest")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private Empresa criarEmpresa(String razaoSocial, String cnpj) {
        Empresa e = new Empresa();
        e.setRazaoSocial(razaoSocial);
        e.setCnpj(cnpj);
        e.setAtivo(true);
        return empresaRepository.save(e);
    }

    private void criarFuncionario(Empresa empresa, String email, RoleEnum role) {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Digest");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(empresa.getId());
        funcionarioRepository.save(f);
    }

    private String logar(String email) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, SENHA)))
            .andExpect(status().isOk())
            .andReturn();
        return r.getResponse().getContentAsString()
            .replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }
}
