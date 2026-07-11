#!/usr/bin/env bash
set -euo pipefail

DB_NAME="geniuscampaign_dev"

if psql -lqt | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
  echo "Database '$DB_NAME' already exists, skipping."
else
  createdb "$DB_NAME"
  echo "Database '$DB_NAME' created."
fi
