/**
 * Define o filtro Hibernate de multi-tenancy uma única vez no nível de pacote.
 * Cada entidade que precisar de isolamento por empresa deve adicionar
 * @Filter(name = "tenantFilter", condition = "empresa_id = :empresaId").
 */
@FilterDef(
    name  = "tenantFilter",
    parameters = @ParamDef(name = "empresaId", type = UUID.class)
)
package com.riggingcheck.riggingcheckapi.domain;

import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import java.util.UUID;
