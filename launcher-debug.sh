HOME_DIR="$(getent passwd "$(id -un)" | cut -d: -f6)"
if [ -z "$HOME_DIR" ]; then HOME_DIR="/home/$(id -un)"; fi
export HOME="$HOME_DIR"
echo "USER=$(id -un)"
echo "HOME=$HOME"
echo "BASH_VERSION=$BASH_VERSION"
if [ -f "$HOME/.bashrc" ]; then
  echo "BASHRC=present"
else
  echo "BASHRC=missing"
fi
if [ -x "$HOME/.bun/bin/bun" ]; then
  echo "BUN_PATH=$HOME/.bun/bin/bun"
  "$HOME/.bun/bin/bun" --version
else
  echo "BUN_PATH=missing"
fi
if command -v bun >/dev/null 2>&1; then
  echo "BUN_CMD=$(command -v bun)"
else
  echo "BUN_CMD=missing"
fi
if [ -f "$HOME/.config/claude-code/deepseek.env" ]; then
  echo "ENV_FILE=present"
else
  echo "ENV_FILE=missing"
fi
echo "ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic"
echo "ANTHROPIC_MODEL=deepseek-chat"
echo "ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-chat"
echo "CLAUDE_CODE_MAX_CONTEXT_TOKENS=128000"
echo "CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192"
