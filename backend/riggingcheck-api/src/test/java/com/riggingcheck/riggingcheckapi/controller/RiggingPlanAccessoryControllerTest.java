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
 * Testes de integração para o vínculo Plano–Acessório (Fase 12A).
 * Cobre: criação com acessórios, listagem, vínculo individual, remoção e multiempresa.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class RiggingPlanAccessoryControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaPlan12A";

    private String tokenRigger;
    private String tokenAdmin;
    private String tokenAdmin2;
    private String acessorioId;

    @BeforeEach
    void setUp() throws Exception {
        Empresa empresa1 = new Empresa();
        empresa1.setRazaoSocial("Empresa Plan Acc Test 1");
        empresa1.setCnpj("55.555.555/0001-55");
        empresa1.setAtivo(true);
        empresa1 = empresaRepository.save(empresa1);

        Empresa empresa2 = new Empresa();
        empresa2.setRazaoSocial("Empresa Plan Acc Test 2");
        empresa2.setCnpj("66.666.666/0002-66");
        empresa2.setAtivo(true);
        empresa2 = empresaRepository.save(empresa2);

        tokenRigger = criarELogar(empresa1, "rigger.12a@test.com", RoleEnum.RIGGER);
        tokenAdmin  = criarELogar(empresa1, "admin.12a@test.com",  RoleEnum.ADMIN_EMPRESA);
        tokenAdmin2 = criarELogar(empresa2, "admin2.12a@test.com", RoleEnum.ADMIN_EMPRESA);

        // Cria acessório na empresa1
        acessorioId = extrairId(mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "codigoInterno": "PLAN-ACC-001",
                      "tipo": "CINTA_TEXTIL",
                      "descricao": "Cinta teste plano 12A",
                      "capacidadeWllKg": 5000.0
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn());
    }

    // ── Submissão com acessórios ──────────────────────────────────────────────────

    @Test
    void submeterPlanoComAcessoriosSalvaVinculos() throws Exception {
        String planId = criarPlanoComAcessorio(tokenRigger, acessorioId);

        mockMvc.perform(get("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].codigoInternoSnapshot").value("PLAN-ACC-001"))
            .andExpect(jsonPath("$[0].wllKgSnapshot").value(5000.0))
            .andExpect(jsonPath("$[0].statusSnapshot").value("ATIVO"));
    }

    @Test
    void submeterPlanoSemAcessoriosRetornaListaVazia() throws Exception {
        String planId = criarPlanoSemAcessorios(tokenRigger);

        mockMvc.perform(get("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void snapshotSalvoCorretamente() throws Exception {
        String planId = criarPlanoComAcessorio(tokenRigger, acessorioId);

        mockMvc.perform(get("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].acessorioId").value(acessorioId))
            .andExpect(jsonPath("$[0].tipoSnapshot").value("CINTA_TEXTIL"))
            .andExpect(jsonPath("$[0].descricaoSnapshot").value("Cinta teste plano 12A"))
            .andExpect(jsonPath("$[0].certificadoStatusSnapshot").value("AUSENTE"));
    }

    // ── Vínculo individual pós-criação ────────────────────────────────────────────

    @Test
    void adminPodeVincularAcessorioAposCreacao() throws Exception {
        String planId = criarPlanoSemAcessorios(tokenRigger);

        mockMvc.perform(post("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"acessorioId\": \"" + acessorioId + "\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.codigoInternoSnapshot").value("PLAN-ACC-001"));
    }

    @Test
    void vincularMesmoAcessorioDuasVezesRetornaBadRequest() throws Exception {
        String planId = criarPlanoComAcessorio(tokenRigger, acessorioId);

        mockMvc.perform(post("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"acessorioId\": \"" + acessorioId + "\"}"))
            .andExpect(status().isBadRequest());
    }

    // ── Remoção ───────────────────────────────────────────────────────────────────

    @Test
    void adminPodeRemoverVinculo() throws Exception {
        String planId = criarPlanoComAcessorio(tokenRigger, acessorioId);

        mockMvc.perform(delete("/api/liberacoes/" + planId + "/acessorios/" + acessorioId)
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void removerVinculoInexistenteRetornaNotFound() throws Exception {
        String planId = criarPlanoSemAcessorios(tokenRigger);
        String idFake = "00000000-0000-0000-0000-000000000001";

        mockMvc.perform(delete("/api/liberacoes/" + planId + "/acessorios/" + idFake)
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isNotFound());
    }

    // ── Multiempresa ──────────────────────────────────────────────────────────────

    @Test
    void admin2NaoPodeListarAcessoriosDoPlanoDeEmpresa1() throws Exception {
        String planId = criarPlanoComAcessorio(tokenRigger, acessorioId);

        mockMvc.perform(get("/api/liberacoes/" + planId + "/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin2))
            .andExpect(status().isForbidden());
    }

    @Test
    void submeterPlanoComAcessorioDeOutraEmpresaFalha() throws Exception {
        // Cria acessório na empresa2
        String accEmp2 = extrairId(mockMvc.perform(post("/api/acessorios")
                .header("Authorization", "Bearer " + tokenAdmin2)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "codigoInterno": "ACC-EMP2-001",
                      "tipo": "MANILHA",
                      "descricao": "Manilha empresa 2",
                      "capacidadeWllKg": 3000.0
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn());

        // Rigger da empresa1 tenta usar acessório da empresa2
        mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadPlano(accEmp2)))
            .andExpect(status().isBadRequest());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private String criarELogar(Empresa empresa, String email, RoleEnum role) throws Exception {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " 12A Test");
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

    private String criarPlanoComAcessorio(String token, String accId) throws Exception {
        return extrairId(mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadPlano(accId)))
            .andExpect(status().isOk())
            .andReturn());
    }

    private String criarPlanoSemAcessorios(String token) throws Exception {
        return extrairId(mockMvc.perform(post("/api/liberacoes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadPlanoSemAcessorios()))
            .andExpect(status().isOk())
            .andReturn());
    }

    private String payloadPlano(String accId) {
        return """
            {
              "operacaoOs": "OS-12A-001",
              "riggerNome": "Rigger 12A",
              "dadosCapacidade": {
                "capGuindasteKg": 50000.0,
                "capCargaKg": 3000.0,
                "capAparelhoKg": 200.0,
                "capTotalKg": 3200.0,
                "capUsoPercent": 6.4,
                "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2,
                "eslAnguloGraus": 60.0,
                "eslTensaoPorPernaKg": 1850.0,
                "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO",
                "eslAnguloAviso": false,
                "eslWllKg": 5000.0,
                "eslWllUsoPercent": 37.0,
                "eslTemManilha": false,
                "eslManilhaCapacidadeKg": null,
                "eslManilhaUsoPercent": null,
                "eslManilhaCompativel": null
              },
              "acessorios": [{"acessorioId": "%s"}]
            }
            """.formatted(accId);
    }

    private String payloadPlanoSemAcessorios() {
        return """
            {
              "operacaoOs": "OS-12A-SEM",
              "riggerNome": "Rigger 12A",
              "dadosCapacidade": {
                "capGuindasteKg": 50000.0,
                "capCargaKg": 3000.0,
                "capAparelhoKg": 200.0,
                "capTotalKg": 3200.0,
                "capUsoPercent": 6.4,
                "capRisco": "SAFE"
              },
              "dadosEslinga": {
                "eslNumPernas": 2,
                "eslAnguloGraus": 60.0,
                "eslTensaoPorPernaKg": 1850.0,
                "eslFatorCarga": 1.155,
                "eslRisco": "SEGURO",
                "eslAnguloAviso": false,
                "eslWllKg": 5000.0,
                "eslWllUsoPercent": 37.0,
                "eslTemManilha": false,
                "eslManilhaCapacidadeKg": null,
                "eslManilhaUsoPercent": null,
                "eslManilhaCompativel": null
              }
            }
            """;
    }

    private String extrairId(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        return body.split("\"id\":\"")[1].split("\"")[0];
    }
}
