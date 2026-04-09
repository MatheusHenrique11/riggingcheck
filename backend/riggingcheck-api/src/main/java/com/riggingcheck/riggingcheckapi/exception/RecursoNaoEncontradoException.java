package com.riggingcheck.riggingcheckapi.exception;

public class RecursoNaoEncontradoException extends RuntimeException {
    public RecursoNaoEncontradoException(String recurso) {
        super(recurso + " não encontrado(a)");
    }
}
