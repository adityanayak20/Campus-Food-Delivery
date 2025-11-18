#!/usr/bin/env bash

set -e

# Go to the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building and starting Campus Food Delivery stack with Docker Compose..."

docker compose down --remove-orphans || true
docker compose build
docker compose up


