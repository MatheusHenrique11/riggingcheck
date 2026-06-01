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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para o módulo de inventário de acessórios.
 * Cobre: CRUD, certificados, inspeções, QR, multiempresa e controle de acesso.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class AcessorioControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaAcc99";

    private String tokenAdmin;
    private String tokenRigger;
    private String tokenAdmin2;

    private static final String PAYLOAD_ACESSORIO = """
        {
          "codigoInterno": "CINTA-001",
          "tipo": "CINTA_TEXTIL",
          "descricao": "Cinta têxtil vermelha 2t",
          "fabricante": "FabTestEx",
          "modelo": "CT-2000",
          "numeroSerie": "SN-12345",
          "capacidadeWllKg": 2000.0,
          "unidade": "kg",
          "localizacao": "Almoxarifado A"
        }
        """;

    private static final String PAYLOAD_CERTIFICADO = """
        {
          "numeroCertificado": "CERT-2026-001",
          "emissor": "Laboratório Teste",
          "dataEmissao": "2026-01-15",
          "dataValidade": "2027-01-15",
          "arquivoUrl": "https://docs.empresa.com/cert001.pdf",
          "observacoes": "Certificado anual"
        }
        """;

    private static final String PAYLOAD_INSPECAO = """
        {
          "dataInspecao": "2025-06-01",
          "resultado": "APROVADO",
          "observacoes": "Sem irregularidades",
          "proximaInspecao": "2026-06-01"
        }
        """;

    @BeforeEach
    void setUp() throws Exception {
        Empresa empresa1 = new Empresa();
        empresa1.setRazaoSocial("Empresa Acessorios Test 1");
        empresa1.setCnpj("11.111.111/0001-81");
        empresa1.setAtivo(true);
        empresa1 = empresaRepository.save(empresa1);

        Empresa empresa2 = new Empresa();
        empresa2.setRazaoSocial("Empresa Acessorios Test 2");
        empresa2.setCnpj("22.222.222/0002-82");
        empresa2.setAtivo(true);
        empresa2 = empresaRepository.save(empresa2);

        tokenAdmin  = criarELogar(empresa1, "admin.acc.t1@test.com",  RoleEnum.ADMIN_EMPRESA);
        tokenRigger = criarELogar(empresa1, "rigger.acc.t1@test.com", RoleEnum.RIGGER);
        tokenAdmin2 = criarELogar(empresa2, "admin.acc.t2@test.com",  RoleEnum.ADMIN_EMPRESA);
    }

    private String criarELogar(Empresa empresa, String email, RoleEnum role) throws Exception {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Acc Test");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(empresa.getId());
        funcionarioRepository.save(f);

        MvcResult r = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(("{\"email\":\"%s\",\"password\":\"%s\"}").formatted(email, SENHA)))
            .andExpect(status().isOk())
            .andReturn();
        return r.getResponse().getContentAsString().replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────────

    @Test
    void adminPodeCriarAcessorio() throws Exception {
        mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_ACESSORIO))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.codigoInterno").value("CINTA-001"))
            .andExpect(jsonPath("$.tipo").value("CINTA_TEXTIL"))
            .andExpect(jsonPath("$.status").value("ATIVO"))
            .andExpect(jsonPath("$.capacidadeWllKg").value(2000.0));
    }

    @Test
    void riggerNaoPodeCriarAcessorio() throws Exception {
        mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_ACESSORIO))
            .andExpect(status().isForbidden());
    }

    @Test
    void semTokenRetornaErroDeAutenticacao() throws Exception {
        mockMvc.perform(get("/api/acessorios"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void adminPodeListar() throws Exception {
        criarAcessorio(tokenAdmin);
        mockMvc.perform(get("/api/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void riggerPodeListar() throws Exception {
        criarAcessorio(tokenAdmin);
        mockMvc.perform(get("/api/acessorios")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk());
    }

    @Test
    void adminPodeBuscarPorId() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(get("/api/acessorios/" + id)
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void admin2NaoPodeVerAcessorioDaEmpresa1() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(get("/api/acessorios/" + id)
                .header("Authorization", "Bearer " + tokenAdmin2))
            .andExpect(status().isForbidden());
    }

    @Test
    void adminPodeAtualizarAcessorio() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        String payload = """
            {
              "codigoInterno": "CINTA-001-UP",
              "tipo": "CINTA_TEXTIL",
              "descricao": "Cinta atualizada",
              "capacidadeWllKg": 3000.0,
              "localizacao": "Almoxarifado B"
            }
            """;
        mockMvc.perform(put("/api/acessorios/" + id)
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.codigoInterno").value("CINTA-001-UP"))
            .andExpect(jsonPath("$.capacidadeWllKg").value(3000.0));
    }

    @Test
    void adminPodeAlterarStatus() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(patch("/api/acessorios/" + id + "/status")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"EM_INSPECAO\", \"motivo\": \"Preventiva\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("EM_INSPECAO"));
    }

    @Test
    void statusInvalidoRetorna400() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(patch("/api/acessorios/" + id + "/status")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"INVALIDO\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void codigoInternoUnicoPorEmpresa() throws Exception {
        criarAcessorio(tokenAdmin);
        mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_ACESSORIO))
            .andExpect(status().isBadRequest());
    }

    @Test
    void camposObrigatoriosFaltandoRetorna400() throws Exception {
        mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"descricao\": \"Sem código\"}"))
            .andExpect(status().isBadRequest());
    }

    // ── Certificados ─────────────────────────────────────────────────────────────

    @Test
    void adminPodeAdicionarCertificado() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(post("/api/acessorios/" + id + "/certificados")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_CERTIFICADO))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.numeroCertificado").value("CERT-2026-001"))
            .andExpect(jsonPath("$.status").value("VALIDO"));
    }

    @Test
    void adminPodeListarCertificados() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(post("/api/acessorios/" + id + "/certificados")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_CERTIFICADO))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/acessorios/" + id + "/certificados")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)));
    }

    // ── Inspeções ─────────────────────────────────────────────────────────────────

    @Test
    void adminPodeRegistrarInspecao() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(post("/api/acessorios/" + id + "/inspecoes")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_INSPECAO))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.resultado").value("APROVADO"));
    }

    @Test
    void inspecaoReprovadaAlteraStatusParaReprovado() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        String payload = """
            {"dataInspecao":"2025-06-01","resultado":"REPROVADO","observacoes":"Desgaste"}
            """;
        mockMvc.perform(post("/api/acessorios/" + id + "/inspecoes")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/acessorios/" + id)
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REPROVADO"));
    }

    @Test
    void adminPodeListarInspecoes() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(post("/api/acessorios/" + id + "/inspecoes")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_INSPECAO))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/acessorios/" + id + "/inspecoes")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)));
    }

    // ── QR Code ───────────────────────────────────────────────────────────────────

    @Test
    void adminPodeObterQr() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(get("/api/acessorios/" + id + "/qr")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.acessorioId").value(id))
            .andExpect(jsonPath("$.url").value(containsString(id)))
            .andExpect(jsonPath("$.codigoInterno").value("CINTA-001"))
            .andExpect(jsonPath("$.status").value("ATIVO"));
    }

    // ── Dashboard de Integridade (Fase 12B) ───────────────────────────────────────

    @Test
    void dashboardIntegridadeRetornaMetricas() throws Exception {
        criarAcessorio(tokenAdmin); // cria 1 acessório ATIVO, sem cert, sem inspeção
        mockMvc.perform(get("/api/acessorios/dashboard-integridade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalAcessorios").value(1))
            .andExpect(jsonPath("$.ativos").value(1))
            .andExpect(jsonPath("$.bloqueados").value(0))
            .andExpect(jsonPath("$.semCertificado").value(1))
            .andExpect(jsonPath("$.semInspecao").value(1));
    }

    @Test
    void dashboardCertificadoVencidoContabilizado() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(post("/api/acessorios/" + id + "/certificados")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "numeroCertificado": "CERT-VENCIDO",
                      "emissor": "Lab",
                      "dataEmissao": "2024-01-01",
                      "dataValidade": "2025-01-01"
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/acessorios/dashboard-integridade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.certificadosVencidos").value(1))
            .andExpect(jsonPath("$.semCertificado").value(0));
    }

    @Test
    void dashboardCertificadoAVencerContabilizado() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        // Validade em 15 dias = dentro do limite de 30 dias
        String validade = java.time.LocalDate.now().plusDays(15).toString();
        mockMvc.perform(post("/api/acessorios/" + id + "/certificados")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "numeroCertificado": "CERT-A-VENCER",
                      "emissor": "Lab",
                      "dataEmissao": "2026-01-01",
                      "dataValidade": "%s"
                    }
                    """.formatted(validade)))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/acessorios/dashboard-integridade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.certificadosAVencer").value(1));
    }

    @Test
    void dashboardAcessorioReprovadoApareceEmBloqueados() throws Exception {
        String id = extrairId(criarAcessorio(tokenAdmin));
        mockMvc.perform(patch("/api/acessorios/" + id + "/status")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"REPROVADO\", \"motivo\": \"Desgaste\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/acessorios/dashboard-integridade")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.bloqueados").value(1))
            .andExpect(jsonPath("$.ativos").value(0))
            .andExpect(jsonPath("$.itensCriticos", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void dashboardAdmin2SoVePropriaEmpresa() throws Exception {
        criarAcessorio(tokenAdmin); // empresa1
        mockMvc.perform(get("/api/acessorios/dashboard-integridade")
                .header("Authorization", "Bearer " + tokenAdmin2))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalAcessorios").value(0));
    }

    @Test
    void dashboardSemTokenRetornaErro() throws Exception {
        mockMvc.perform(get("/api/acessorios/dashboard-integridade"))
            .andExpect(status().is4xxClientError());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private MvcResult criarAcessorio(String token) throws Exception {
        return mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(PAYLOAD_ACESSORIO))
            .andExpect(status().isCreated())
            .andReturn();
    }

    private String extrairId(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        return body.split("\"id\":\"")[1].split("\"")[0];
    }
}
