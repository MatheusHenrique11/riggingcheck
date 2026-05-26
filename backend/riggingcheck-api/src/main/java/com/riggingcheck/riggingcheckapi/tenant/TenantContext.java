package com.riggingcheck.riggingcheckapi.tenant;

import java.util.UUID;

/**
 * Armazena o ID da empresa (tenant) no contexto da thread atual.
 * Populado pelo JwtAuthenticationFilter e consumido pelo
 * TenantAwareHibernateJpaDialect para habilitar o filtro Hibernate
 * antes de qualquer query na transação.
 * SUPER_ADMIN recebe null — sem filtro aplicado.
 */
public final class TenantContext {

    public static final String FILTER_NAME  = "tenantFilter";
    public static final String PARAM_NAME   = "empresaId";

    private static final ThreadLocal<UUID> HOLDER = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID empresaId) {
        HOLDER.set(empresaId);
    }

    public static UUID get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
