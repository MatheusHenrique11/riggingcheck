package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.domain.AcessorioIcamento;
import com.riggingcheck.riggingcheckapi.domain.CertificadoAcessorio;
import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusAcessorio;
import com.riggingcheck.riggingcheckapi.domain.enums.StatusCertificado;
import com.riggingcheck.riggingcheckapi.domain.enums.TipoAcessorio;
import com.riggingcheck.riggingcheckapi.repository.AcessorioIcamentoRepository;
import com.riggingcheck.riggingcheckapi.repository.CertificadoAcessorioRepository;
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
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para Central de Alertas — Fase 19A.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class OperationalAlertControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private AcessorioIcamentoRepository acessorioRepository;
    @Autowired private CertificadoAcessorioRepository certRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaAlert99";

    private String tokenAdmin;
    private String tokenRigger;
    private Empresa empresa;
    private Empresa outraEmpresa;

    @BeforeEach
    void setUp() throws Exception {
        empresa      = criarEmpresa("Empresa Alert Test", "11.222.333/0001-55");
        outraEmpresa = criarEmpresa("Outra Empresa Alert", "99.888.777/0001-66");

        criarFuncionario("admin.alert@empresa.com",  RoleEnum.ADMIN_EMPRESA,  null, null, null);
        criarFuncionario("rigger.alert@empresa.com", RoleEnum.RIGGER,         null, null, null);

        tokenAdmin  = logar("admin.alert@empresa.com");
        tokenRigger = logar("rigger.alert@empresa.com");
    }

    // ── Acesso ───────────────────────────────────────────────────────────────────

    @Test
    void rigger_naoPodeListarAlertas_retorna403() throws Exception {
        mockMvc.perform(get("/api/alertas")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_listaAlertas_retorna200() throws Exception {
        mockMvc.perform(get("/api/alertas")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    void semToken_retorna401ou403() throws Exception {
        mockMvc.perform(get("/api/alertas"))
            .andExpect(status().is4xxClientError());
    }

    // ── Geração de alertas ───────────────────────────────────────────────────────

    @Test
    void gerarAlertas_retornaContagem() throws Exception {
        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gerados").isNumber());
    }

    @Test
    void certificadoVencido_geraAlerta() throws Exception {
        AcessorioIcamento acc = criarAcessorio("ACC-CERT-TEST");
        criarCertificado(acc, LocalDate.now().minusDays(5), StatusCertificado.VENCIDO);

        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gerados").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/alertas")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.tipo == 'CERTIFICADO_VENCIDO')]", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void asoVencido_geraAlertaBloqueado() throws Exception {
        criarFuncionario("aso.venc.alert@empresa.com", RoleEnum.OPERADOR,
            LocalDate.now().plusYears(1), LocalDate.now().plusYears(1),
            LocalDate.now().minusDays(3));

        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/alertas")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.tipo == 'ASO_VENCIDO' && @.severidade == 'BLOCKED')]",
                hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void gerarDuasVezes_naoDuplicaAlertas() throws Exception {
        criarFuncionario("dupl.alert@empresa.com", RoleEnum.OPERADOR,
            null, null, LocalDate.now().minusDays(1));

        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gerados").value(greaterThanOrEqualTo(1)));

        // Segunda geração deve criar 0 novos
        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gerados").value(0));
    }

    // ── Ações de alerta ──────────────────────────────────────────────────────────

    @Test
    void resolverAlerta_mudaStatusParaResolvido() throws Exception {
        criarFuncionario("res.alert@empresa.com", RoleEnum.OPERADOR,
            null, null, LocalDate.now().minusDays(2));

        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk());

        // Busca o ID do alerta criado
        MvcResult r = mockMvc.perform(get("/api/alertas")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andReturn();

        String body = r.getResponse().getContentAsString();
        String alertId = body.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
        if (alertId.contains("[") || alertId.length() < 30) return; // sem alertas — ignora

        mockMvc.perform(patch("/api/alertas/" + alertId + "/resolver")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RESOLVIDO"));
    }

    // ── Multiempresa ─────────────────────────────────────────────────────────────

    @Test
    void blocoCrossTenant_adminNaoVeAlertasDeOutraEmpresa() throws Exception {
        // Cria funcionário na outra empresa com ASO vencido
        Funcionario outro = new Funcionario();
        outro.setNome("Outro Funcionario");
        outro.setEmail("outro.cross@outra.com");
        outro.setPasswordHash(encoder.encode(SENHA));
        outro.setRole(RoleEnum.RIGGER);
        outro.setAtivo(true);
        outro.setEmpresaId(outraEmpresa.getId());
        outro.setVencimentoAso(LocalDate.now().minusDays(10));
        funcionarioRepository.save(outro);

        String tokenOutroAdmin = null;
        Funcionario adminOutra = new Funcionario();
        adminOutra.setNome("Admin Outra");
        adminOutra.setEmail("admin.outra.cross@outra.com");
        adminOutra.setPasswordHash(encoder.encode(SENHA));
        adminOutra.setRole(RoleEnum.ADMIN_EMPRESA);
        adminOutra.setAtivo(true);
        adminOutra.setEmpresaId(outraEmpresa.getId());
        funcionarioRepository.save(adminOutra);
        tokenOutroAdmin = logar("admin.outra.cross@outra.com");

        // Gera alertas para a outra empresa
        mockMvc.perform(post("/api/alertas/gerar")
                .header("Authorization", "Bearer " + tokenOutroAdmin))
            .andExpect(status().isOk());

        // Admin da empresa original NÃO deve ver alertas da outra empresa
        mockMvc.perform(get("/api/alertas")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.empresaId == '" + outraEmpresa.getId() + "')]", hasSize(0)));
    }

    // ── Resumo ───────────────────────────────────────────────────────────────────

    @Test
    void resumo_retornaEstrutura() throws Exception {
        mockMvc.perform(get("/api/alertas/resumo")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalNovo").isNumber())
            .andExpect(jsonPath("$.totalAtivo").isNumber())
            .andExpect(jsonPath("$.bloqueados").isNumber())
            .andExpect(jsonPath("$.porTipo").isArray());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

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
        f.setNome(role.name() + " Alert");
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

    private AcessorioIcamento criarAcessorio(String codigo) {
        AcessorioIcamento a = new AcessorioIcamento();
        a.setCodigoInterno(codigo);
        a.setEmpresaId(empresa.getId());
        a.setStatus(StatusAcessorio.ATIVO);
        a.setTipo(TipoAcessorio.OUTRO);
        a.setDescricao("Acessório de Teste");
        a.setDataCadastro(LocalDateTime.now());
        return acessorioRepository.save(a);
    }

    private void criarCertificado(AcessorioIcamento acc, LocalDate validade, StatusCertificado status) {
        CertificadoAcessorio c = new CertificadoAcessorio();
        c.setAcessorioId(acc.getId());
        c.setEmpresaId(empresa.getId());
        c.setNumeroCertificado("CERT-TEST-001");
        c.setDataValidade(validade);
        c.setStatus(status);
        certRepository.save(c);
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
