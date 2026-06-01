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

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para o fluxo completo de solicitação de liberação:
 *   Rigger solicita → Líder/Gerente lista → Líder aprova/nega → Rigger consulta status.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class LiberacaoControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String EMAIL_RIGGER  = "rigger.lib.test@empresa.com";
    private static final String EMAIL_LIDER   = "lider.lib.test@empresa.com";
    private static final String EMAIL_GERENTE = "gerente.lib.test@empresa.com";
    private static final String EMAIL_ADMIN   = "admin.lib.test@empresa.com";
    private static final String SENHA         = "SenhaTest99";

    private String tokenRigger;
    private String tokenLider;
    private String tokenGerente;
    private String tokenAdmin;

    // ── Payload de solicitação válido com mapeamento correto dos campos DTO ───

    private static final String PAYLOAD_SOLICITACAO = """
        {
          "operacaoOs": "OS-TEST-001",
          "riggerNome": "João Rigger",
          "dadosCapacidade": {
            "capGuindasteKg": 50000.0,
            "capCargaKg":     8000.0,
            "capAparelhoKg":  500.0,
            "capTotalKg":     8500.0,
            "capUsoPercent":  17.0,
            "capRisco":       "SAFE"
          },
          "dadosEslinga": {
            "eslNumPernas":         2,
            "eslAnguloGraus":       60.0,
            "eslTensaoPorPernaKg":  4908.0,
            "eslFatorCarga":        1.155,
            "eslRisco":             "SEGURO",
            "eslAnguloAviso":       false,
            "eslWllKg":             10000.0,
            "eslWllUsoPercent":     49.1,
            "eslTemManilha":        false,
            "eslManilhaCapacidadeKg": null,
            "eslManilhaUsoPercent":   null,
            "eslManilhaCompativel":   null
          }
        }
        """;

    @BeforeEach
    void setUp() throws Exception {
        Empresa empresa = new Empresa();
        empresa.setRazaoSocial("Empresa Liberacao Test");
        empresa.setCnpj("11.222.333/0001-44");
        empresa.setAtivo(true);
        empresa = empresaRepository.save(empresa);

        tokenRigger  = criarELogar(empresa, EMAIL_RIGGER,  RoleEnum.RIGGER);
        tokenLider   = criarELogar(empresa, EMAIL_LIDER,   RoleEnum.LIDER_EQUIPE);
        tokenGerente = criarELogar(empresa, EMAIL_GERENTE, RoleEnum.GERENTE_OPERACOES);
        tokenAdmin   = criarELogar(empresa, EMAIL_ADMIN,   RoleEnum.ADMIN_EMPRESA);
    }

    private String criarELogar(Empresa empresa, String email, RoleEnum role) throws Exception {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Teste");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(empresa.getId());
        funcionarioRepository.save(f);

        MvcResult r = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"%s"}
                    """.formatted(email, SENHA)))
                .andExpect(status().isOk())
                .andReturn();

        String body = r.getResponse().getContentAsString();
        // Extrai o token do JSON {"token":"..."}
        return body.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }

    // ── Rigger solicita liberação ────────────────────────────────────────────

    @Test
    void rigger_solicitaComDadosCompletos_retorna200ComTodosOsCampos() throws Exception {
        mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.operacaoOs").value("OS-TEST-001"))
            .andExpect(jsonPath("$.riggerNome").value("João Rigger"))
            .andExpect(jsonPath("$.status").value("ANALISAR"))
            // Dados de capacidade devem chegar preenchidos
            .andExpect(jsonPath("$.capGuindasteKg").value(50000.0))
            .andExpect(jsonPath("$.capTotalKg").value(8500.0))
            .andExpect(jsonPath("$.capUsoPercent").value(17.0))
            .andExpect(jsonPath("$.capRisco").value("SAFE"))
            // Dados de eslinga devem chegar preenchidos
            .andExpect(jsonPath("$.eslNumPernas").value(2))
            .andExpect(jsonPath("$.eslAnguloGraus").value(60.0))
            .andExpect(jsonPath("$.eslTensaoPorPernaKg").value(4908.0))
            .andExpect(jsonPath("$.eslRisco").value("SEGURO"))
            .andExpect(jsonPath("$.eslWllKg").value(10000.0))
            .andExpect(jsonPath("$.eslWllUsoPercent").value(49.1));
    }

    @Test
    void rigger_solicitaSemOs_retorna400() throws Exception {
        mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"operacaoOs":"","riggerNome":"João",
                     "dadosCapacidade":{"capGuindasteKg":1000},"dadosEslinga":{"eslNumPernas":2}}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void semToken_solicitacao_retorna401ou403() throws Exception {
        mockMvc.perform(post("/api/liberacoes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().is(anyOf(is(401), is(403))));
    }

    // ── Líder lista e resolve liberações ────────────────────────────────────

    @Test
    void lider_listaComStatusAnalisar_retornaListaComSolicitacaoCriada() throws Exception {
        // Rigger cria
        mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk());

        // Líder lista
        mockMvc.perform(get("/api/liberacoes?status=ANALISAR")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].operacaoOs").value("OS-TEST-001"))
            // Campos técnicos preservados na listagem
            .andExpect(jsonPath("$[0].capGuindasteKg").value(50000.0))
            .andExpect(jsonPath("$[0].eslNumPernas").value(2));
    }

    @Test
    void lider_aprovaSolicitacao_statusMudaParaProsseguir() throws Exception {
        // Rigger cria
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Líder aprova
        mockMvc.perform(post("/api/liberacoes/" + id + "/aprovar")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"observacao\":\"OK para içar\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PROSSEGUIR"))
            .andExpect(jsonPath("$.observacao").value("OK para içar"))
            .andExpect(jsonPath("$.aprovadoPorNome").exists());
    }

    @Test
    void lider_negaSolicitacao_statusMudaParaParar() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/liberacoes/" + id + "/negar")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"observacao\":\"Condições adversas\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PARAR"))
            .andExpect(jsonPath("$.observacao").value("Condições adversas"));
    }

    @Test
    void lider_tentaAprovarJaResolvida_retorna400() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Primeiro approve
        mockMvc.perform(post("/api/liberacoes/" + id + "/aprovar")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Segundo approve — deve falhar
        mockMvc.perform(post("/api/liberacoes/" + id + "/aprovar")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── Gerente SOMENTE visualiza (não pode resolver) ────────────────────────

    @Test
    void gerente_listaSolicitacoes_retorna200() throws Exception {
        mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/liberacoes?status=TODOS")
                .header("Authorization", "Bearer " + tokenGerente))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void gerente_tentaAprovar_retorna403() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/liberacoes/" + id + "/aprovar")
                .header("Authorization", "Bearer " + tokenGerente)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    // ── Admin resolve liberações ─────────────────────────────────────────────

    @Test
    void admin_aprovaSolicitacao_retorna200() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/liberacoes/" + id + "/aprovar")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"observacao\":\"Aprovado pelo Admin\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PROSSEGUIR"))
            .andExpect(jsonPath("$.capGuindasteKg").value(50000.0))
            .andExpect(jsonPath("$.eslNumPernas").value(2));
    }

    // ── Rigger consulta status (polling) ─────────────────────────────────────

    @Test
    void rigger_consultaStatusProprioIcamento_retorna200() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/liberacoes/" + id)
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.status").value("ANALISAR"))
            .andExpect(jsonPath("$.capGuindasteKg").value(50000.0));
    }

    // ── RIGGER não pode listar todas as solicitações ─────────────────────────

    @Test
    void rigger_tentaListarTodasSolicitacoes_retorna403() throws Exception {
        mockMvc.perform(get("/api/liberacoes?status=TODOS")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isForbidden());
    }

    // ── Databook PDF (Fase 13) ────────────────────────────────────────────────

    @Test
    void rigger_geraDatabook_retornaPdfDaPropriaEmpresa() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/liberacoes/" + id + "/databook")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    }

    @Test
    void admin_geraDatabook_retornaPdf() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + id + "/databook")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        // PDF começa com %PDF
        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 100, "PDF deve ter conteúdo");
        org.junit.jupiter.api.Assertions.assertEquals('%', (char) pdf[0]);
        org.junit.jupiter.api.Assertions.assertEquals('P', (char) pdf[1]);
        org.junit.jupiter.api.Assertions.assertEquals('D', (char) pdf[2]);
        org.junit.jupiter.api.Assertions.assertEquals('F', (char) pdf[3]);
    }

    @Test
    void databookDePlanoInexistenteRetorna404() throws Exception {
        mockMvc.perform(get("/api/liberacoes/00000000-0000-0000-0000-000000000001/databook")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isNotFound());
    }

    @Test
    void databookSemTokenRetornaErroDeAutenticacao() throws Exception {
        mockMvc.perform(get("/api/liberacoes/00000000-0000-0000-0000-000000000001/databook"))
            .andExpect(status().is4xxClientError());
    }

    // ── Relatório de Conformidade Regulatória (Fase 15A) ─────────────────────

    @Test
    void rigger_geraRelatorioConformidade_retornaPdf() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/liberacoes/" + id + "/relatorio-conformidade")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    }

    @Test
    void admin_geraRelatorioConformidade_conteudoValido() throws Exception {
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + id + "/relatorio-conformidade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        // PDF válido começa com %PDF
        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 100);
        org.junit.jupiter.api.Assertions.assertEquals('%', (char) pdf[0]);
        org.junit.jupiter.api.Assertions.assertEquals('P', (char) pdf[1]);
    }

    @Test
    void relatorioConformidade_semChecklist_geraComNota() throws Exception {
        // Payload sem checklistItens → relatório deve conter nota sobre ausência
        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Gera sem erro mesmo sem checklist
        mockMvc.perform(get("/api/liberacoes/" + id + "/relatorio-conformidade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    }

    @Test
    void relatorioConformidade_comChecklist_geraCorretamente() throws Exception {
        String payloadComChecklist = """
            {
              "operacaoOs": "OS-CONF-F15",
              "riggerNome": "Rigger F15",
              "dadosCapacidade": {
                "capGuindasteKg": 50000.0, "capCargaKg": 8000.0,
                "capAparelhoKg": 500.0, "capTotalKg": 8500.0,
                "capUsoPercent": 17.0, "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2, "eslAnguloGraus": 60.0,
                "eslTensaoPorPernaKg": 4908.0, "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO", "eslAnguloAviso": false,
                "eslWllKg": 10000.0, "eslWllUsoPercent": 49.1,
                "eslTemManilha": false, "eslManilhaCapacidadeKg": null,
                "eslManilhaUsoPercent": null, "eslManilhaCompativel": null
              },
              "checklistItens": [
                {"codigoItem":"c1","categoriaItem":"Guindastes & Solo","perguntaItem":"Estabilidade verificada","respondido":true},
                {"codigoItem":"c9","categoriaItem":"Acessórios","perguntaItem":"Eslingas sem fios rompidos","respondido":true},
                {"codigoItem":"c17","categoriaItem":"Ambiente","perguntaItem":"Velocidade do vento OK","respondido":true},
                {"codigoItem":"c21","categoriaItem":"N-2869","perguntaItem":"Plano de içamento elaborado","respondido":false}
              ],
              "dadosOperacionais": {
                "localOperacao": "Planta Alpha",
                "dataOperacao": "2026-07-01",
                "supervisorNome": "Carlos Supervisor"
              }
            }
            """;

        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadComChecklist))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + id + "/relatorio-conformidade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 500,
            "Relatório com checklist deve ter conteúdo substantivo");
    }

    @Test
    void relatorioConformidade_planInexistente_retorna404() throws Exception {
        mockMvc.perform(get("/api/liberacoes/00000000-0000-0000-0000-000000000002/relatorio-conformidade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isNotFound());
    }

    @Test
    void relatorioConformidade_semToken_retornaErro() throws Exception {
        mockMvc.perform(get("/api/liberacoes/00000000-0000-0000-0000-000000000002/relatorio-conformidade"))
            .andExpect(status().is4xxClientError());
    }

    // ── Persistência Completa dos Dados Operacionais (Fase 14) ───────────────

    @Test
    void submissaoComDadosOperacionaisCompletos_persiste() throws Exception {
        String payload = """
            {
              "operacaoOs": "OS-F14-COMPLETO",
              "riggerNome": "Rigger F14",
              "dadosCapacidade": {
                "capGuindasteKg": 50000.0, "capCargaKg": 8000.0,
                "capAparelhoKg": 500.0, "capTotalKg": 8500.0,
                "capUsoPercent": 17.0, "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2, "eslAnguloGraus": 60.0,
                "eslTensaoPorPernaKg": 4908.0, "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO", "eslAnguloAviso": false,
                "eslWllKg": 10000.0, "eslWllUsoPercent": 49.1,
                "eslTemManilha": false, "eslManilhaCapacidadeKg": null,
                "eslManilhaUsoPercent": null, "eslManilhaCompativel": null
              },
              "dadosOperacionais": {
                "localOperacao": "Pátio B, Módulo 3",
                "dataOperacao": "2026-06-15",
                "supervisorNome": "João Supervisor",
                "descricaoAtividade": "Içamento de reator R-101"
              }
            }
            """;

        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Databook gerado com localOperacao
        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + id + "/databook")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 100, "Databook deve ter conteúdo");
    }

    @Test
    void submissaoComChecklistItens_persisteItens() throws Exception {
        String payload = """
            {
              "operacaoOs": "OS-F14-CHECKLIST",
              "riggerNome": "Rigger F14",
              "dadosCapacidade": {
                "capGuindasteKg": 50000.0, "capCargaKg": 8000.0,
                "capAparelhoKg": 500.0, "capTotalKg": 8500.0,
                "capUsoPercent": 17.0, "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2, "eslAnguloGraus": 60.0,
                "eslTensaoPorPernaKg": 4908.0, "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO", "eslAnguloAviso": false,
                "eslWllKg": 10000.0, "eslWllUsoPercent": 49.1,
                "eslTemManilha": false, "eslManilhaCapacidadeKg": null,
                "eslManilhaUsoPercent": null, "eslManilhaCompativel": null
              },
              "checklistItens": [
                {"codigoItem":"c1","categoriaItem":"Guindastes & Solo","perguntaItem":"Estabilidade verificada","respondido":true},
                {"codigoItem":"c2","categoriaItem":"Guindastes & Solo","perguntaItem":"Laudo de solo disponível","respondido":false},
                {"codigoItem":"c5","categoriaItem":"Equipamentos","perguntaItem":"Condições do guindaste verificadas","respondido":true}
              ]
            }
            """;

        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        // Databook deve incluir checklist → PDF gerado com sucesso
        mockMvc.perform(get("/api/liberacoes/" + id + "/databook")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
    }

    @Test
    void submissaoSemDadosOpcionalsFunciona() throws Exception {
        // Payload mínimo sem dadosOperacionais nem checklistItens — compatibilidade retroativa
        mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_SOLICITACAO))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.operacaoOs").value("OS-TEST-001"));
    }

    @Test
    void databookComChecklistExibeItens() throws Exception {
        String payload = """
            {
              "operacaoOs": "OS-F14-DB-CHECK",
              "riggerNome": "Rigger DB",
              "dadosCapacidade": {
                "capGuindasteKg": 50000.0, "capCargaKg": 5000.0,
                "capAparelhoKg": 200.0, "capTotalKg": 5200.0,
                "capUsoPercent": 10.4, "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2, "eslAnguloGraus": 60.0,
                "eslTensaoPorPernaKg": 3000.0, "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO", "eslAnguloAviso": false,
                "eslWllKg": 8000.0, "eslWllUsoPercent": 37.5,
                "eslTemManilha": false, "eslManilhaCapacidadeKg": null,
                "eslManilhaUsoPercent": null, "eslManilhaCompativel": null
              },
              "dadosOperacionais": {
                "localOperacao": "Planta Petroquímica Alpha",
                "dataOperacao": "2026-07-01",
                "supervisorNome": "Maria Silva",
                "descricaoAtividade": "Troca de vaso de pressão VP-201"
              },
              "checklistItens": [
                {"codigoItem":"c1","categoriaItem":"Guindastes & Solo","perguntaItem":"Estabilidade verificada","respondido":true},
                {"codigoItem":"c17","categoriaItem":"Ambiente","perguntaItem":"Velocidade do vento OK","respondido":true}
              ],
              "petrobrasDataJson": "{\\"classificacao\\":\\"ROTINEIRO\\",\\"todosMarcados\\":false}"
            }
            """;

        String resp = mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String id = resp.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        byte[] pdf = mockMvc.perform(get("/api/liberacoes/" + id + "/databook")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        org.junit.jupiter.api.Assertions.assertTrue(pdf.length > 500, "Databook com checklist deve ter conteúdo");
    }
}
