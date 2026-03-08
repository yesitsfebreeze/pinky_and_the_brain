#!/bin/sh
# pinky-memory: cross-project AI memory installer
# Usage: curl -fsSL https://raw.githubusercontent.com/yesitsfebreeze/pinky_and_the_brain/main/scripts/install.sh | sh
set -e

BRAIN_URL="https://github.com/yesitsfebreeze/pinky_and_the_brain.git"
BRAIN_DIR="$HOME/.pinky"
SKILL_DIR="$HOME/.agents/skills/pinky-memory"

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

# --- 3. Create @pinky in current project ---
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
      "https://github.com/yesitsfebreeze/pinky_and_the_brain" \
      "$ORIGIN" > @pinky
    printf '📌 Created @pinky → %s\n' "$ORIGIN"
  fi
fi

printf '🎉 Done! Pinky memory is now active.\n'
