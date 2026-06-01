package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.SolicitacaoLiberacao;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusLiberacao;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para OperationTeamController (Fase 16).
 * Cobre: listar, adicionar, remover, compliance de equipe, bloqueios de acesso,
 * e geração de Databook/Relatório de Conformidade com equipe vinculada.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class OperationTeamControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private SolicitacaoLiberacaoRepository liberacaoRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaTeam99";

    private String tokenRigger;
    private String tokenLider;
    private String tokenOutraEmpresa;

    private Funcionario riggerFuncionario;
    private Funcionario membroFuncionario;
    private SolicitacaoLiberacao plano;

    @BeforeEach
    void setUp() throws Exception {
        Empresa empresa = criarEmpresa("Empresa Team Test", "55.666.777/0001-88");
        Empresa outraEmpresa = criarEmpresa("Empresa Outra Test", "99.888.777/0001-11");

        riggerFuncionario  = criarFuncionario(empresa,       "rigger.team@empresa.com",  RoleEnum.RIGGER,       LocalDate.now().plusYears(1), LocalDate.now().plusYears(1), LocalDate.now().plusYears(1));
        membroFuncionario  = criarFuncionario(empresa,       "membro.team@empresa.com",  RoleEnum.OPERADOR,     null, null, null);
        criarFuncionario(empresa,       "lider.team@empresa.com",   RoleEnum.LIDER_EQUIPE, null, null, null);
        criarFuncionario(outraEmpresa,  "outro.team@outra.com",     RoleEnum.LIDER_EQUIPE, null, null, null);

        tokenRigger      = logar("rigger.team@empresa.com");
        tokenLider       = logar("lider.team@empresa.com");
        tokenOutraEmpresa = logar("outro.team@outra.com");

        plano = criarPlano(empresa, riggerFuncionario);
    }

    // ── Listar equipe (GET /api/planos/{id}/equipe) ──────────────────────────────

    @Test
    void listar_equipeVazia_retornaListaVazia() throws Exception {
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listar_semToken_retorna401ou403() throws Exception {
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/equipe"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void listar_planoDaOutraEmpresa_retorna403() throws Exception {
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenOutraEmpresa))
            .andExpect(status().isForbidden());
    }

    // ── Adicionar membro (POST /api/planos/{id}/equipe) ─────────────────────────

    @Test
    void adicionar_membroValido_retorna201ComDados() throws Exception {
        String body = """
            {
              "funcionarioId": "%s",
              "funcaoOperacional": "SINALEIRO",
              "responsavel": false,
              "observacao": "Sinaleiro designado"
            }
            """.formatted(membroFuncionario.getId());

        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.funcaoOperacional").value("SINALEIRO"))
            .andExpect(jsonPath("$.nome").exists())
            .andExpect(jsonPath("$.statusNr11").value("AUSENTE"))
            .andExpect(jsonPath("$.competencyStatus").value("BLOQUEADO"));
    }

    @Test
    void adicionar_membroDuplicado_retorna400() throws Exception {
        String body = """
            {"funcionarioId":"%s","funcaoOperacional":"RIGGER"}
            """.formatted(membroFuncionario.getId());

        // Primeiro add
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        // Segundo add — deve falhar
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void adicionar_semFuncaoOperacional_retorna400() throws Exception {
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"funcionarioId":"%s"}
                    """.formatted(membroFuncionario.getId())))
            .andExpect(status().isBadRequest());
    }

    @Test
    void adicionar_planoDaOutraEmpresa_retorna403() throws Exception {
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenOutraEmpresa)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"funcionarioId":"%s","funcaoOperacional":"RIGGER"}
                    """.formatted(membroFuncionario.getId())))
            .andExpect(status().isForbidden());
    }

    // ── Remover membro (DELETE /api/planos/{id}/equipe/{membroId}) ───────────────

    @Test
    void remover_membroExistente_retorna204() throws Exception {
        // Adiciona
        MvcResult res = mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"funcionarioId":"%s","funcaoOperacional":"AMARRADOR"}
                    """.formatted(membroFuncionario.getId())))
            .andExpect(status().isCreated())
            .andReturn();

        String membroId = res.getResponse().getContentAsString()
            .replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Remove
        mockMvc.perform(delete("/api/planos/" + plano.getId() + "/equipe/" + membroId)
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isNoContent());

        // Lista — vazia novamente
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // ── Compliance da equipe (GET /api/planos/{id}/equipe/compliance) ────────────

    @Test
    void compliance_equipeVazia_retornaListaVazia() throws Exception {
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/equipe/compliance")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void compliance_membroSemTreinamento_retornaViolacoesBloqueadas() throws Exception {
        // Membro sem treinamentos
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"funcionarioId":"%s","funcaoOperacional":"OPERADOR_GUINDASTE"}
                    """.formatted(membroFuncionario.getId())))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/equipe/compliance")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThan(0))))
            .andExpect(jsonPath("$[0].severity").value("BLOCKED"));
    }

    // ── Databook com equipe (regressão) ─────────────────────────────────────────

    @Test
    void databook_comEquipe_geraComSucesso() throws Exception {
        // Adiciona membro
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"funcionarioId":"%s","funcaoOperacional":"SUPERVISOR","responsavel":true}
                    """.formatted(riggerFuncionario.getId())))
            .andExpect(status().isCreated());

        // Gera databook
        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + plano.getId() + "/databook")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 100);
        org.junit.jupiter.api.Assertions.assertEquals('%', (char) pdf[0]);
        org.junit.jupiter.api.Assertions.assertEquals('P', (char) pdf[1]);
    }

    // ── Relatório de Conformidade com equipe (regressão) ────────────────────────

    @Test
    void relatorioConformidade_comEquipe_geraComSucesso() throws Exception {
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"funcionarioId":"%s","funcaoOperacional":"TECNICO_SEGURANCA"}
                    """.formatted(membroFuncionario.getId())))
            .andExpect(status().isCreated());

        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + plano.getId() + "/relatorio-conformidade")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 200);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Empresa criarEmpresa(String razaoSocial, String cnpj) {
        Empresa e = new Empresa();
        e.setRazaoSocial(razaoSocial);
        e.setCnpj(cnpj);
        e.setAtivo(true);
        return empresaRepository.save(e);
    }

    private Funcionario criarFuncionario(Empresa empresa, String email, RoleEnum role,
                                          LocalDate nr11, LocalDate nr35, LocalDate aso) {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Team");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(empresa.getId());
        f.setVencimentoNr11(nr11);
        f.setVencimentoNr35(nr35);
        f.setVencimentoAso(aso);
        return funcionarioRepository.save(f);
    }

    private String logar(String email) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"%s"}
                    """.formatted(email, SENHA)))
            .andExpect(status().isOk())
            .andReturn();
        return r.getResponse().getContentAsString()
            .replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }

    private SolicitacaoLiberacao criarPlano(Empresa empresa, Funcionario rigger) {
        SolicitacaoLiberacao sol = new SolicitacaoLiberacao();
        sol.setEmpresaId(empresa.getId());
        sol.setEmpresaNome(empresa.getRazaoSocial());
        sol.setOperacaoOs("OS-TEAM-TEST");
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
}
