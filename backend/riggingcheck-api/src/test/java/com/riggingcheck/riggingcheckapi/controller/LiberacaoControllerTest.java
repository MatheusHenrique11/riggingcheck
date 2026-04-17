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
}
