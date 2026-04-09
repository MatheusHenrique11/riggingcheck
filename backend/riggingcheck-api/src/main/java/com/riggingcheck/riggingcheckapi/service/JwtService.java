package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationInMillis;

    private SecretKey getSigningKey() {
        byte[] raw = jwtSecret.getBytes(StandardCharsets.UTF_8);
        byte[] keyBytes = raw.length >= 32 ? raw : Arrays.copyOf(raw, 32);
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String generateToken(Funcionario funcionario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", funcionario.getId());
        claims.put("empresaId", funcionario.getEmpresaId());
        claims.put("role", funcionario.getRole());
        claims.put("userName", funcionario.getNome());

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
}
