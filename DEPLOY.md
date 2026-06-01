# RiggingCheck — Guia de Deploy em Produção

**Servidor**: Hostinger KVM 2 Ubuntu · IP: `2.25.151.136`  
**Domínio**: `riggingcheck.com`  
**Pasta de deploy**: `/app/risecode`  
**Stack**: Traefik v3 → Nginx (frontend) + Spring Boot JRE 21 (backend) → PostgreSQL 15 existente

---

## PRÉ-REQUISITO: Confirmar o ambiente PostgreSQL existente

Execute estes comandos **antes de qualquer ação** para confirmar que o PostgreSQL já está rodando:

```bash
# 1. Ver todos os containers em execução
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Saída esperada (nome do container pode variar):
# risecode_postgres   postgres:15   Up X hours   0.0.0.0:5432->5432/tcp

# 2. Confirmar a rede Docker do PostgreSQL
docker inspect risecode_postgres \
  -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}'

# Saída esperada:
# risecode_default

# 3. Confirmar banco e usuário
docker exec risecode_postgres psql -U riggingcheck -c "\l"

# 4. Listar redes e volumes (não apagar nada)
docker network ls
docker volume ls
```

> **Se o nome do container ou da rede for diferente**, ajuste `POSTGRES_CONTAINER` e `POSTGRES_NETWORK` no `.env.production` antes de continuar.

---

## 1. Apontar DNS

No painel do seu registrador de domínio (antes de subir o Traefik):

| Tipo | Nome | Valor          | TTL  |
|------|------|----------------|------|
| A    | @    | 2.25.151.136   | 3600 |
| A    | www  | 2.25.151.136   | 3600 |

> Aguarde a propagação (até 1h). Verifique com: `dig riggingcheck.com +short`

---

## 2. Instalar dependências na VPS (primeira vez)

```bash
# Docker Engine + Compose Plugin
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git

# Confirmar versões
docker --version          # >= 25.0
docker compose version    # >= 2.24
```

---

## 3. Clonar o repositório

```bash
mkdir -p /app/risecode
cd /app/risecode
git clone <URL_DO_REPOSITORIO> .
```

---

## 4. Configurar variáveis de ambiente

```bash
cp .env.production.example .env.production
nano .env.production
```

**Campos obrigatórios a preencher:**

```bash
# Senha do PostgreSQL existente
SPRING_DATASOURCE_PASSWORD=<senha_do_postgres>

# JWT — gere com: openssl rand -hex 32
JWT_SECRET=$(openssl rand -hex 32)
# Cole o valor gerado acima em JWT_SECRET= no arquivo

# SMTP
SPRING_MAIL_USERNAME=seu-email@gmail.com
SPRING_MAIL_PASSWORD=sua-app-password

# Let's Encrypt
LETSENCRYPT_EMAIL=seu-email@riggingcheck.com
```

> **Atenção**: `VITE_API_URL` deve ser `https://riggingcheck.com/api` (com `/api` no final).

---

## 5. Configurar o e-mail do Let's Encrypt no Traefik

O arquivo `traefik/traefik.yml` usa a variável `${LETSENCRYPT_EMAIL}` que é resolvida pelo Traefik via variável de ambiente do container (passada em `docker-compose.prod.yml`).

Confirme que `LETSENCRYPT_EMAIL` está preenchido no `.env.production`.

---

## 6. Criar diretório e arquivo de certificados TLS

```bash
mkdir -p /app/risecode/letsencrypt
touch /app/risecode/letsencrypt/acme.json
chmod 600 /app/risecode/letsencrypt/acme.json
```

> **Crítico**: o Traefik não sobe se `acme.json` não tiver permissão 600.

---

## 7. Backup antes do primeiro deploy

```bash
cd /app/risecode
chmod +x backup.sh

# Gera backup do banco existente
./backup.sh

# Confirma que o arquivo foi gerado
ls -lh backups/
```

---

## 8. Build e deploy

```bash
cd /app/risecode

# Build das imagens (5–15 min no primeiro build; cache nas próximas vezes)
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Subir todos os serviços em background
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
```

---

## 9. Verificar funcionamento

```bash
# Ver logs de todos os serviços em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Logs individuais
docker compose -f docker-compose.prod.yml logs backend  -f --tail=50
docker compose -f docker-compose.prod.yml logs frontend -f --tail=50
docker compose -f docker-compose.prod.yml logs traefik  -f --tail=50

# Testar HTTPS
curl -I https://riggingcheck.com
curl -I https://riggingcheck.com/api/auth/login

# Testar redirect HTTP → HTTPS (deve retornar 301)
curl -I http://riggingcheck.com

# Testar conectividade backend → PostgreSQL
docker exec riggingcheck_backend \
  nc -zv risecode_postgres 5432 && echo "Postgres: OK"
```

---

## 10. Backup agendado (cron)

```bash
crontab -e
```

Adicione:
```cron
# Backup diário às 02:00
0 2 * * * cd /app/risecode && ./backup.sh >> /app/risecode/backups/backup.log 2>&1
```

---

## Atualização (nova versão)

```bash
cd /app/risecode

# 1. Backup de segurança
./backup.sh

# 2. Puxar código novo
git pull origin master

# 3. Rebuild e restart dos serviços atualizados (sem derrubar Postgres)
docker compose -f docker-compose.prod.yml --env-file .env.production \
  build backend frontend

docker compose -f docker-compose.prod.yml --env-file .env.production \
  up -d --no-deps backend frontend

# 4. Verificar
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail=30
```

---

## Correção do Traefik — Docker Provider (FASE 21.5)

> Execute esta seção se o Traefik logar `client version 1.24 is too old` ou se `acme.json` permanecer vazio.

### Causa 1 — Docker API version incompatível

O Docker Engine da VPS descartou suporte à API ≤ 1.24. O cliente Go interno do Traefik
usa 1.24 por padrão quando herda o ambiente do host. A variável `DOCKER_API_VERSION=1.44`
no serviço `traefik` do compose força o cliente a usar a versão correta.

```bash
# Confirmar a versão de API suportada pelo Docker Engine da VPS
docker version --format 'Server API version: {{.Server.APIVersion}}'

# Se for diferente de 1.44, ajustar o DOCKER_API_VERSION no docker-compose.prod.yml
# para corresponder exatamente à versão reportada acima.
```

### Causa 2 — httpChallenge conflita com redirect HTTP→HTTPS global

O `httpChallenge` (HTTP-01) exige que o Let's Encrypt acesse
`http://api.riggingcheck.com/.well-known/acme-challenge/TOKEN` via porta 80.
Como o entrypoint `web` redireciona TUDO para HTTPS, o desafio nunca é respondido
e `acme.json` fica vazio. A correção foi trocar para `tlsChallenge` (TLS-ALPN-01,
porta 443) que não depende de HTTP.

### Comandos para aplicar a correção

```bash
# 1. Garantir que o acme.json existe com permissão correta
touch /app/risecode/letsencrypt/acme.json
chmod 600 /app/risecode/letsencrypt/acme.json
ls -la /app/risecode/letsencrypt/acme.json   # deve mostrar -rw-------

# 2. Parar e remover o container atual do Traefik
docker rm -f riggingcheck_traefik

# 3. Puxar a versão mais recente do código (com as correções)
cd /app/risecode
git pull origin master

# 4. Recriar apenas o Traefik (sem derrubar o backend)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d traefik

# 5. Aguardar ~10 segundos e verificar os logs
sleep 10
docker logs riggingcheck_traefik --tail=150
```

**Saída esperada nos logs após a correção:**
```
time="..." level=info msg="Configuration loaded from file: /etc/traefik/traefik.yml"
time="..." level=info msg="Provider connection established with docker daemon"
time="..." level=info msg="...Obtained certificate for domains ['api.riggingcheck.com']"
```

**Se ainda aparecer erro de API version:**
```bash
# Ver a API exata do daemon
docker version --format '{{.Server.APIVersion}}'
# Editar o docker-compose.prod.yml e ajustar DOCKER_API_VERSION para o valor acima
nano /app/risecode/docker-compose.prod.yml
docker rm -f riggingcheck_traefik
docker compose -f docker-compose.prod.yml --env-file .env.production up -d traefik
```

### Testes de validação pós-correção

```bash
# 1. Traefik enxerga o backend (deve listar routers)
docker exec riggingcheck_traefik traefik version

# 2. Testar HTTPS — deve retornar 200 ou 401 (não 404 do Traefik)
curl -k https://api.riggingcheck.com/actuator/health
# Esperado: {"status":"UP"} ou {"timestamp":...,"status":401,...}

# 3. Certificado emitido pelo Let's Encrypt (não autoassinado)
curl -v --head https://api.riggingcheck.com/api/auth/login 2>&1 \
  | grep -E "issuer|subject|expire"

# 4. Verificar que acme.json foi preenchido (> 2 bytes)
wc -c /app/risecode/letsencrypt/acme.json
# Esperado: > 1000 bytes após emissão do certificado

# 5. Redirect HTTP → HTTPS funcionando
curl -I http://api.riggingcheck.com
# Esperado: HTTP/1.1 301 Moved Permanently  +  Location: https://...

# 6. Endpoint de saúde do backend
curl -sk https://api.riggingcheck.com/actuator/health | python3 -m json.tool
```

---

## Checklist de Rollback

Execute na ordem em caso de falha pós-deploy:

```bash
# 1. Identificar o erro
docker compose -f docker-compose.prod.yml logs --tail=100

# 2. Parar apenas backend e frontend (Traefik e Postgres ficam no ar)
docker compose -f docker-compose.prod.yml stop backend frontend

# 3. Voltar para o commit anterior
cd /app/risecode
git log --oneline -10
git checkout <HASH_DO_COMMIT_ANTERIOR>

# 4. Rebuild com a versão anterior
docker compose -f docker-compose.prod.yml --env-file .env.production \
  build backend frontend
docker compose -f docker-compose.prod.yml --env-file .env.production \
  up -d --no-deps backend frontend

# 5. Se o banco ficou inconsistente, restaurar o último backup
./backup.sh restore backups/riggingcheck_YYYYMMDD_HHMMSS.sql
```

> **NUNCA execute `docker compose down -v`** — remove os volumes do PostgreSQL.

---

## Checklist pós-deploy

- [ ] `docker compose -f docker-compose.prod.yml ps` — todos os containers `Up`
- [ ] `curl -I https://riggingcheck.com` — responde `200 OK`
- [ ] `curl -I http://riggingcheck.com` — responde `301 Moved Permanently` (redirect HTTPS)
- [ ] `curl -I https://riggingcheck.com/api/auth/login` — responde `405 Method Not Allowed` (esperado via GET)
- [ ] Login no frontend funciona em `https://riggingcheck.com`
- [ ] `/public/planos/<token>` abre a página de validação pública
- [ ] Certificado TLS válido no browser (cadeado verde)
- [ ] Backup agendado no cron (`crontab -l`)
- [ ] Arquivo `letsencrypt/acme.json` tem permissão 600 (`ls -la letsencrypt/`)
- [ ] Arquivo `.env.production` **não** commitado no git (`git status`)

---

## Estrutura de arquivos de deploy

```
/app/risecode/
├── docker-compose.prod.yml         ← orquestração (commitar)
├── .env.production                 ← variáveis reais (NUNCA commitar)
├── .env.production.example         ← modelo (commitar)
├── backup.sh                       ← script de backup/restore (commitar)
├── backups/                        ← dumps gerados (criado pelo backup.sh, .gitignore)
├── letsencrypt/
│   └── acme.json                   ← certificados TLS Traefik (chmod 600, .gitignore)
├── traefik/
│   └── traefik.yml                 ← config estática Traefik (commitar)
├── backend/
│   └── riggingcheck-api/
│       ├── Dockerfile              ← multi-stage JDK 21
│       └── src/main/resources/
│           └── application-prod.yml
└── frontend/
    ├── Dockerfile                  ← Node 22 + Nginx
    └── nginx.conf
```

---

## Portas e exposição de serviços

| Serviço         | Porta interna | Porta pública | Diretamente exposta? |
|-----------------|--------------|---------------|----------------------|
| Traefik (HTTP)  | 80           | 80            | Sim — entry point    |
| Traefik (HTTPS) | 443          | 443           | Sim — entry point    |
| Backend         | 8080         | —             | Não (via Traefik)    |
| Frontend        | 80           | —             | Não (via Traefik)    |
| PostgreSQL      | 5432         | —             | Não (rede Docker)    |

---

## Comandos úteis no dia a dia

```bash
# Reiniciar um serviço
docker compose -f docker-compose.prod.yml restart backend

# Ver consumo de recursos
docker stats --no-stream

# Entrar no container do backend (diagnóstico)
docker exec -it riggingcheck_backend sh

# Ver variáveis de ambiente do backend
docker exec riggingcheck_backend env | grep -v PASSWORD | grep -v SECRET

# Verificar conectividade backend → Postgres
docker exec riggingcheck_backend nc -zv risecode_postgres 5432

# Forçar renovação do certificado TLS (caso expire)
docker compose -f docker-compose.prod.yml restart traefik
```
