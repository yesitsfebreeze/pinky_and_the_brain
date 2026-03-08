#!/bin/sh
# pinky-memory: cross-project AI memory installer
# Usage: curl -fsSL https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.sh | sh
set -e

BRAIN_URL="https://github.com/yesitsfebreeze/pinky-and-the-brain.git"
BRAIN_DIR="$HOME/.pinky"
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

# --- 1. Clone or update brain repo ---
if [ -d "$BRAIN_DIR/.git" ]; then
  printf '🧠 Updating brain repo...\n'
  git -C "$BRAIN_DIR" pull --quiet
else
  printf '🧠 Cloning brain repo...\n'
  git clone --quiet "$BRAIN_URL" "$BRAIN_DIR"
fi

# Activate the post-merge hook so future pulls set the reindex flag
git -C "$BRAIN_DIR" config core.hooksPath .githooks

# --- 2. Install skill globally ---
mkdir -p "$SKILL_DIR"
cp "$BRAIN_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"
printf '✅ Skill installed → %s\n' "$SKILL_DIR"

# --- 3. Install @brain and @pinky agents globally ---
if [ -n "$PROMPTS_DIR" ]; then
  mkdir -p "$PROMPTS_DIR"
  cp "$BRAIN_DIR/brain.agent.md" "$PROMPTS_DIR/brain.agent.md"
  cp "$BRAIN_DIR/pinky.agent.md" "$PROMPTS_DIR/pinky.agent.md"
  printf '✅ @brain and @pinky agents installed → %s\n' "$PROMPTS_DIR"
else
  printf '⚠️  VS Code prompts directory not found — install brain.agent.md and pinky.agent.md manually\n'
fi

# --- 4. Create @pinky in current project ---
if [ -f "@pinky" ]; then
  printf '📌 @pinky already exists — skipping\n'
else
  ORIGIN="$(git remote get-url origin 2>/dev/null || true)"
  if [ -z "$ORIGIN" ]; then
    printf '⚠️  No git origin found. Create @pinky manually:\n'
    printf '   Line 1: %s\n' "$BRAIN_URL"
    printf '   Line 2: <your-repo-url>\n'
  else
    printf '%s\n%s\n\n# interesting\n\n# files\n' \
      "https://github.com/yesitsfebreeze/pinky-and-the-brain" \
      "$ORIGIN" > @pinky
    printf '📌 Created @pinky → %s\n' "$ORIGIN"
  fi
fi

printf '🎉 Done! Pinky memory is now active.\n'
