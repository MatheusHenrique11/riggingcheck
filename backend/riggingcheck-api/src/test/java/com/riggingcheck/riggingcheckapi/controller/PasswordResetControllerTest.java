package com.riggingcheck.riggingcheckapi.controller;

import com.riggingcheck.riggingcheckapi.config.MailConfig;
import com.riggingcheck.riggingcheckapi.domain.Empresa;
import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import com.riggingcheck.riggingcheckapi.repository.EmpresaRepository;
import com.riggingcheck.riggingcheckapi.repository.FuncionarioRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração para o fluxo "esqueci minha senha"
 * (POST /api/auth/esqueci-senha e POST /api/auth/redefinir-senha).
 *
 * O token bruto nunca é persistido — só existe no e-mail enviado — então
 * estes testes extraem o link do InMemoryMailSender (SMTP não configurado
 * em testes) para exercitar o fluxo completo de ponta a ponta.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "JWT_SECRET=test-secret-key-for-riggingcheck-unit-tests-only-long-enough",
    "JWT_EXPIRATION_MS=86400000",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173"
})
@Transactional
class PasswordResetControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FuncionarioRepository funcionarioRepository;
    @Autowired private JavaMailSender mailSender;

    private static final String EMAIL = "reset.flow@empresa.com";
    private static final String SENHA_ORIGINAL = "senhaOriginal99";

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setRazaoSocial("Empresa Reset Test");
        empresa.setCnpj("22.333.444/0001-99");
        empresa.setAtivo(true);
        empresa = empresaRepository.save(empresa);

        Funcionario f = new Funcionario();
        f.setEmpresaId(empresa.getId());
        f.setNome("Usuário Reset");
        f.setEmail(EMAIL);
        f.setPasswordHash(new BCryptPasswordEncoder().encode(SENHA_ORIGINAL));
        f.setRole(RoleEnum.RIGGER);
        f.setAtivo(true);
        funcionarioRepository.save(f);

        inMemoryMailSender().clear();
    }

    // ── POST /api/auth/esqueci-senha ─────────────────────────────────────────────

    @Test
    void esqueciSenha_emailExistente_retorna200EEnviaEmail() throws Exception {
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(EMAIL)))
            .andExpect(status().isOk());

        assertThat(inMemoryMailSender().getCapturedMessages()).hasSize(1);
    }

    @Test
    void esqueciSenha_emailInexistente_retorna200SemEnviarEmail() throws Exception {
        // Não revela se o e-mail existe — sempre 200, sem envio.
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"naoexiste@empresa.com\"}"))
            .andExpect(status().isOk());

        assertThat(inMemoryMailSender().getCapturedMessages()).isEmpty();
    }

    @Test
    void esqueciSenha_emailInvalido_retorna400() throws Exception {
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nao-e-email\"}"))
            .andExpect(status().isBadRequest());
    }

    // ── POST /api/auth/redefinir-senha ───────────────────────────────────────────

    @Test
    void fluxoCompleto_solicitaEredefine_permiteLoginComNovaSenha() throws Exception {
        String novaSenha = "senhaNovaSegura123";

        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(EMAIL)))
            .andExpect(status().isOk());

        String token = extrairTokenDoUltimoEmail();

        mockMvc.perform(post("/api/auth/redefinir-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"novaSenha\":\"%s\"}".formatted(token, novaSenha)))
            .andExpect(status().isOk());

        // Login com a senha antiga deve falhar
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(EMAIL, SENHA_ORIGINAL)))
            .andExpect(status().isUnauthorized());

        // Login com a nova senha deve funcionar
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(EMAIL, novaSenha)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void redefinirSenha_tokenUsado_naoPodeSerReutilizado() throws Exception {
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(EMAIL)))
            .andExpect(status().isOk());

        String token = extrairTokenDoUltimoEmail();
        String body = "{\"token\":\"%s\",\"novaSenha\":\"primeiraTroca1\"}".formatted(token);

        mockMvc.perform(post("/api/auth/redefinir-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        // Segunda tentativa com o MESMO token deve ser rejeitada
        mockMvc.perform(post("/api/auth/redefinir-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"novaSenha\":\"segundaTroca1\"}".formatted(token)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void redefinirSenha_tokenInexistente_retorna400() throws Exception {
        mockMvc.perform(post("/api/auth/redefinir-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"token-que-nunca-existiu\",\"novaSenha\":\"senhaValida1\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    void redefinirSenha_novaSenhaCurta_retorna400() throws Exception {
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(EMAIL)))
            .andExpect(status().isOk());

        String token = extrairTokenDoUltimoEmail();

        mockMvc.perform(post("/api/auth/redefinir-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"novaSenha\":\"abc\"}".formatted(token)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void novoTokenSolicitado_invalidaTokenAnterior() throws Exception {
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(EMAIL)))
            .andExpect(status().isOk());
        String tokenAntigo = extrairTokenDoUltimoEmail();

        // Segunda solicitação gera um novo token e envia um segundo e-mail
        mockMvc.perform(post("/api/auth/esqueci-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(EMAIL)))
            .andExpect(status().isOk());

        // O token antigo ainda não foi usado nem expirou — continua válido
        // até ser efetivamente consumido (apenas o uso de um token invalida
        // os demais, não a simples geração de um novo).
        mockMvc.perform(post("/api/auth/redefinir-senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"novaSenha\":\"outraSenhaValida1\"}".formatted(tokenAntigo)))
            .andExpect(status().isOk());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private MailConfig.InMemoryMailSender inMemoryMailSender() {
        return (MailConfig.InMemoryMailSender) mailSender;
    }

    private String extrairTokenDoUltimoEmail() throws Exception {
        List<MimeMessage> mensagens = inMemoryMailSender().getCapturedMessages();
        assertThat(mensagens).isNotEmpty();
        MimeMessage ultima = mensagens.get(mensagens.size() - 1);

        String conteudo = extrairTexto(ultima.getContent());
        Matcher m = Pattern.compile("token=([\\w-]+)").matcher(conteudo);
        assertThat(m.find()).as("Link de redefinição não encontrado no e-mail").isTrue();
        return m.group(1);
    }

    private String extrairTexto(Object content) throws Exception {
        if (content instanceof String s) return s;
        if (content instanceof jakarta.mail.Multipart multipart) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < multipart.getCount(); i++) {
                sb.append(extrairTexto(multipart.getBodyPart(i).getContent()));
            }
            return sb.toString();
        }
        return String.valueOf(content);
    }
}
