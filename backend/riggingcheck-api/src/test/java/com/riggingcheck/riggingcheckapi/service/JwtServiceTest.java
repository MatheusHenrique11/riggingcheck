package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Testes unitários para JwtService.
 * Usa ReflectionTestUtils para injetar @Value sem precisar de contexto Spring.
 */
class JwtServiceTest {

    private static final String SECRET =
            "test-secret-key-for-jwtservice-unit-tests-only-long-enough";
    private static final long EXPIRATION_MS = 86_400_000L; // 24 h

    private JwtService jwtService;
    private Funcionario funcionario;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpirationInMillis", EXPIRATION_MS);
        jwtService.validarSegredo(); // simula @PostConstruct

        funcionario = new Funcionario();
        funcionario.setId(UUID.randomUUID());
        funcionario.setEmpresaId(UUID.randomUUID());
        funcionario.setNome("João Rigger");
        funcionario.setEmail("joao@empresa.com");
        funcionario.setRole(RoleEnum.RIGGER);
        funcionario.setAtivo(true);
    }

    // ── Geração de token ─────────────────────────────────────────────────────────

    @Test
    void generateToken_retornaTokenNaoVazio() {
        String token = jwtService.generateToken(funcionario);
        assertThat(token).isNotBlank();
    }

    @Test
    void generateToken_tokenTemTresPartesSeparadasPorPonto() {
        String token = jwtService.generateToken(funcionario);
        assertThat(token.split("\\.")).hasSize(3);
    }

    // ── Extração de claims ───────────────────────────────────────────────────────

    @Test
    void getEmailFromToken_retornaEmailCorreto() {
        String token = jwtService.generateToken(funcionario);
        assertThat(jwtService.getEmailFromToken(token)).isEqualTo("joao@empresa.com");
    }

    @Test
    void getUserIdFromToken_retornaIdCorreto() {
        String token = jwtService.generateToken(funcionario);
        assertThat(jwtService.getUserIdFromToken(token)).isEqualTo(funcionario.getId());
    }

    @Test
    void getEmpresaIdFromToken_retornaIdCorreto() {
        String token = jwtService.generateToken(funcionario);
        assertThat(jwtService.getEmpresaIdFromToken(token)).isEqualTo(funcionario.getEmpresaId());
    }

    @Test
    void getRoleFromToken_retornaRoleCorreto() {
        String token = jwtService.generateToken(funcionario);
        assertThat(jwtService.getRoleFromToken(token)).isEqualTo(RoleEnum.RIGGER);
    }

    // ── Validação de token ───────────────────────────────────────────────────────

    @Test
    void validateToken_retornaTrueParaTokenValido() {
        String token = jwtService.generateToken(funcionario);
        assertThat(jwtService.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_retornaFalseParaTokenAlterado() {
        String token = jwtService.generateToken(funcionario);
        // Altera os últimos 4 caracteres da assinatura
        String alterado = token.substring(0, token.length() - 4) + "XXXX";
        assertThat(jwtService.validateToken(alterado)).isFalse();
    }

    @Test
    void validateToken_retornaFalseParaStringAleatoria() {
        assertThat(jwtService.validateToken("isso.nao.e.jwt")).isFalse();
    }

    @Test
    void validateToken_retornaFalseParaTokenVazio() {
        assertThat(jwtService.validateToken("")).isFalse();
    }

    // ── Tokens de diferentes roles ───────────────────────────────────────────────

    @Test
    void getRoleFromToken_funcionaParaCadaRole() {
        for (RoleEnum role : RoleEnum.values()) {
            funcionario.setRole(role);
            String token = jwtService.generateToken(funcionario);
            assertThat(jwtService.getRoleFromToken(token)).isEqualTo(role);
        }
    }

    // ── Validação do segredo ─────────────────────────────────────────────────────

    @Test
    void validarSegredo_lancaExcecaoSeSegredoCurto() {
        JwtService svc = new JwtService();
        ReflectionTestUtils.setField(svc, "jwtSecret", "curto");
        ReflectionTestUtils.setField(svc, "jwtExpirationInMillis", EXPIRATION_MS);
        assertThatThrownBy(svc::validarSegredo)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("curto");
    }

    @Test
    void validarSegredo_lancaExcecaoSeSegredoVazio() {
        JwtService svc = new JwtService();
        ReflectionTestUtils.setField(svc, "jwtSecret", "");
        ReflectionTestUtils.setField(svc, "jwtExpirationInMillis", EXPIRATION_MS);
        assertThatThrownBy(svc::validarSegredo)
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void validarSegredo_aceitaSegredoDeExatamente32Bytes() {
        JwtService svc = new JwtService();
        ReflectionTestUtils.setField(svc, "jwtSecret", "12345678901234567890123456789012"); // 32 chars
        ReflectionTestUtils.setField(svc, "jwtExpirationInMillis", EXPIRATION_MS);
        assertThatCode(svc::validarSegredo).doesNotThrowAnyException();
    }
}
