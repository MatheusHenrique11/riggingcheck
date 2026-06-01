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

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para GET /api/funcionarios/dashboard-competencias — Fase 18A.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class FuncionarioDashboardTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaDash99";

    private String tokenAdmin;
    private String tokenLider;
    private String tokenRigger;
    private String tokenGerente;
    private Empresa empresa;

    @BeforeEach
    void setUp() throws Exception {
        empresa = criarEmpresa("Empresa Dashboard Test", "12.345.678/0001-99");

        criarFuncionario("admin.dash@empresa.com",   RoleEnum.ADMIN_EMPRESA,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1), LocalDate.now().plusYears(1));
        criarFuncionario("lider.dash@empresa.com",   RoleEnum.LIDER_EQUIPE,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1), LocalDate.now().plusYears(1));
        criarFuncionario("rigger.dash@empresa.com",  RoleEnum.RIGGER,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1), LocalDate.now().plusYears(1));
        criarFuncionario("gerente.dash@empresa.com", RoleEnum.GERENTE_OPERACOES,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1), LocalDate.now().plusYears(1));

        tokenAdmin   = logar("admin.dash@empresa.com");
        tokenLider   = logar("lider.dash@empresa.com");
        tokenRigger  = logar("rigger.dash@empresa.com");
        tokenGerente = logar("gerente.dash@empresa.com");
    }

    // ── Acesso autorizado ────────────────────────────────────────────────────────

    @Test
    void admin_acessaDashboard_retorna200ComEstrutura() throws Exception {
        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalFuncionarios").isNumber())
            .andExpect(jsonPath("$.aptos").isNumber())
            .andExpect(jsonPath("$.bloqueados").isNumber())
            .andExpect(jsonPath("$.aVencer").isNumber())
            .andExpect(jsonPath("$.asoVencido").isNumber())
            .andExpect(jsonPath("$.nr11Vencida").isNumber())
            .andExpect(jsonPath("$.nr35Vencida").isNumber())
            .andExpect(jsonPath("$.porFuncao").isArray())
            .andExpect(jsonPath("$.itensCriticos").isArray());
    }

    @Test
    void lider_acessaDashboard_retorna200() throws Exception {
        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk());
    }

    @Test
    void gerente_acessaDashboard_retorna200() throws Exception {
        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenGerente))
            .andExpect(status().isOk());
    }

    // ── Acesso bloqueado ─────────────────────────────────────────────────────────

    @Test
    void rigger_naoPodeAcessarDashboard_retorna403() throws Exception {
        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isForbidden());
    }

    @Test
    void semToken_retornaErro() throws Exception {
        mockMvc.perform(get("/api/funcionarios/dashboard-competencias"))
            .andExpect(status().is4xxClientError());
    }

    // ── Conteúdo do dashboard ────────────────────────────────────────────────────

    @Test
    void asoVencido_apareceBloqueado() throws Exception {
        criarFuncionario("aso.vencido@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1),
            LocalDate.now().minusDays(1)); // ASO vencido

        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.asoVencido").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.bloqueados").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.itensCriticos[?(@.motivo == 'ASO vencido')]", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void nr11Vencida_apareceComoBlockedNosItensCriticos() throws Exception {
        criarFuncionario("nr11.vencida@empresa.com", RoleEnum.RIGGER,
            LocalDate.now().minusDays(5), // NR-11 vencida
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1));

        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nr11Vencida").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.itensCriticos[?(@.motivo == 'NR-11 vencida')]", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void treinamentoAVencer_apareceComoAlerta() throws Exception {
        criarFuncionario("avencer@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusDays(10), // NR-11 a vencer em 10 dias
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1));

        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.itensCriticos[?(@.severidade == 'RESTRICTED')]", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void multiempresa_adminSoVeSuaEmpresa() throws Exception {
        // Cria funcionário em outra empresa
        Empresa outra = criarEmpresa("Outra Empresa", "99.999.999/0001-00");
        Funcionario f = new Funcionario();
        f.setNome("Outro Rigger");
        f.setEmail("outro.rigger@outra.com");
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(RoleEnum.RIGGER);
        f.setAtivo(true);
        f.setEmpresaId(outra.getId());
        funcionarioRepository.save(f);

        // Admin da empresa original não vê o funcionário da outra empresa
        mockMvc.perform(get("/api/funcionarios/dashboard-competencias")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.itensCriticos[?(@.nome == 'Outro Rigger')]", hasSize(0)));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Empresa criarEmpresa(String razaoSocial, String cnpj) {
        Empresa e = new Empresa();
        e.setRazaoSocial(razaoSocial);
        e.setCnpj(cnpj);
        e.setAtivo(true);
        return empresaRepository.save(e);
    }

    private void criarFuncionario(String email, RoleEnum role,
                                   LocalDate nr11, LocalDate nr35, LocalDate aso) {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Dash");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(empresa.getId());
        f.setVencimentoNr11(nr11);
        f.setVencimentoNr35(nr35);
        f.setVencimentoAso(aso);
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
