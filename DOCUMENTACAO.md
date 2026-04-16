# RiggingCheck — Documentação do Sistema

**Versão:** 2.1.0
**Plataforma:** Web (PWA) + API REST
**Tecnologias:** React 19 · Spring Boot 4 · PostgreSQL

---

## O que é o RiggingCheck?

RiggingCheck é uma plataforma digital de **planejamento e controle de segurança em operações de içamento de cargas**. O sistema reúne, em um único lugar, as ferramentas de cálculo técnico, checklist de campo, fluxo de autorização de operações e gestão de equipes — tudo em conformidade com as normas brasileiras vigentes.

O sistema foi desenvolvido para eliminar planilhas manuais e formulários em papel, reduzindo erros humanos e garantindo rastreabilidade de cada içamento realizado.

**Normas atendidas:**
- NR-11 — Segurança em Transporte, Movimentação, Armazenagem e Manuseio de Materiais
- ABNT NBR 13541 — Movimentação de cargas: Eslingas de aço
- ABNT NBR 6120 — Ações para cálculo de estruturas (densidades)
- ISO 4308-1 — Guindastes e equipamentos de içamento
- N-2869 (Petrobras) — Procedimentos de içamento crítico

---

## Público-Alvo

O RiggingCheck é indicado para **empresas do setor industrial, petroquímico, construção civil pesada, montagem industrial, portos e estaleiros** que executem operações de içamento de cargas com guindastes, talhas ou pontes rolantes.

| Perfil | Indicação |
|--------|-----------|
| Empresas com equipe de içamento própria | Gestão completa de operações e equipe |
| Construtoras e montageiras | Controle de içamentos em obras |
| Empresas petroquímicas e refinarias | Conformidade com N-2869 (Petrobras) |
| Prestadoras de serviço de içamento | Documentação e rastreabilidade por OS |
| Gestores de QSMS | Auditoria, KPIs e histórico de autorizações |

---

## Perfis de Usuário e Permissões

O sistema possui **7 perfis**, cada um com acesso restrito ao que é relevante para sua função.

### SUPER_ADMIN — Administrador da Plataforma

Perfil exclusivo da equipe RiggingCheck (SaaS). Gerencia todas as empresas cadastradas na plataforma.

**O que pode fazer:**
- Cadastrar, ativar e desativar empresas clientes
- Visualizar e gerenciar funcionários de qualquer empresa
- Gerar e revogar chaves de API para integrações
- Visualizar estatísticas globais da plataforma (total de empresas, funcionários, solicitações)

---

### ADMIN_EMPRESA — Administrador da Empresa

Responsável pela gestão operacional e administrativa dentro da empresa. Normalmente ocupado pelo coordenador de QSMS, supervisor de segurança ou gerente de operações.

**O que pode fazer:**
- Cadastrar e gerenciar funcionários (criar, editar, ativar/desativar)
- Atribuir perfis a cada funcionário
- Analisar e responder solicitações de liberação de içamento
- Adicionar observações técnicas ao aprovar ou negar uma operação

---

### GERENTE_OPERACOES — Gerente de Operações

Perfil voltado para acompanhamento estratégico. Não opera diretamente nas solicitações, mas visualiza indicadores.

**O que pode fazer:**
- Visualizar painel analítico com indicadores de operações
- Acompanhar taxa de aprovação de içamentos
- Monitorar volume de solicitações por status (em análise, aprovadas, negadas)
- Verificar membros ativos da equipe

---

### LIDER_EQUIPE — Líder de Equipe / Encarregado

Responsável direto pela equipe em campo. Analisa e responde às solicitações de liberação enviadas pelos Riggers.

**O que pode fazer:**
- Receber e analisar solicitações de içamento da equipe
- Aprovar (Prosseguir), negar (Parar) ou manter em análise as solicitações
- Filtrar solicitações por status: Em Análise, Prosseguir, Parar, Todas
- Adicionar observações técnicas a cada decisão

---

### RIGGER — Técnico de Içamento

Profissional habilitado em içamento que planeja e executa as operações. Principal usuário das ferramentas de cálculo.

**O que pode fazer:**
- Usar todas as ferramentas de cálculo (guindaste, lingada, checklist)
- Gerar o relatório PDF da operação
- Enviar solicitação de liberação de içamento via Ordem de Serviço (OS)
- Acompanhar o status da solicitação em tempo real
- Alterar própria senha

---

### OPERADOR — Operador de Equipamento

Profissional que opera equipamentos auxiliares. Acesso às ferramentas de cálculo sem fluxo de liberação.

**O que pode fazer:**
- Usar as ferramentas de cálculo e checklist
- Visualizar resultados de planejamento
- Alterar própria senha

---

### OPERADOR_GUINDASTE — Operador de Guindaste

Especializado na operação de guindastes. Acesso às ferramentas de cálculo e planejamento.

**O que pode fazer:**
- Usar as ferramentas de cálculo e checklist
- Consultar taxa de utilização e capacidades do equipamento
- Alterar própria senha

---

## Módulos e Funcionalidades

### Aba 1 — Guindaste & Carga

Ferramentas para calcular o peso total da operação, estimar volumes de peças e verificar a capacidade do guindaste.

---

#### 1.1 Carga Bruta

**Para que serve:** Calcular o peso total que o guindaste deverá suportar, somando todos os componentes do içamento.

**Entradas:**
| Campo | Descrição |
|-------|-----------|
| Carga líquida (kg) | Peso da peça a ser içada |
| Peso das eslingas (kg) | Soma do peso de todas as eslingas utilizadas |
| Peso das manilhas (kg) | Soma do peso de todas as manilhas |
| Peso dos dispositivos (kg) | Spreader bars, ganchos especiais, etc. |

**Saída:** Carga bruta total em kg.

**Alerta N-2869:** Quando a carga bruta total for **≥ 20 toneladas**, o sistema exibe alerta de **Içamento Crítico**, indicando que a operação requer Rigger Nível 3 e plano de içamento aprovado.

---

#### 2 — Taxa de Utilização do Guindaste

**Para que serve:** Verificar se o guindaste está operando dentro dos limites de segurança para a carga planejada.

**Entradas:**
| Campo | Descrição |
|-------|-----------|
| Capacidade do guindaste (kg) | Capacidade nominal para o raio de operação (extraída da tabela de carga do equipamento) |
| Carga total (kg) | Pode ser preenchido manualmente ou importado do resultado da seção 1.1 |

**Cálculo:** Taxa = (Carga Total ÷ Capacidade) × 100

**Faixas de risco:**
| Faixa | Status | Significado |
|-------|--------|-------------|
| < 70% | SEGURO | Margem de segurança adequada — operação autorizada |
| 70% a 89% | ATENÇÃO | Próximo do limite — monitorar e confirmar dados |
| ≥ 90% | REPROVADO | Risco crítico — operação não autorizada |

**Saída:** Percentual de utilização, status, margem disponível e barra de progresso visual.

> Esta lógica espelha exatamente o backend (`RiskCalculator.java`) e o padrão ABNT NBR 11900 / NR-11.

---

#### 1.2 / 1.3 — Volume e Peso por Geometria

**Para que serve:** Estimar o peso de peças quando não há acesso a balança ou ficha técnica, calculando pelo volume geométrico e densidade do material.

**Formas disponíveis:** Paralelepípedo · Cilindro · Pirâmide · Cubo · Cunha

**Materiais disponíveis (ABNT NBR 6120):**

| Material | Peso Específico |
|----------|----------------|
| Aço | 7.850 kg/m³ |
| Alumínio | 2.800 kg/m³ |
| Bronze | 8.500 kg/m³ |
| Chumbo | 11.400 kg/m³ |
| Cobre | 8.900 kg/m³ |
| Ferro fundido | 7.250 kg/m³ |
| Concreto simples | 2.400 kg/m³ |
| Concreto armado | 2.500 kg/m³ |
| Granito | 2.800 kg/m³ |
| Mármore | 2.800 kg/m³ |
| Madeira pinho/cedro | 500 kg/m³ |
| Borracha | 1.700 kg/m³ |
| Vidro plano | 2.600 kg/m³ |

**Saída:** Volume em m³ e peso estimado em kg.

---

#### 4 — SWL / Fator de Segurança

**Para que serve:** Calcular a Carga de Trabalho Segura (SWL) de um componente com base em sua Carga de Ruptura Mínima (CRM) e verificar se a força aplicada está dentro do limite.

**Entradas:**
| Campo | Descrição |
|-------|-----------|
| CRM — Carga de Ruptura Mínima (kg) | Informado no certificado do componente |
| Tipo de aplicação | Define o Fator de Segurança mínimo aplicável |
| Força exercida (kg) | Carga efetivamente aplicada ao componente |

**Fatores de Segurança mínimos (NR-11 / ABNT NBR 13541):**

| Tipo de Equipamento | FS Mínimo |
|--------------------|-----------|
| Cabos e cordoalhas estáticos | 3 |
| Cabos para tração horizontal | 4 |
| Guindastes, guindastes e escavadeiras | 5 |
| Pontes rolantes | 6 |
| Guindaste estacionário | 6 |
| Laços | 5 |
| Talhas elétricas | 7 |
| Elevador de obra | 8 |
| Elevador de passageiros | 12 |

**Cálculo:** SWL = CRM ÷ FS mínimo. Utilização = (Força ÷ SWL) × 100.

**Faixas de alerta:** ≤ 80% Seguro · 80–100% Atenção · > 100% Reprovado.

---

### Aba 2 — Lingada & Carga

Ferramentas para dimensionar as eslingas, calcular o centro de gravidade da peça e verificar conformidade com a N-2869 da Petrobras.

---

#### 2 — Centro de Gravidade

**Para que serve:** Determinar a posição do centro de gravidade de uma peça com dois pontos de apoio conhecidos, identificando desequilíbrio e posicionamento correto dos ganchos.

**Entradas:**
| Campo | Descrição |
|-------|-----------|
| Peso P1 (kg) | Carga no ponto de apoio 1 (medido em balança ou calculado) |
| Peso P2 (kg) | Carga no ponto de apoio 2 |
| Distância total entre pontos (m) | Distância entre os dois pontos de içamento |

**Cálculo:**
- D1 = (P2 ÷ (P1+P2)) × Dt — distância do CG ao ponto 1
- D2 = Dt − D1 — distância do CG ao ponto 2
- Desequilíbrio (%) = |P1−P2| ÷ (P1+P2) × 100

**Alerta:** Desequilíbrio > 30% gera status **ATENÇÃO** — risco de tombamento durante o içamento.

---

#### 3 — Tensão nas Eslingas

**Para que serve:** Calcular a tensão em cada perna da eslinga com base na carga, número de pernas e ângulo de abertura, verificando se a eslinga suporta a operação.

**Entradas:**
| Campo | Descrição |
|-------|-----------|
| Carga total (kg) | Peso total a ser içado |
| Número de pernas | 1, 2, 3 ou 4 eslingas |
| Ângulo de abertura (°) | Ângulo entre a eslinga e a vertical (30° a 90°) |
| Tipo de eslinga | Cabo de aço (FS 5:1) ou Cinta têxtil (FS 7:1) |
| WLL da eslinga (kg) | Carga de Trabalho da eslinga informada no certificado/etiqueta (opcional) |

**Cálculo:**
- Multiplicador de ângulo = 1 ÷ sin(ângulo)
- Tensão por perna = (Carga Total ÷ N° de pernas) × Multiplicador

**Multiplicadores de referência:**
| Ângulo | Multiplicador |
|--------|--------------|
| 90° | 1,000 (ideal) |
| 75° | 1,035 |
| 60° | 1,155 |
| 45° | 1,414 |
| 30° | 2,000 |

**Comportamento do WLL:**
- **Com WLL informado:** A utilização é calculada diretamente pela carga de trabalho real da eslinga (resultado preciso).
- **Sem WLL:** A utilização é estimada pelo SWL mínimo calculado pelo fator de segurança da norma (resultado conservador).

**Alertas críticos:**
- Ângulo < 45°: **ATENÇÃO** — zona de risco elevado. Verificar comprimentos e afastamento dos ganchos.
- Ângulo < 30°: **PARADA DE TRABALHO** — operação proibida pela norma. O cálculo é bloqueado.

---

#### N-2869 — Validações Petrobras

**Para que serve:** Classificar o içamento como Normal ou Crítico conforme o padrão Petrobras e verificar se todos os requisitos da norma estão atendidos.

**Entradas:**
| Campo | Descrição |
|-------|-----------|
| Velocidade do vento (km/h) | Medição em campo no momento da operação |
| Taxa de utilização do guindaste (%) | Calculada na aba Guindaste |
| Dois guindastes | Operação em tandem (aumenta criticidade) |
| Sobre instalações | Içamento sobre áreas habitadas ou equipamentos |
| Área classificada | Presença de atmosfera inflamável |

**Classificação automática:**
- **Içamento Normal:** carga < 20t E não há condições críticas → Limite de utilização: **85%**
- **Içamento Crítico:** carga ≥ 20t OU condições especiais → Limite de utilização: **75%** + Rigger Nível 3 obrigatório

**Regra do vento:** Velocidade ≥ 45 km/h = **OPERAÇÃO PROIBIDA** (status REPROVADO automático).

---

### Aba 3 — Checklist de Campo

**Para que serve:** Garantir que todas as condições de segurança foram verificadas antes do início da operação, com registro formal da conferência.

O checklist é organizado em **6 categorias com 26 itens** no total:

#### Categoria 1 — Guindastes & Solo (4 itens)
| Item | O que verifica |
|------|----------------|
| Estabilidade e nivelamento do guindaste | Pinos, travas e nivelamento do conjunto |
| Laudo de compactação do solo | Documento técnico de resistência do terreno |
| Cálculo de patolamento | Pressão exercida sobre o solo pelas sapatas/estabilizadores |
| Dimensionamento das pranchas | Placas de distribuição de carga no solo |

> **Subcálculo de Patolamento:** O checklist integra um calculador inline onde o operador informa o peso total do conjunto (carga + guindaste) e a área de apoio, obtendo a pressão exercida no solo comparada à resistência informada do terreno.

#### Categoria 2 — Equipamentos (3 itens)
| Item | O que verifica |
|------|----------------|
| Condições gerais do guindaste | Inspeção visual do equipamento |
| Moitão, bloqueio e cabos | Estado de cabos, ganchos e polias |
| Tabela de carga disponível e verificada | Certificado de carga pelo raio de operação real |

#### Categoria 3 — Acessórios de Içamento (4 itens)
| Item | O que verifica |
|------|----------------|
| Estado das eslingas | Ausência de fios rompidos, cortes, amassados |
| Certificados e etiquetas (validade 12 meses) | Validade dos documentos dos acessórios |
| Eslingas sem pintura | Pintura pode ocultar fissuras e falhas |
| Relação D/d das eslingas | Proporção entre diâmetro do gancho e da eslinga |

#### Categoria 4 — Pessoal & Comunicação (4 itens)
| Item | O que verifica |
|------|----------------|
| Operador com experiência comprovada | Habilitação e experiência do operador de guindaste |
| Sinaleiro com experiência comprovada | Habilitação do responsável pela sinalização |
| Supervisão presente durante a operação | Presença do responsável técnico em campo |
| Rádios testados entre guindaste e sinaleiro | Comunicação operacional verificada |

#### Categoria 5 — Ambiente (4 itens)
| Item | O que verifica |
|------|----------------|
| Vento < 45 km/h | Limite máximo de vento para içamento |
| Subsolo verificado (tubulações e cabos) | Ausência de interferências subterrâneas |
| Rede elétrica: distância segura | Afastamento mínimo de linhas energizadas |
| Linha de fogo: área isolada e sinalizada | Exclusão de pessoas da zona de queda |

#### Categoria 6 — N-2869 — Petrobras (6 itens)
| Item | O que verifica |
|------|----------------|
| Plano de içamento aprovado | Documento técnico aprovado antes da operação |
| APR assinada por todos os envolvidos | Análise Preliminar de Risco com assinaturas |
| Zona de exclusão estabelecida | Área demarcada e isolada abaixo e entorno da carga |
| Rigger Nível 3 designado (içamento crítico) | Habilitação técnica do responsável pelo içamento crítico |
| Certificados de calibração dos equipamentos | Validade dos certificados de medição |
| Plano de contingência discutido | Procedimento de emergência comunicado a todos |

**Barra de progresso:** O checklist exibe em tempo real o percentual de itens verificados. Itens pendentes ficam destacados para orientar o conferente.

---

### Geração de Relatório PDF

**Para que serve:** Gerar documentação formal da operação de içamento planejada, com todos os cálculos e dados do checklist em um único documento para arquivo e auditoria.

**O relatório inclui:**
- Cabeçalho com nome do supervisor responsável e data/hora
- Resultados de todos os cálculos realizados (carga bruta, utilização do guindaste, tensão das eslingas, centro de gravidade, SWL)
- Status de risco de cada cálculo (Seguro / Atenção / Reprovado)
- Resumo do checklist de campo
- Referências normativas aplicadas (NR-11, ABNT NBR 13541, N-2869)

O relatório é gerado em formato imprimível, adequado para ser assinado fisicamente e arquivado junto à documentação da OS.

---

## Fluxo de Autorização de Içamento

O sistema possui um fluxo de liberação que garante que nenhuma operação seja executada sem a validação de um responsável habilitado.

```
RIGGER                    LIDER / ADMIN              RIGGER
  |                            |                        |
  | Preenche OS e cálculos     |                        |
  | Envia solicitação -------> |                        |
  |                            | Analisa dados          |
  |                            | Adiciona observação    |
  |                            | Aprova ou Nega         |
  |                            | ---------------------->|
  |                            |                 Recebe resposta
  |                            |                 Status: PROSSEGUIR
  |                            |                 ou PARAR
```

**Status possíveis:**

| Status | Significado | Ação do Rigger |
|--------|-------------|----------------|
| ANALISAR | Solicitação recebida, aguardando análise | Aguardar |
| PROSSEGUIR | Operação aprovada | Pode iniciar o içamento |
| PARAR | Operação negada | Rever planejamento e reenviar |

---

## Instalação e Configuração

### Variáveis de Ambiente (Backend)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `JWT_SECRET` | Chave secreta para geração de tokens JWT (mínimo 32 bytes) | Sim |
| `JWT_EXPIRATION_MS` | Tempo de expiração do token em milissegundos (ex: 86400000 = 24h) | Sim |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas pelo CORS (ex: https://app.riggingcheck.com) | Sim |
| `SPRING_DATASOURCE_URL` | URL de conexão com o banco PostgreSQL | Sim |
| `SPRING_DATASOURCE_USERNAME` | Usuário do banco | Sim |
| `SPRING_DATASOURCE_PASSWORD` | Senha do banco | Sim |

### Variáveis de Ambiente (Frontend)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API backend (ex: https://api.riggingcheck.com) |

### Primeiro Acesso

1. Faça o deploy da API e do frontend
2. Acesse `POST /api/auth/setup` **uma única vez** para criar o primeiro SUPER_ADMIN
3. O endpoint `/api/auth/setup` retorna erro 400 em todas as chamadas subsequentes (proteção automática)
4. Com o SUPER_ADMIN criado, acesse o painel para cadastrar as empresas clientes
5. Cada empresa recebe um ADMIN_EMPRESA que gerencia sua própria equipe

---

## Testes

### Frontend
```bash
cd frontend
npm test
```
Cobertura: 70 testes unitários — `calculations.js` e `api.js`

### Backend
```bash
cd backend/riggingcheck-api
./mvnw test
```
Cobertura: 88 testes — camada de serviço, controllers (integração com H2), JWT e segurança

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Içamento** | Operação de elevação de cargas com equipamento de guindar |
| **Rigger** | Profissional habilitado no planejamento e execução de içamentos |
| **Eslinga / Lingada** | Conjunto de cabos ou cintas que envolvem a carga para içamento |
| **CRM** | Carga de Ruptura Mínima — força máxima que rompe o componente |
| **SWL** | Safe Working Load — Carga de Trabalho Segura = CRM ÷ Fator de Segurança |
| **WLL** | Working Load Limit — Carga de Trabalho máxima (informada na etiqueta/certificado) |
| **FS** | Fator de Segurança — relação entre a resistência e a carga de trabalho |
| **Patolamento** | Pressão exercida pelas sapatas ou estabilizadores do guindaste no solo |
| **APR** | Análise Preliminar de Risco — documento de identificação de riscos |
| **OS** | Ordem de Serviço — documento que formaliza a operação planejada |
| **N-2869** | Norma Petrobras para içamento crítico (carga ≥ 20t ou condições especiais) |
| **Içamento Crítico** | Içamento que exige plano aprovado, Rigger Nível 3 e APR específica |
| **Linha de Fogo** | Área de risco de queda da carga que deve estar isolada e sinalizada |
| **Tandem** | Operação de içamento com dois guindastes simultaneamente |
