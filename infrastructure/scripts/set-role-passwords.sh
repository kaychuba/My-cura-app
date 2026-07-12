#!/usr/bin/env bash
# Sets database role passwords from the environment — run once per
# environment after migrations. Passwords never live in the repository.
set -euo pipefail
: "${DB_APP_PASSWORD:?set DB_APP_PASSWORD}"
: "${DB_AUTH_PASSWORD:?set DB_AUTH_PASSWORD}"
DB_NAME="${DB_NAME:-mycura}"
psql -v ON_ERROR_STOP=1 -d "$DB_NAME" <<SQL
ALTER ROLE mycura_app  PASSWORD '${DB_APP_PASSWORD}';
ALTER ROLE mycura_auth PASSWORD '${DB_AUTH_PASSWORD}';
SQL
echo "Role passwords set for $DB_NAME"
