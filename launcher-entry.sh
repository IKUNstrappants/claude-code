#!/usr/bin/env bash
set -u

REPO_PATH="${1:-}"
MODE="${2:-run}"

if [ -z "$REPO_PATH" ]; then
  echo "Missing repository path."
  exit 1
fi

HOME_DIR="$(getent passwd "$(id -un)" | cut -d: -f6)"
if [ -z "$HOME_DIR" ]; then
  HOME_DIR="/home/$(id -un)"
fi
export HOME="$HOME_DIR"

if [ "$MODE" = "probe" ]; then
  echo "USER=$(id -un)"
  echo "HOME_DIR=$HOME_DIR"
  echo "HOME=$HOME"
  if [ -f "$HOME/.bashrc" ]; then
    echo "BASHRC=present"
  else
    echo "BASHRC=missing"
  fi
fi

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

# Normalize auth input: DeepSeek key may come as ANTHROPIC_AUTH_TOKEN
# from the Windows launcher; always use ANTHROPIC_API_KEY internally.
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
: "${CLAUDE_CODE_MAX_CONTEXT_TOKENS:='1048576'}"
: "${CLAUDE_CODE_MAX_OUTPUT_TOKENS:='393216'}"
export ANTHROPIC_BASE_URL ANTHROPIC_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL
export ANTHROPIC_SMALL_FAST_MODEL CLAUDE_CODE_MAX_CONTEXT_TOKENS CLAUDE_CODE_MAX_OUTPUT_TOKENS

BUN="$HOME/.bun/bin/bun"
if [ ! -x "$BUN" ]; then
  BUN="$(command -v bun 2>/dev/null || true)"
fi

if [ "$MODE" = "probe" ]; then
  echo "BUN_CANDIDATE=$BUN"
  if [ -n "$BUN" ] && [ -x "$BUN" ]; then
    echo "BUN_FILE=present"
    "$BUN" --version
  else
    echo "BUN_FILE=missing"
  fi
  if command -v bun >/dev/null 2>&1; then
    echo "BUN_CMD=$(command -v bun)"
  else
    echo "BUN_CMD=missing"
  fi
  if [ -f "$ENV_FILE" ]; then
    echo "ENV_FILE=present"
  else
    echo "ENV_FILE=missing"
  fi
  echo "ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL"
  echo "ANTHROPIC_MODEL=$ANTHROPIC_MODEL"
  echo "ANTHROPIC_DEFAULT_HAIKU_MODEL=$ANTHROPIC_DEFAULT_HAIKU_MODEL"
  echo "ANTHROPIC_SMALL_FAST_MODEL=$ANTHROPIC_SMALL_FAST_MODEL"
  echo "CLAUDE_CODE_MAX_CONTEXT_TOKENS=$CLAUDE_CODE_MAX_CONTEXT_TOKENS"
  echo "CLAUDE_CODE_MAX_OUTPUT_TOKENS=$CLAUDE_CODE_MAX_OUTPUT_TOKENS"
  exit 0
fi

if [ -z "$BUN" ] || [ ! -x "$BUN" ]; then
  echo "Bun was not found in WSL."
  echo "Install it first, then try again."
  echo
  read -r -p "Press Enter to close..." _
  exit 1
fi

cd "$REPO_PATH" || exit 1

if [ ! -f dist/cli.js ]; then
  "$BUN" run build || {
    echo
    echo "Build failed."
    read -r -p "Press Enter to close..." _
    exit 1
  }
fi

exec "$BUN" dist/cli.js
