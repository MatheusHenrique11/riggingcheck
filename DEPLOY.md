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
