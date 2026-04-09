package com.riggingcheck.riggingcheckapi.service;

import com.riggingcheck.riggingcheckapi.domain.Funcionario;
import com.riggingcheck.riggingcheckapi.domain.enums.RoleEnum;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
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
        // Garante mínimo 32 bytes para HMAC-SHA256 sem lançar exceção na inicialização
        byte[] keyBytes = raw.length >= 32 ? raw : Arrays.copyOf(raw, 32);
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    public String generateToken(Funcionario funcionario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", funcionario.getId());
        claims.put("empresaId", funcionario.getEmpresaId());
        claims.put("role", funcionario.getRole());
        claims.put("userName", funcionario.getNome());

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationInMillis);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(funcionario.getEmail())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public UUID getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return UUID.fromString(claims.get("userId", String.class));
    }

    public UUID getEmpresaIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return UUID.fromString(claims.get("empresaId", String.class));
    }

    public RoleEnum getRoleFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return RoleEnum.valueOf(claims.get("role", String.class));
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}