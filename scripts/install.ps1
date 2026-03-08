# pinky-memory: cross-project AI memory installer
# Usage: irm https://raw.githubusercontent.com/yesitsfebreeze/pinky_and_the_brain/main/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"

$BrainUrl  = "https://github.com/yesitsfebreeze/pinky_and_the_brain.git"
$BrainDir  = Join-Path $HOME ".pinky"
$SkillDir  = Join-Path $HOME ".agents" "skills" "pinky-memory"

# --- 1. Clone or update brain repo ---
if (Test-Path (Join-Path $BrainDir ".git")) {
  Write-Host "🧠 Updating brain repo..."
  git -C $BrainDir pull --quiet
} else {
  Write-Host "🧠 Cloning brain repo..."
  git clone --quiet $BrainUrl $BrainDir
}

# Activate the post-merge hook so future pulls set the reindex flag
git -C $BrainDir config core.hooksPath .githooks

# --- 2. Install skill globally ---
New-Item -ItemType Directory -Force -Path $SkillDir | Out-Null
Copy-Item (Join-Path $BrainDir "SKILL.md") (Join-Path $SkillDir "SKILL.md") -Force
Write-Host "✅ Skill installed → $SkillDir"

# --- 3. Create @pinky in current project ---
if (Test-Path "@pinky") {
  Write-Host "📌 @pinky already exists — skipping"
} else {
  try {
    $Origin = git remote get-url origin 2>$null
  } catch {
    $Origin = $null
  }
  if (-not $Origin) {
    Write-Host "⚠️  No git origin found. Create @pinky manually:"
    Write-Host "   Line 1: $BrainUrl"
    Write-Host "   Line 2: <your-repo-url>"
  } else {
    $Content = "https://github.com/yesitsfebreeze/pinky_and_the_brain`n$Origin`n`n# interesting`n`n# files`n"
    [System.IO.File]::WriteAllText((Join-Path $PWD "@pinky"), $Content)
    Write-Host "📌 Created @pinky → $Origin"
  }
}

Write-Host "🎉 Done! Pinky memory is now active."
