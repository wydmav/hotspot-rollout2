#!/usr/bin/env bash
# ==============================================================================
# T-Connect Control Tower — Production Clean-State Reset Script
# Delegates to root ./reset-platform-data.sh so Payment Gateways are preserved
# and zero literal secrets ever exist in scripts.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

exec "$ROOT_DIR/reset-platform-data.sh" "$@"
