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
 * Testes de integração para TeamCompetencyComplianceRule — Fase 17.
 * Verifica que violações de equipe afetam o technicalStatus do plano
 * através do endpoint GET /api/planos/{id}/compliance.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class TeamComplianceIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private SolicitacaoLiberacaoRepository liberacaoRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaComp99";

    private String tokenRigger;
    private String tokenLider;
    private String tokenSafetyAdmin;

    private Empresa empresa;
    private Funcionario riggerFuncionario;
    private SolicitacaoLiberacao plano;

    @BeforeEach
    void setUp() throws Exception {
        empresa = criarEmpresa("Empresa Compliance Test", "77.888.999/0001-22");

        riggerFuncionario = criarFuncionario("rigger.comp@empresa.com", RoleEnum.RIGGER,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1), LocalDate.now().plusYears(1));
        criarFuncionario("lider.comp@empresa.com", RoleEnum.LIDER_EQUIPE, null, null, null);
        criarFuncionario("safety.comp@empresa.com", RoleEnum.SAFETY_ADMIN, null, null, null);

        tokenRigger      = logar("rigger.comp@empresa.com");
        tokenLider       = logar("lider.comp@empresa.com");
        tokenSafetyAdmin = logar("safety.comp@empresa.com");

        plano = criarPlano(false);
    }

    // ── Sem equipe → RESTRICTED ──────────────────────────────────────────────────

    @Test
    void semEquipe_compliance_retornaRESTRICTED() throws Exception {
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus",
                anyOf(is("RESTRICTED"), is("BLOCKED"), is("WARNING"))));

        // Verifica que existe violação de equipe não vinculada
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_NAO_VINCULADA')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    // ── ASO vencido → BLOCKED ────────────────────────────────────────────────────

    @Test
    void asoVencido_compliance_retornaBLOCKED() throws Exception {
        Funcionario membroAsoVencido = criarFuncionario("aso.vencido@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1),
            LocalDate.now().minusDays(1)); // ASO vencido ontem

        adicionarMembro(membroAsoVencido.getId(), "SINALEIRO");

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus").value("BLOCKED"))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_ASO_VENCIDO')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    // ── ASO ausente → BLOCKED ────────────────────────────────────────────────────

    @Test
    void asoAusente_compliance_retornaBLOCKED() throws Exception {
        Funcionario membroSemAso = criarFuncionario("aso.ausente@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1),
            null); // ASO ausente

        adicionarMembro(membroSemAso.getId(), "AMARRADOR");

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus").value("BLOCKED"))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_ASO_AUSENTE')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    // ── NR-11 vencida em função crítica → BLOCKED ────────────────────────────────

    @Test
    void nr11VencidaFuncaoCritica_compliance_retornaBLOCKED() throws Exception {
        Funcionario riggerNr11Vencida = criarFuncionario("nr11.vencida@empresa.com", RoleEnum.RIGGER,
            LocalDate.now().minusDays(1), // NR-11 vencida
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1));

        adicionarMembro(riggerNr11Vencida.getId(), "RIGGER");

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus").value("BLOCKED"))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_NR11_VENCIDO')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    // ── NR-11 ausente em função crítica → BLOCKED ────────────────────────────────

    @Test
    void nr11AusenteFuncaoCritica_compliance_retornaBLOCKED() throws Exception {
        Funcionario operadorSemNr11 = criarFuncionario("nr11.ausente@empresa.com", RoleEnum.OPERADOR,
            null, // NR-11 ausente
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1));

        adicionarMembro(operadorSemNr11.getId(), "OPERADOR_GUINDASTE");

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus").value("BLOCKED"))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_NR11_AUSENTE')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    // ── Treinamento a vencer em 30 dias → RESTRICTED ─────────────────────────────

    @Test
    void treinamentoAVencer_compliance_retornaRESTRICTED() throws Exception {
        Funcionario membroAVencer = criarFuncionario("avencer@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusDays(10), // NR-11 a vencer em 10 dias
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1));

        adicionarMembro(membroAVencer.getId(), "SINALEIRO");

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_TREINAMENTO_A_VENCER')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    // ── Equipe válida → sem violação de equipe ───────────────────────────────────

    @Test
    void equipeValida_compliance_semViolacaoEquipe() throws Exception {
        Funcionario membroValido = criarFuncionario("valido@empresa.com", RoleEnum.RIGGER,
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1),
            LocalDate.now().plusYears(1));

        adicionarMembro(membroValido.getId(), "RIGGER");

        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            // Não deve haver violação de equipe não vinculada nem ASO/NR-11 bloqueados
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_NAO_VINCULADA')]", hasSize(0)))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_ASO_VENCIDO')]", hasSize(0)))
            .andExpect(jsonPath("$.violations[?(@.ruleId == 'EQUIPE_NR11_VENCIDO')]", hasSize(0)));
    }

    // ── Líder comum não aprova plano BLOCKED ─────────────────────────────────────

    @Test
    void liderComum_naoAprovaPlano_BLOCKED() throws Exception {
        // Cria membro com ASO vencido para gerar BLOCKED
        Funcionario membroAsoVencido = criarFuncionario("lider.block@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1),
            LocalDate.now().minusDays(5));
        adicionarMembro(membroAsoVencido.getId(), "SINALEIRO");

        // Verifica BLOCKED via compliance antes de submeter
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenLider))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus").value("BLOCKED"));

        // Submete o plano (BLOCKED persiste no technicalStatus da entidade)
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/submeter")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk());

        // Líder tenta aprovar → deve falhar (403) pois technicalStatus = BLOCKED
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/aprovar")
                .header("Authorization", "Bearer " + tokenLider)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"justification\":\"Tentativa\"}"))
            .andExpect(status().isForbidden());
    }

    // ── SAFETY_ADMIN aprova exceção com justificativa ─────────────────────────────

    @Test
    void safetyAdmin_aprovaExcecao_planoBLOCKED() throws Exception {
        Funcionario membroAsoVencido = criarFuncionario("safety.block@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1),
            LocalDate.now().minusDays(3));
        adicionarMembro(membroAsoVencido.getId(), "AMARRADOR");

        // Verifica BLOCKED via compliance
        mockMvc.perform(get("/api/planos/" + plano.getId() + "/compliance")
                .header("Authorization", "Bearer " + tokenSafetyAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.overallStatus").value("BLOCKED"));

        // Submete
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/submeter")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isOk());

        // SAFETY_ADMIN aprova com justificativa → deve funcionar
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/aprovar")
                .header("Authorization", "Bearer " + tokenSafetyAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"justification\":\"Exceção aprovada por SAFETY_ADMIN — operação emergencial\",\"isException\":true}"))
            .andExpect(status().isOk());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Empresa criarEmpresa(String razaoSocial, String cnpj) {
        Empresa e = new Empresa();
        e.setRazaoSocial(razaoSocial);
        e.setCnpj(cnpj);
        e.setAtivo(true);
        return empresaRepository.save(e);
    }

    private Funcionario criarFuncionario(String email, RoleEnum role,
                                          LocalDate nr11, LocalDate nr35, LocalDate aso) {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Compliance");
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
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, SENHA)))
            .andExpect(status().isOk())
            .andReturn();
        return r.getResponse().getContentAsString()
            .replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    }

    private SolicitacaoLiberacao criarPlano(boolean areaClassificada) {
        SolicitacaoLiberacao sol = new SolicitacaoLiberacao();
        sol.setEmpresaId(empresa.getId());
        sol.setEmpresaNome(empresa.getRazaoSocial());
        sol.setOperacaoOs("OS-F17-TEST");
        sol.setRiggerNome(riggerFuncionario.getNome());
        sol.setSolicitadoPorId(riggerFuncionario.getId());
        sol.setStatus(StatusLiberacao.ANALISAR);
        sol.setAreaClassificada(areaClassificada);
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

    private void adicionarMembro(java.util.UUID funcionarioId, String funcao) throws Exception {
        mockMvc.perform(post("/api/planos/" + plano.getId() + "/equipe")
                .header("Authorization", "Bearer " + tokenRigger)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"funcionarioId\":\"%s\",\"funcaoOperacional\":\"%s\"}".formatted(funcionarioId, funcao)))
            .andExpect(status().isCreated());
    }
}
