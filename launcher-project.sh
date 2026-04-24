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

ENV_FILE="$HOME/.config/claude-code/deepseek.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

# Normalize auth input so the CLI always sees the DeepSeek key as
# ANTHROPIC_API_KEY, matching the Windows launcher behavior.
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]; then
  ANTHROPIC_API_KEY="$ANTHROPIC_AUTH_TOKEN"
fi
unset ANTHROPIC_AUTH_TOKEN

ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-deepseek-chat}"
ANTHROPIC_DEFAULT_HAIKU_MODEL="${ANTHROPIC_DEFAULT_HAIKU_MODEL:-deepseek-chat}"
CLAUDE_CODE_MAX_CONTEXT_TOKENS="102400"
CLAUDE_CODE_MAX_OUTPUT_TOKENS="8192"
export ANTHROPIC_API_KEY
export ANTHROPIC_BASE_URL
export ANTHROPIC_MODEL
export ANTHROPIC_DEFAULT_HAIKU_MODEL
export CLAUDE_CODE_MAX_CONTEXT_TOKENS
export CLAUDE_CODE_MAX_OUTPUT_TOKENS

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
