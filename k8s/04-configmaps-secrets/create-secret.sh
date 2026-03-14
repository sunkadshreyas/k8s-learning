#!/usr/bin/env bash
# Generates the movies-api-secret from environment variables.
# Usage: DB_PASSWORD=yourpassword ./create-secret.sh
#
# Never commit actual secret values — run this script locally to create the secret.

set -e

: "${DB_PASSWORD:?DB_PASSWORD env var is required}"

kubectl create secret generic movies-api-secret \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret movies-api-secret applied."
