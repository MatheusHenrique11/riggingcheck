package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.domain.AuditLog;
import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.repository.AuditLogRepository;
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

import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para consulta do trilho de auditoria.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class AuditLogControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private BCryptPasswordEncoder encoder;

    private static final String SENHA = "SenhaAudit99";

    private String tokenAdmin;
    private String tokenRigger;
    private String tokenGerente;
    private Empresa empresa;
    private Empresa outraEmpresa;

    @BeforeEach
    void setUp() throws Exception {
        empresa      = criarEmpresa("Empresa Audit Test", "11.222.333/0001-77");
        outraEmpresa = criarEmpresa("Outra Empresa Audit", "99.888.777/0001-88");

        criarFuncionario("admin.audit@empresa.com",   RoleEnum.ADMIN_EMPRESA,     empresa);
        criarFuncionario("rigger.audit@empresa.com",  RoleEnum.RIGGER,            empresa);
        criarFuncionario("gerente.audit@empresa.com", RoleEnum.GERENTE_OPERACOES, empresa);

        tokenAdmin   = logar("admin.audit@empresa.com");
        tokenRigger  = logar("rigger.audit@empresa.com");
        tokenGerente = logar("gerente.audit@empresa.com");

        criarLog(empresa.getId(), "ACESSORIO_CRIADO", "AcessorioIcamento");
        criarLog(empresa.getId(), "ACESSORIO_ATUALIZADO", "AcessorioIcamento");
        criarLog(empresa.getId(), "PLANO_APROVADO", "SolicitacaoLiberacao");
        criarLog(outraEmpresa.getId(), "ACESSORIO_CRIADO", "AcessorioIcamento");
    }

    // ── Acesso ───────────────────────────────────────────────────────────────────

    @Test
    void rigger_naoPodeListarAuditoria_retorna403() throws Exception {
        mockMvc.perform(get("/api/auditoria")
                .header("Authorization", "Bearer " + tokenRigger))
            .andExpect(status().isForbidden());
    }

    @Test
    void gerenteOperacoes_naoPodeListarAuditoria_retorna403() throws Exception {
        // Auditoria é ferramenta de compliance — restrita a ADMIN_EMPRESA/SUPER_ADMIN
        mockMvc.perform(get("/api/auditoria")
                .header("Authorization", "Bearer " + tokenGerente))
            .andExpect(status().isForbidden());
    }

    @Test
    void semToken_retorna401ou403() throws Exception {
        mockMvc.perform(get("/api/auditoria"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void admin_listaAuditoria_retorna200ComEstruturaDePagina() throws Exception {
        mockMvc.perform(get("/api/auditoria")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.content", hasSize(3)));
    }

    // ── Filtros ──────────────────────────────────────────────────────────────────

    @Test
    void filtraPorEntityType() throws Exception {
        mockMvc.perform(get("/api/auditoria")
                .param("entityType", "SolicitacaoLiberacao")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].action").value("PLANO_APROVADO"));
    }

    @Test
    void filtraPorAction() throws Exception {
        mockMvc.perform(get("/api/auditoria")
                .param("action", "ACESSORIO_CRIADO")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void paginacao_respeitaSize() throws Exception {
        mockMvc.perform(get("/api/auditoria")
                .param("size", "2")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(2)))
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.totalPages").value(2));
    }

    // ── Multiempresa ─────────────────────────────────────────────────────────────

    @Test
    void adminNaoVeLogsDeOutraEmpresa() throws Exception {
        mockMvc.perform(get("/api/auditoria")
                .header("Authorization", "Bearer " + tokenAdmin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[?(@.empresaId == '" + outraEmpresa.getId() + "')]", hasSize(0)));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private Empresa criarEmpresa(String razaoSocial, String cnpj) {
        Empresa e = new Empresa();
        e.setRazaoSocial(razaoSocial);
        e.setCnpj(cnpj);
        e.setAtivo(true);
        return empresaRepository.save(e);
    }

    private void criarFuncionario(String email, RoleEnum role, Empresa emp) {
        Funcionario f = new Funcionario();
        f.setNome(role.name() + " Audit");
        f.setEmail(email);
        f.setPasswordHash(encoder.encode(SENHA));
        f.setRole(role);
        f.setAtivo(true);
        f.setEmpresaId(emp.getId());
        funcionarioRepository.save(f);
    }

    private void criarLog(UUID empresaId, String action, String entityType) {
        AuditLog log = AuditLog.builder()
            .empresaId(empresaId)
            .userId(UUID.randomUUID())
            .userEmail("sistema@empresa.com")
            .action(action)
            .entityType(entityType)
            .entityId(UUID.randomUUID())
            .details("teste")
            .createdAt(LocalDateTime.now())
            .build();
        auditLogRepository.save(log);
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
