-- ============================================================================
-- V1 — Baseline do schema existente
-- ============================================================================
-- Este script documenta o schema tal como ele já existia em produção, gerado
-- anteriormente pelo Hibernate via `ddl-auto: update`. Ele foi extraído com
-- pg_dump a partir de um banco PostgreSQL 16 recriado do zero pelas mesmas
-- entidades JPA da aplicação (nenhuma tabela foi alterada manualmente).
--
-- Em ambientes que JÁ POSSUEM essas tabelas (produção), o Flyway está
-- configurado com baseline-on-migrate=true e baseline-version=1, então este
-- script NÃO é executado contra eles — apenas registrado como já aplicado.
-- Em ambientes novos (ex.: um banco vazio), ele roda normalmente e cria o
-- schema completo.
--
-- A partir daqui, qualquer alteração de schema deve vir em um novo arquivo
-- V2__..., V3__..., etc. — nunca editando este arquivo.
-- ============================================================================

CREATE TABLE public.acessorios_icamento (
    capacidade_wll_kg double precision,
    data_fabricacao date,
    data_cadastro timestamp(6) without time zone NOT NULL,
    cadastrado_por_id uuid,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    unidade character varying(20),
    codigo_interno character varying(100) NOT NULL,
    numero_serie character varying(100),
    cadastrado_por_nome character varying(200),
    fabricante character varying(200),
    modelo character varying(200),
    localizacao character varying(300),
    descricao character varying(500) NOT NULL,
    observacoes text,
    status character varying(20) NOT NULL,
    tipo character varying(30) NOT NULL,
    CONSTRAINT acessorios_icamento_status_check CHECK (((status)::text = ANY ((ARRAY['ATIVO'::character varying, 'EM_INSPECAO'::character varying, 'REPROVADO'::character varying, 'DESCARTADO'::character varying, 'VENCIDO'::character varying])::text[]))),
    CONSTRAINT acessorios_icamento_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['CINTA_TEXTIL'::character varying, 'CABO_ACO'::character varying, 'CORRENTE'::character varying, 'MANILHA'::character varying, 'GANCHO'::character varying, 'TALHA'::character varying, 'BALANCIM'::character varying, 'OUTRO'::character varying])::text[])))
);

CREATE TABLE public.approval_comments (
    version_number integer,
    created_at timestamp(6) without time zone NOT NULL,
    author_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    plan_id uuid NOT NULL,
    author_role character varying(50),
    field_ref character varying(100),
    author_name character varying(255) NOT NULL,
    content text NOT NULL
);

CREATE TABLE public.approval_decisions (
    is_exception boolean NOT NULL,
    version_number integer NOT NULL,
    decided_at timestamp(6) without time zone NOT NULL,
    decided_by_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    plan_id uuid NOT NULL,
    decided_by_role character varying(50),
    decided_by_name character varying(255) NOT NULL,
    decision character varying(40) NOT NULL,
    justification text,
    CONSTRAINT approval_decisions_decision_check CHECK (((decision)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'UNDER_REVIEW'::character varying, 'CHANGES_REQUESTED'::character varying, 'RESUBMITTED'::character varying, 'APPROVED'::character varying, 'APPROVED_WITH_RESTRICTIONS'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'EXECUTED'::character varying, 'ARCHIVED'::character varying])::text[])))
);

CREATE TABLE public.audit_logs (
    created_at timestamp(6) without time zone NOT NULL,
    empresa_id uuid NOT NULL,
    entity_id uuid,
    id uuid NOT NULL,
    user_id uuid,
    ip_address character varying(45),
    action character varying(100) NOT NULL,
    entity_type character varying(100),
    details text,
    user_email character varying(255) NOT NULL
);

CREATE TABLE public.certificados_acessorio (
    data_emissao date,
    data_validade date,
    criado_em timestamp(6) without time zone NOT NULL,
    acessorio_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    numero_certificado character varying(200) NOT NULL,
    emissor character varying(300),
    arquivo_url character varying(1000),
    observacoes text,
    status character varying(20) NOT NULL,
    CONSTRAINT certificados_acessorio_status_check CHECK (((status)::text = ANY ((ARRAY['VALIDO'::character varying, 'A_VENCER'::character varying, 'VENCIDO'::character varying, 'AUSENTE'::character varying])::text[])))
);

CREATE TABLE public.checklist_respostas (
    respondido boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    solicitacao_liberacao_id uuid NOT NULL,
    codigo_item character varying(20) NOT NULL,
    categoria_item character varying(200),
    pergunta_item text
);

CREATE TABLE public.empresas (
    ativo boolean,
    criado_em timestamp(6) without time zone NOT NULL,
    subscription_expires_at timestamp(6) without time zone,
    id uuid NOT NULL,
    cnpj character varying(255) NOT NULL,
    marca_dagua_relatorio character varying(255),
    razao_social character varying(255) NOT NULL,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    subscription_status character varying(20),
    CONSTRAINT empresas_subscription_status_check CHECK (((subscription_status)::text = ANY ((ARRAY['TRIALING'::character varying, 'ACTIVE'::character varying, 'PAST_DUE'::character varying, 'CANCELED'::character varying])::text[])))
);

CREATE TABLE public.funcionarios (
    accepted_privacy_policy boolean NOT NULL,
    accepted_terms boolean NOT NULL,
    ativo boolean NOT NULL,
    vencimento_aso date,
    vencimento_nr11 date,
    vencimento_nr35 date,
    consent_date timestamp(6) without time zone,
    criado_em timestamp(6) without time zone NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    chave_api character varying(255),
    email character varying(255) NOT NULL,
    nome character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    CONSTRAINT funcionarios_role_check CHECK (((role)::text = ANY ((ARRAY['SUPER_ADMIN'::character varying, 'SAFETY_ADMIN'::character varying, 'ADMIN_EMPRESA'::character varying, 'GERENTE_OPERACOES'::character varying, 'LIDER_EQUIPE'::character varying, 'RIGGER'::character varying, 'OPERADOR'::character varying, 'OPERADOR_GUINDASTE'::character varying])::text[])))
);

CREATE TABLE public.inspecoes_acessorio (
    data_inspecao date NOT NULL,
    proxima_inspecao date,
    criado_em timestamp(6) without time zone NOT NULL,
    acessorio_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    inspetor_id uuid,
    inspetor_nome character varying(200),
    fotos text,
    observacoes text,
    resultado character varying(30) NOT NULL,
    CONSTRAINT inspecoes_acessorio_resultado_check CHECK (((resultado)::text = ANY ((ARRAY['APROVADO'::character varying, 'APROVADO_COM_RESTRICAO'::character varying, 'REPROVADO'::character varying])::text[])))
);

CREATE TABLE public.operation_team_members (
    responsavel boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    empresa_id uuid NOT NULL,
    funcionario_id uuid NOT NULL,
    id uuid NOT NULL,
    solicitacao_liberacao_id uuid NOT NULL,
    funcao_operacional character varying(30) NOT NULL,
    observacao character varying(500),
    CONSTRAINT operation_team_members_funcao_operacional_check CHECK (((funcao_operacional)::text = ANY ((ARRAY['RIGGER'::character varying, 'OPERADOR_GUINDASTE'::character varying, 'SINALEIRO'::character varying, 'AMARRADOR'::character varying, 'SUPERVISOR'::character varying, 'TECNICO_SEGURANCA'::character varying, 'ENGENHEIRO'::character varying, 'OBSERVADOR'::character varying, 'OUTRO'::character varying])::text[])))
);

CREATE TABLE public.operational_alerts (
    acknowledged_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    acknowledged_by_id uuid,
    empresa_id uuid NOT NULL,
    entidade_id uuid,
    id uuid NOT NULL,
    severidade character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    entidade_tipo character varying(30),
    tipo character varying(40) NOT NULL,
    titulo character varying(200) NOT NULL,
    mensagem text,
    CONSTRAINT operational_alerts_severidade_check CHECK (((severidade)::text = ANY ((ARRAY['INFO'::character varying, 'WARNING'::character varying, 'RESTRICTED'::character varying, 'BLOCKED'::character varying])::text[]))),
    CONSTRAINT operational_alerts_status_check CHECK (((status)::text = ANY ((ARRAY['NOVO'::character varying, 'VISUALIZADO'::character varying, 'RESOLVIDO'::character varying, 'IGNORADO'::character varying])::text[]))),
    CONSTRAINT operational_alerts_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['CERTIFICADO_VENCIDO'::character varying, 'CERTIFICADO_A_VENCER'::character varying, 'INSPECAO_VENCIDA'::character varying, 'ACESSORIO_REPROVADO'::character varying, 'ASO_VENCIDO'::character varying, 'ASO_A_VENCER'::character varying, 'NR11_VENCIDA'::character varying, 'NR11_A_VENCER'::character varying, 'NR35_VENCIDA'::character varying, 'NR35_A_VENCER'::character varying, 'PLANO_BLOQUEADO'::character varying, 'PLANO_AGUARDANDO_APROVACAO'::character varying])::text[])))
);

CREATE TABLE public.processed_stripe_events (
    processed_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    stripe_event_id character varying(100) NOT NULL
);

CREATE TABLE public.rigging_plan_accessories (
    carga_aplicada_kg double precision,
    wll_kg_snapshot double precision,
    created_at timestamp(6) without time zone NOT NULL,
    acessorio_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    solicitacao_liberacao_id uuid NOT NULL,
    certificado_status_snapshot character varying(20),
    status_snapshot character varying(20),
    tipo_snapshot character varying(30),
    ultima_inspecao_resultado_snapshot character varying(30),
    codigo_interno_snapshot character varying(100) NOT NULL,
    descricao_snapshot character varying(500),
    observacao character varying(500)
);

CREATE TABLE public.rigging_plan_versions (
    version_number integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    created_by_id uuid,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    plan_id uuid NOT NULL,
    compliance_messages text,
    created_by_name character varying(255),
    snapshot_json text,
    technical_status character varying(20),
    CONSTRAINT rigging_plan_versions_technical_status_check CHECK (((technical_status)::text = ANY ((ARRAY['COMPLIANT'::character varying, 'WARNING'::character varying, 'RESTRICTED'::character varying, 'BLOCKED'::character varying])::text[])))
);

CREATE TABLE public.solicitacoes_liberacao (
    area_classificada boolean,
    cap_aparelho_kg double precision,
    cap_carga_kg double precision,
    cap_guindaste_kg double precision,
    cap_total_kg double precision,
    cap_uso_percent double precision,
    certificados_validados boolean,
    checklist_completo boolean,
    current_version integer NOT NULL,
    data_operacao date,
    dois_ou_mais_guindastes boolean,
    esl_angulo_aviso boolean,
    esl_angulo_graus double precision,
    esl_fator_carga double precision,
    esl_manilha_capacidade_kg double precision,
    esl_manilha_compativel boolean,
    esl_manilha_uso_percent double precision,
    esl_num_pernas integer,
    esl_tem_manilha boolean,
    esl_tensao_por_perna_kg double precision,
    esl_wll_kg double precision,
    esl_wll_uso_percent double precision,
    is_locked boolean NOT NULL,
    pressao_patolas_kpa double precision,
    rede_eletrica_validada boolean,
    resistencia_solo_kpa double precision,
    criado_em timestamp(6) without time zone NOT NULL,
    resolvido_em timestamp(6) without time zone,
    aprovado_por_id uuid,
    empresa_id uuid NOT NULL,
    id uuid NOT NULL,
    solicitado_por_id uuid NOT NULL,
    public_validation_token character varying(64),
    supervisor_nome character varying(200),
    local_operacao character varying(300),
    aprovado_por_nome character varying(255),
    cap_risco character varying(255),
    compliance_messages text,
    descricao_atividade text,
    empresa_nome character varying(255) NOT NULL,
    esl_risco character varying(255),
    observacao character varying(255),
    operacao_os character varying(255) NOT NULL,
    petrobras_data_json text,
    rigger_nome character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    technical_status character varying(20),
    workflow_status character varying(40),
    CONSTRAINT solicitacoes_liberacao_status_check CHECK (((status)::text = ANY ((ARRAY['ANALISAR'::character varying, 'PROSSEGUIR'::character varying, 'PARAR'::character varying])::text[]))),
    CONSTRAINT solicitacoes_liberacao_technical_status_check CHECK (((technical_status)::text = ANY ((ARRAY['COMPLIANT'::character varying, 'WARNING'::character varying, 'RESTRICTED'::character varying, 'BLOCKED'::character varying])::text[]))),
    CONSTRAINT solicitacoes_liberacao_workflow_status_check CHECK (((workflow_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'UNDER_REVIEW'::character varying, 'CHANGES_REQUESTED'::character varying, 'RESUBMITTED'::character varying, 'APPROVED'::character varying, 'APPROVED_WITH_RESTRICTIONS'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'EXECUTED'::character varying, 'ARCHIVED'::character varying])::text[])))
);

ALTER TABLE ONLY public.acessorios_icamento
    ADD CONSTRAINT acessorios_icamento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.approval_comments
    ADD CONSTRAINT approval_comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.approval_decisions
    ADD CONSTRAINT approval_decisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.certificados_acessorio
    ADD CONSTRAINT certificados_acessorio_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.checklist_respostas
    ADD CONSTRAINT checklist_respostas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_cnpj_key UNIQUE (cnpj);

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_chave_api_key UNIQUE (chave_api);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_email_key UNIQUE (email);

ALTER TABLE ONLY public.funcionarios
    ADD CONSTRAINT funcionarios_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inspecoes_acessorio
    ADD CONSTRAINT inspecoes_acessorio_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.operation_team_members
    ADD CONSTRAINT operation_team_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.operational_alerts
    ADD CONSTRAINT operational_alerts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.processed_stripe_events
    ADD CONSTRAINT processed_stripe_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rigging_plan_accessories
    ADD CONSTRAINT rigging_plan_accessories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rigging_plan_versions
    ADD CONSTRAINT rigging_plan_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.solicitacoes_liberacao
    ADD CONSTRAINT solicitacoes_liberacao_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.solicitacoes_liberacao
    ADD CONSTRAINT solicitacoes_liberacao_public_validation_token_key UNIQUE (public_validation_token);

ALTER TABLE ONLY public.acessorios_icamento
    ADD CONSTRAINT uk_acessorio_codigo_empresa UNIQUE (empresa_id, codigo_interno);

ALTER TABLE ONLY public.processed_stripe_events
    ADD CONSTRAINT uk_stripe_event_id UNIQUE (stripe_event_id);

CREATE INDEX idx_alert_empresa ON public.operational_alerts USING btree (empresa_id);

CREATE INDEX idx_alert_entidade ON public.operational_alerts USING btree (entidade_id);

CREATE INDEX idx_alert_status ON public.operational_alerts USING btree (status);

CREATE INDEX idx_alert_tipo ON public.operational_alerts USING btree (tipo);

CREATE INDEX idx_audit_empresa ON public.audit_logs USING btree (empresa_id);

CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_checklist_empresa ON public.checklist_respostas USING btree (empresa_id);

CREATE INDEX idx_checklist_solicitacao ON public.checklist_respostas USING btree (solicitacao_liberacao_id);

CREATE INDEX idx_comment_empresa ON public.approval_comments USING btree (empresa_id);

CREATE INDEX idx_comment_plan ON public.approval_comments USING btree (plan_id);

CREATE INDEX idx_decision_empresa ON public.approval_decisions USING btree (empresa_id);

CREATE INDEX idx_decision_plan ON public.approval_decisions USING btree (plan_id);

CREATE INDEX idx_plan_acc_acessorio ON public.rigging_plan_accessories USING btree (acessorio_id);

CREATE INDEX idx_plan_acc_empresa ON public.rigging_plan_accessories USING btree (empresa_id);

CREATE INDEX idx_plan_acc_solicitacao ON public.rigging_plan_accessories USING btree (solicitacao_liberacao_id);

CREATE INDEX idx_team_member_empresa ON public.operation_team_members USING btree (empresa_id);

CREATE INDEX idx_team_member_func ON public.operation_team_members USING btree (funcionario_id);

CREATE INDEX idx_team_member_plano ON public.operation_team_members USING btree (solicitacao_liberacao_id);

CREATE INDEX idx_version_empresa ON public.rigging_plan_versions USING btree (empresa_id);

CREATE INDEX idx_version_plan ON public.rigging_plan_versions USING btree (plan_id);

