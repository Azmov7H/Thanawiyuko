#!/usr/bin/env bash
# Restore drill — proves a dump can be restored and verified.
#
# Usage:
#   MONGODB_URI="mongodb://127.0.0.1:27017/thanawico" ./scripts/restore-drill.sh
#   ./scripts/restore-drill.sh [backup-dir]
#
# Steps: dump source DB -> restore into a throwaway DB -> compare per-collection
# counts -> clean up. Exits non-zero on any mismatch. Run monthly in staging.
# Set KEEP=1 to keep the dump directory for inspection.

set -euo pipefail

MONGO_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/thanawico}"
BACKUP_DIR="${1:-/tmp/thanawico-restore-drill}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DRILL_DB="thanawico_restore_drill_${TIMESTAMP}"
DUMP_DIR="${BACKUP_DIR}/dump-${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/restore-drill-${TIMESTAMP}.log"
KEEP="${KEEP:-0}"

mkdir -p "${BACKUP_DIR}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

fail() {
  log "ERROR: $*"
  exit 1
}

for cmd in mongodump mongorestore mongosh; do
  command -v "$cmd" > /dev/null 2>&1 || fail "$cmd not found in PATH"
done

SRC_DB="$(printf '%s' "${MONGO_URI}" | sed -E 's#^mongodb(\+srv)?://[^/]+/([^?]+).*#\2#')"
case "${SRC_DB}" in
  ""|"${MONGO_URI}") fail "MONGO_URI must include a database name (e.g. .../thanawico)" ;;
esac

counts() {
  mongosh "${MONGO_URI}" --quiet --eval "
    const d = db.getSiblingDB('$1');
    const o = {};
    d.getCollectionNames().sort().forEach((c) => { o[c] = d.getCollection(c).countDocuments({}); });
    print(JSON.stringify(o));
  "
}

log "Starting restore drill"
log "Source database: ${SRC_DB}"
log "Scratch database: ${DRILL_DB}"

# 1. Dump
log "Dumping '${SRC_DB}' -> ${DUMP_DIR}"
if ! mongodump --uri="${MONGO_URI}" --out="${DUMP_DIR}" >> "${LOG_FILE}" 2>&1; then
  fail "mongodump failed (source unreachable or empty?)"
fi

# 2. Restore into throwaway DB
log "Restoring into '${DRILL_DB}'"
if ! mongorestore --uri="${MONGO_URI}" \
  --nsFrom="${SRC_DB}.*" --nsTo="${DRILL_DB}.*" \
  --dir="${DUMP_DIR}/${SRC_DB}" >> "${LOG_FILE}" 2>&1; then
  fail "mongorestore failed"
fi

# 3. Verify per-collection document counts
SRC_COUNTS="$(counts "${SRC_DB}")"
DRILL_COUNTS="$(counts "${DRILL_DB}")"
printf '%s\n' "${SRC_COUNTS}" > "${BACKUP_DIR}/counts-source-${TIMESTAMP}.json"
printf '%s\n' "${DRILL_COUNTS}" > "${BACKUP_DIR}/counts-restored-${TIMESTAMP}.json"

if [ "${SRC_COUNTS}" != "${DRILL_COUNTS}" ]; then
  log "Source:   ${SRC_COUNTS}"
  log "Restored: ${DRILL_COUNTS}"
  fail "document counts differ after restore"
fi

COLLECTION_COUNT="$(printf '%s' "${SRC_COUNTS}" | grep -o ':' | wc -l | tr -d ' ')"
log "Counts match across ${COLLECTION_COUNT} collection(s): ${SRC_COUNTS}"

# 4. Cleanup
log "Dropping scratch database '${DRILL_DB}'"
mongosh "${MONGO_URI}" --quiet --eval "db.getSiblingDB('${DRILL_DB}').dropDatabase()" >> "${LOG_FILE}" 2>&1

if [ "${KEEP}" = "1" ]; then
  log "KEEP=1 — dump retained at ${DUMP_DIR}"
else
  rm -rf "${DUMP_DIR}"
fi

log "Restore drill completed successfully"
log "Log: ${LOG_FILE}"
