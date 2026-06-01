#!/usr/bin/env bash
# backup.sh — pg_dump do PostgreSQL existente via container Docker
#
# Uso:
#   ./backup.sh                          → gera backup com timestamp
#   ./backup.sh restore backup_file.sql  → restaura de um arquivo existente
#
# Variáveis de ambiente (todas opcionais, têm default):
#   POSTGRES_CONTAINER  — nome do container Docker do PostgreSQL
#   POSTGRES_DB         — nome do banco de dados
#   POSTGRES_USER       — usuário do banco
#   BACKUP_DIR          — diretório onde os backups serão salvos
#   RETENTION_DAYS      — quantos dias de backup manter (padrão: 7)

set -euo pipefail

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-risecode_postgres}"
POSTGRES_DB="${POSTGRES_DB:-riggingcheck}"
POSTGRES_USER="${POSTGRES_USER:-${SPRING_DATASOURCE_USERNAME:-riggingcheck}}"
BACKUP_DIR="${BACKUP_DIR:-/app/risecode/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# ── Verificar se o container existe e está rodando ───────────────────────────
if ! docker ps --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
  echo "ERRO: Container '${POSTGRES_CONTAINER}' não encontrado ou não está rodando." >&2
  echo "Containers ativos:" >&2
  docker ps --format "  {{.Names}}\t{{.Image}}" >&2
  echo "" >&2
  echo "Defina POSTGRES_CONTAINER=nome_correto e tente novamente." >&2
  exit 1
fi

echo "Container PostgreSQL : ${POSTGRES_CONTAINER}"
echo "Database             : ${POSTGRES_DB}"
echo "Usuário              : ${POSTGRES_USER}"
echo "Diretório de backup  : ${BACKUP_DIR}"
echo "Retenção             : ${RETENTION_DAYS} dias"
echo ""

# ── Backup ───────────────────────────────────────────────────────────────────
if [[ "${1:-}" != "restore" ]]; then
  mkdir -p "${BACKUP_DIR}"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="${BACKUP_DIR}/riggingcheck_${TIMESTAMP}.sql"

  echo "Iniciando pg_dump → ${BACKUP_FILE}"
  docker exec "${POSTGRES_CONTAINER}" \
    pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-acl \
    > "${BACKUP_FILE}"

  SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
  LINES=$(wc -l < "${BACKUP_FILE}")
  echo "Backup concluído: ${SIZE} / ${LINES} linhas"

  # Verificação básica de integridade
  if ! grep -qE "CREATE TABLE|CREATE SEQUENCE|INSERT INTO|PostgreSQL database dump" "${BACKUP_FILE}" 2>/dev/null; then
    echo "AVISO: o dump pode estar vazio ou corrompido. Verifique ${BACKUP_FILE}" >&2
  fi

  # Remover backups mais antigos que RETENTION_DAYS dias
  find "${BACKUP_DIR}" -name "riggingcheck_*.sql" -mtime "+${RETENTION_DAYS}" -delete
  echo ""
  echo "Backups retidos (últimos ${RETENTION_DAYS} dias):"
  ls -lh "${BACKUP_DIR}"/*.sql 2>/dev/null || echo "  (nenhum arquivo encontrado)"
fi

# ── Restore ──────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "restore" ]]; then
  RESTORE_FILE="${2:-}"
  if [[ -z "${RESTORE_FILE}" || ! -f "${RESTORE_FILE}" ]]; then
    echo "Uso: $0 restore /caminho/completo/para/backup.sql" >&2
    exit 1
  fi

  echo ""
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║  ATENÇÃO — Esta operação irá sobrescrever o banco         ║"
  echo "║  '${POSTGRES_DB}' no container '${POSTGRES_CONTAINER}'.  ║"
  echo "║  Os dados atuais NÃO poderão ser recuperados depois.      ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
  read -r -p "Digite exatamente 'SIM' para confirmar o restore: " CONFIRM
  if [[ "${CONFIRM}" != "SIM" ]]; then
    echo "Operação cancelada."
    exit 0
  fi

  echo ""
  echo "Iniciando restore de ${RESTORE_FILE}..."
  docker exec -i "${POSTGRES_CONTAINER}" \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    < "${RESTORE_FILE}"

  echo ""
  echo "Restore concluído com sucesso."
fi
