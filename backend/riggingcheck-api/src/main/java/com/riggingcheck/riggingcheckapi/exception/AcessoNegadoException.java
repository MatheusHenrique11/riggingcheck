package com.riggingcheck.riggingcheckapi.exception;

public class AcessoNegadoException extends RuntimeException {
    public AcessoNegadoException() {
        super("Acesso negado");
    }
}
