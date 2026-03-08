#!/bin/sh
# pinky-memory: cross-project AI memory installer
# Usage: curl -fsSL https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.sh | sh
set -e

HUB_URL="https://github.com/yesitsfebreeze/pinky-and-the-brain.git"
HUB_DIR=$(mktemp -d)
SKILL_DIR="$HOME/.agents/skills/pinky-memory"

# Detect VS Code prompts directory for agent installation
if [ -d "$HOME/.config/Code/User/prompts" ]; then
  PROMPTS_DIR="$HOME/.config/Code/User/prompts"
elif [ -d "$HOME/Library/Application Support/Code/User/prompts" ]; then
  PROMPTS_DIR="$HOME/Library/Application Support/Code/User/prompts"
elif [ -d "$HOME/Library/Application Support/Code/User" ]; then
  PROMPTS_DIR="$HOME/Library/Application Support/Code/User/prompts"
elif [ -d "$HOME/.config/Code/User" ]; then
  PROMPTS_DIR="$HOME/.config/Code/User/prompts"
else
  PROMPTS_DIR=""
fi

# --- 1. Fetch skill hub (temporary clone for files) ---
printf 'Fetching skill hub...\n'
git clone --quiet --depth 1 "$HUB_URL" "$HUB_DIR"

# --- 2. Install skill globally ---
mkdir -p "$SKILL_DIR"
cp "$HUB_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"
printf 'Skill installed -> %s\n' "$SKILL_DIR"

# --- 3. Install @brain and @pinky agents globally ---
if [ -n "$PROMPTS_DIR" ]; then
  mkdir -p "$PROMPTS_DIR"
  cp "$HUB_DIR/brain.agent.md" "$PROMPTS_DIR/brain.agent.md"
  cp "$HUB_DIR/pinky.agent.md" "$PROMPTS_DIR/pinky.agent.md"
  printf '@brain and @pinky agents installed -> %s\n' "$PROMPTS_DIR"
else
  printf 'VS Code prompts directory not found - install brain.agent.md and pinky.agent.md manually\n'
fi

# --- 4. Create @pinky in current project ---
if [ -f "@pinky" ]; then
  printf '@pinky already exists - skipping\n'
else
  ORIGIN="$(git remote get-url origin 2>/dev/null || true)"
  if [ -z "$ORIGIN" ]; then
    printf 'No git origin found. Create @pinky manually:\n'
    printf '   Line 1: https://github.com/<user>/<slug>.brain\n'
  else
    # Derive brain repo URL: strip .git suffix, append .brain
    BRAIN_URL="$(printf '%s' "$ORIGIN" | sed 's/\.git$//')"
    BRAIN_URL="${BRAIN_URL}.brain"
    printf '%s\n\n@links\n' "$BRAIN_URL" > @pinky
    printf 'Created @pinky -> %s\n' "$BRAIN_URL"
    printf 'Create the brain repo on your host: %s\n' "$BRAIN_URL"
  fi
fi

# --- 5. Cleanup ---
rm -rf "$HUB_DIR"

printf 'Done! Create your {slug}.brain repo and pinky memory is active.\n'
