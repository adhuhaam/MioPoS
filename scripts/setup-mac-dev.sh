#!/usr/bin/env bash
# One-time Mac dev setup: Homebrew, Git, Node.js (npm), pnpm
# Run in Terminal: bash scripts/setup-mac-dev.sh

set -euo pipefail

echo "==> MioPoS Mac development setup"
echo ""

# ── Homebrew ────────────────────────────────────────────────────────────────
if ! command -v brew >/dev/null 2>&1; then
  echo "==> Installing Homebrew (you may be asked for your Mac password)..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add brew to PATH (Intel: /usr/local, Apple Silicon: /opt/homebrew)
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    BREW_SHELLENV='eval "$(/opt/homebrew/bin/brew shellenv)"'
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
    BREW_SHELLENV='eval "$(/usr/local/bin/brew shellenv)"'
  else
    echo "Homebrew installed but brew not found in PATH. Check https://brew.sh" >&2
    exit 1
  fi

  for profile in "$HOME/.zprofile" "$HOME/.bash_profile"; do
    if [[ -f "$profile" ]] && grep -q 'brew shellenv' "$profile" 2>/dev/null; then
      :
    elif [[ -f "$profile" ]] || [[ "$profile" == "$HOME/.zprofile" ]]; then
      printf '\n# Homebrew\n%s\n' "$BREW_SHELLENV" >> "$profile"
    fi
  done
  echo "    Added Homebrew to ~/.zprofile"
else
  echo "==> Homebrew already installed: $(brew --version | head -1)"
fi

# shellcheck disable=SC1091
command -v brew >/dev/null 2>&1 || eval "$(/usr/local/bin/brew shellenv 2>/dev/null)" || eval "$(/opt/homebrew/bin/brew shellenv)"

echo "==> Updating Homebrew..."
brew update

# ── Git, Node, GitHub CLI, PostgreSQL client ────────────────────────────────
echo "==> Installing git, node, gh, postgresql@16..."
brew install git node gh postgresql@16

echo "==> Enabling pnpm via Corepack (comes with Node)..."
corepack enable
corepack prepare pnpm@latest --activate

# ── Verify ──────────────────────────────────────────────────────────────────
echo ""
echo "==> Installed versions:"
echo "    brew:  $(brew --version | head -1)"
echo "    git:   $(git --version)"
echo "    node:  $(node --version)"
echo "    npm:   $(npm --version)"
echo "    pnpm:  $(pnpm --version)"
command -v gh >/dev/null && echo "    gh:    $(gh --version | head -1)"

echo ""
echo "==> Next steps"
echo "    1. Open a NEW terminal window (or run: source ~/.zprofile)"
echo "    2. Sign in to GitHub:  gh auth login"
echo "    3. In MioPoS repo:       cd $(cd "$(dirname "$0")/.." && pwd)"
echo "                            pnpm install"
echo "    4. Push your branch:    git push -u origin cursor"
echo ""
echo "Done."
