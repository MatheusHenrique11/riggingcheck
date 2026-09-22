-- ============================================================================
-- V2 — Tokens de redefinição de senha ("esqueci minha senha")
-- ============================================================================
-- Um funcionário sem acesso à conta pode solicitar um link de redefinição
-- por e-mail. O token bruto só existe no e-mail enviado; aqui armazenamos
-- apenas o hash SHA-256 dele, então um vazamento do banco não permite
-- redefinir senhas de ninguém.
-- ============================================================================

CREATE TABLE password_reset_tokens (
    id             UUID PRIMARY KEY,
    funcionario_id UUID NOT NULL,
    empresa_id     UUID NOT NULL,
    token_hash     VARCHAR(64) NOT NULL,
    expires_at     TIMESTAMP(6) NOT NULL,
    used_at        TIMESTAMP(6),
    created_at     TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_password_reset_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_password_reset_funcionario ON password_reset_tokens (funcionario_id);
