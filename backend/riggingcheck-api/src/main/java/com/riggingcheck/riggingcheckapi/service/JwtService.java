package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import io.jsonwebtoken.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationInMillis;

    @PostConstruct
    void validarSegredo() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                "JWT_SECRET muito curto (mínimo %d bytes). Segredo fraco compromete a segurança de todos os tokens."
                    .formatted(MIN_SECRET_BYTES));
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    public String generateToken(Funcionario funcionario) {
        var claims = Map.<String, Object>of(
            "userId",    funcionario.getId().toString(),
            "empresaId", funcionario.getEmpresaId().toString(),
            "role",      funcionario.getRole().name(),
            "nome",      funcionario.getNome()
        );

        Date now = new Date();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(funcionario.getEmail())
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + jwtExpirationInMillis))
                .signWith(getSigningKey())
                .compact();
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public UUID getUserIdFromToken(String token) {
        return UUID.fromString(parseClaims(token).get("userId", String.class));
    }

    public UUID getEmpresaIdFromToken(String token) {
        return UUID.fromString(parseClaims(token).get("empresaId", String.class));
    }

    public RoleEnum getRoleFromToken(String token) {
        return RoleEnum.valueOf(parseClaims(token).get("role", String.class));
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
