#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(
  CDPATH='' cd -- "$(dirname -- "$0")" && pwd
)"
REPO_PATH="$SCRIPT_DIR"

if [ "${1:-}" != "" ]; then
  TARGET_PATH="$(
    CDPATH='' cd -- "$1" && pwd
  )"
else
  TARGET_PATH="$PWD"
fi

HOME_DIR="$(getent passwd "$(id -un)" | cut -d: -f6)"
if [ -z "$HOME_DIR" ]; then
  HOME_DIR="/home/$(id -un)"
fi
export HOME="$HOME_DIR"

if [ -f "$HOME/.bashrc" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.bashrc" >/dev/null 2>&1 || true
fi

# Load model configuration (single source of truth)
ENV_FILE="$HOME/.config/claude-code/deepseek.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
else
  echo "WARNING: $ENV_FILE not found" >&2
fi

# Normalize auth input
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]; then
  ANTHROPIC_API_KEY="$ANTHROPIC_AUTH_TOKEN"
fi
unset ANTHROPIC_AUTH_TOKEN
export ANTHROPIC_API_KEY

# Ensure required env vars have fallback defaults in case deepseek.env is missing them
: "${ANTHROPIC_BASE_URL:='https://api.deepseek.com/anthropic'}"
: "${ANTHROPIC_MODEL:='deepseek-v4-pro'}"
: "${ANTHROPIC_DEFAULT_HAIKU_MODEL:='deepseek-v4-pro'}"
: "${ANTHROPIC_SMALL_FAST_MODEL:='deepseek-v4-flash'}"
: "${CLAUDE_CODE_MAX_CONTEXT_TOKENS:='102400'}"
: "${CLAUDE_CODE_MAX_OUTPUT_TOKENS:='8192'}"
export ANTHROPIC_BASE_URL ANTHROPIC_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL
export ANTHROPIC_SMALL_FAST_MODEL CLAUDE_CODE_MAX_CONTEXT_TOKENS CLAUDE_CODE_MAX_OUTPUT_TOKENS

BUN="$HOME/.bun/bin/bun"
if [ ! -x "$BUN" ]; then
  BUN="$(command -v bun 2>/dev/null || true)"
fi

if [ -z "$BUN" ] || [ ! -x "$BUN" ]; then
  echo "Bun was not found in WSL."
  echo "Install it first, then try again."
  exit 1
fi

cd "$REPO_PATH"

if [ ! -f dist/cli.js ]; then
  "$BUN" run build
fi

cd "$TARGET_PATH"
exec "$BUN" "$REPO_PATH/dist/cli.js"
