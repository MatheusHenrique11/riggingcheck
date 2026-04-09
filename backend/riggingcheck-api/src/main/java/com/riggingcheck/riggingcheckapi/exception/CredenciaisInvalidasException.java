package com.riggingcheck.riggingcheckapi.exception;

public class CredenciaisInvalidasException extends RuntimeException {
    public CredenciaisInvalidasException() {
        super("Credenciais inválidas");
    }
}
