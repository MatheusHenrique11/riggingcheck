package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.WorkflowStatus;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import com.riggingcheck.riggingcheckapi.repository.SolicitacaoLiberacaoRepository;
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

import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para validação pública de planos — Fase 20.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class PublicPlanValidationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private SolicitacaoLiberacaoRepository liberacaoRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaQR99";
    private String tokenLider;
    private Empresa empresa;
    private Funcionario rigger;

    @BeforeEach
    void setUp() throws Exception {
        empresa = criarEmpresa("Empresa QR Test", "55.444.333/0001-22");
        rigger  = criarFuncionario("rigger.qr@empresa.com", RoleEnum.RIGGER);
        criarFuncionario("lider.qr@empresa.com", RoleEnum.LIDER_EQUIPE);
        tokenLider = logar("lider.qr@empresa.com");
    }

    // ── Plano aprovado gera token ────────────────────────────────────────────────

    @Test
    void aprovar_geraPublicValidationToken() throws Exception {
        // Cria plano
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadSolicitacao()))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Aprova
        mockMvc.perform(post("/api/liberacoes/" + id + "/aprovar")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Verifica que token foi gerado
        SolicitacaoLiberacao plano = liberacaoRepository.findById(UUID.fromString(id)).orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotNull(plano.getPublicValidationToken());
        org.junit.jupiter.api.Assertions.assertEquals(32, plano.getPublicValidationToken().length());
    }

    // ── Endpoint público retorna dados mínimos ───────────────────────────────────

    @Test
    void endpointPublico_planoAprovado_retornaDadosMinimos() throws Exception {
        SolicitacaoLiberacao plano = criarPlanoAprovado("OS-QR-001");

        mockMvc.perform(get("/api/public/planos/" + plano.getPublicValidationToken() + "/validacao"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.codigoPlano").value("OS-QR-001"))
            .andExpect(jsonPath("$.mensagemValidacao").value("PLANO APROVADO E VÁLIDO"))
            .andExpect(jsonPath("$.empresaNome").exists())
            .andExpect(jsonPath("$.versaoPlano").value("v1"))
            .andExpect(jsonPath("$.dataGeracaoConsulta").exists());
    }

    @Test
    void endpointPublico_naoExpoeEmailNomeCompleto() throws Exception {
        SolicitacaoLiberacao plano = criarPlanoAprovado("OS-PRIV-001");
        String body = mockMvc.perform(get("/api/public/planos/" + plano.getPublicValidationToken() + "/validacao"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        // Não deve conter e-mail nem nome completo do aprovador
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("@empresa.com"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("aprovadoPorId"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("solicitadoPorId"));
    }

    // ── Token inexistente → 404 ──────────────────────────────────────────────────

    @Test
    void tokenInexistente_retorna404() throws Exception {
        mockMvc.perform(get("/api/public/planos/tokeninexistente12345678901234567/validacao"))
            .andExpect(status().isNotFound());
    }

    // ── Endpoint público sem autenticação ────────────────────────────────────────

    @Test
    void endpointPublico_semAutenticacao_retorna200() throws Exception {
        SolicitacaoLiberacao plano = criarPlanoAprovado("OS-PUBLIC-001");

        // Sem header Authorization
        mockMvc.perform(get("/api/public/planos/" + plano.getPublicValidationToken() + "/validacao"))
            .andExpect(status().isOk());
    }

    // ── Plano sem aprovação não tem token ────────────────────────────────────────

    @Test
    void planoRascunho_naoTemToken() throws Exception {
        SolicitacaoLiberacao plano = criarPlanoRascunho("OS-DRAFT-001");
        org.junit.jupiter.api.Assertions.assertNull(plano.getPublicValidationToken());
    }

    // ── Databook inclui link público ─────────────────────────────────────────────

    @Test
    void databook_planoAprovado_geraSemErro() throws Exception {
        SolicitacaoLiberacao plano = criarPlanoAprovado("OS-DB-QR-001");

        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + plano.getId() + "/databook")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 100);
        org.junit.jupiter.api.Assertions.assertEquals('%', (char) pdf[0]);
        org.junit.jupiter.api.Assertions.assertEquals('P', (char) pdf[1]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Empresa criarEmpresa(String razaoSocial, String cnpj) {
        Empresa e = new Empresa();
        e.setRazaoSocial(razaoSocial);
        e.setCnpj(cnpj);
        e.setAtivo(true);
        return empresaRepository.save(e);
    }

    private Funcionario criarFuncionario(String email, RoleEnum role) {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " QR");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(empresa.getId());
        return funcionarioRepository.save(f);
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

    private SolicitacaoLiberacao criarPlanoAprovado(String os) {
        SolicitacaoLiberacao sol = criarPlanoRascunho(os);
        sol.setStatus(StatusLiberacao.PROSSEGUIR);
        sol.setWorkflowStatus(WorkflowStatus.APPROVED);
        sol.setAprovadoPorId(rigger.getId());
        sol.setAprovadoPorNome(rigger.getNome());
        sol.setResolvidoEm(LocalDateTime.now());
        sol.setPublicValidationToken(UUID.randomUUID().toString().replace("-", ""));
        sol.setIsLocked(true);
        return liberacaoRepository.save(sol);
    }

    private SolicitacaoLiberacao criarPlanoRascunho(String os) {
        SolicitacaoLiberacao sol = new SolicitacaoLiberacao();
        sol.setEmpresaId(empresa.getId());
        sol.setEmpresaNome(empresa.getRazaoSocial());
        sol.setOperacaoOs(os);
        sol.setRiggerNome(rigger.getNome());
        sol.setSolicitadoPorId(rigger.getId());
        sol.setStatus(StatusLiberacao.ANALISAR);
        sol.setCapGuindasteKg(50000.0);
        sol.setCapCargaKg(8000.0);
        sol.setCapAparelhoKg(500.0);
        sol.setCapTotalKg(8500.0);
        sol.setCapUsoPercent(17.0);
        sol.setCapRisco("SAFE");
        sol.setEslNumPernas(2);
        sol.setEslAnguloGraus(60.0);
        sol.setEslTensaoPorPernaKg(4908.0);
        sol.setEslFatorCarga(1.155);
        sol.setEslRisco("SEGURO");
        sol.setEslAnguloAviso(false);
        sol.setEslWllKg(10000.0);
        sol.setEslWllUsoPercent(49.1);
        sol.setEslTemManilha(false);
        sol.setCriadoEm(LocalDateTime.now());
        return liberacaoRepository.save(sol);
    }

    private String payloadSolicitacao() {
        return """
            {
              "operacaoOs": "OS-QR-APPROVAL",
              "riggerNome": "Rigger QR Test",
              "dadosCapacidade": {
                "capGuindasteKg": 50000, "capCargaKg": 8000,
                "capAparelhoKg": 500, "capTotalKg": 8500,
                "capUsoPercent": 17, "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2, "eslAnguloGraus": 60,
                "eslTensaoPorPernaKg": 4908, "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO", "eslAnguloAviso": false,
                "eslWllKg": 10000, "eslWllUsoPercent": 49.1,
                "eslTemManilha": false
              }
            }
            """;
    }
}
