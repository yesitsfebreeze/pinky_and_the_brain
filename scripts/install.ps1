# pinky-memory: cross-project AI memory installer
# Usage: & ([scriptblock]::Create((irm https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.ps1)))
& {
  $ErrorActionPreference = "Stop"

  $BrainUrl  = "https://github.com/yesitsfebreeze/pinky-and-the-brain.git"
  $BrainDir  = Join-Path $HOME ".pinky"
  $SkillDir  = Join-Path (Join-Path (Join-Path $HOME ".agents") "skills") "pinky-memory"

  # --- 1. Clone or update brain repo ---
  if (Test-Path (Join-Path $BrainDir ".git")) {
    Write-Host "Updating brain repo..."
    git -C $BrainDir pull --quiet
  } else {
    Write-Host "Cloning brain repo..."
    git clone --quiet $BrainUrl $BrainDir
  }

  # Activate the post-merge hook so future pulls set the reindex flag
  git -C $BrainDir config core.hooksPath .githooks

  # --- 2. Install skill globally ---
  New-Item -ItemType Directory -Force -Path $SkillDir | Out-Null
  Copy-Item -Path (Join-Path $BrainDir "SKILL.md") -Destination (Join-Path $SkillDir "SKILL.md") -Force
  Write-Host "Skill installed -> $SkillDir"

  # --- 3. Install @brain and @pinky agents globally ---
  $PromptsDir = Join-Path $env:APPDATA "Code\User\prompts"
  if (-not (Test-Path (Split-Path $PromptsDir))) {
    $PromptsDir = ""
    Write-Host "VS Code prompts directory not found - install brain.agent.md and pinky.agent.md manually"
  }
  if ($PromptsDir) {
    New-Item -ItemType Directory -Force -Path $PromptsDir | Out-Null
    Copy-Item -Path (Join-Path $BrainDir "brain.agent.md") -Destination (Join-Path $PromptsDir "brain.agent.md") -Force
    Copy-Item -Path (Join-Path $BrainDir "pinky.agent.md") -Destination (Join-Path $PromptsDir "pinky.agent.md") -Force
    Write-Host "@brain and @pinky agents installed -> $PromptsDir"
  }

  # --- 4. Create @pinky in current project ---
  if (Test-Path "@pinky") {
    Write-Host "@pinky already exists - skipping"
  } else {
    $Origin = $null
    try { $Origin = git remote get-url origin 2>$null } catch {}
    if (-not $Origin) {
      Write-Host "No git origin found. Create @pinky manually:"
      Write-Host "  Line 1: $BrainUrl"
      Write-Host "  Line 2: <your-repo-url>"
    } else {
      $Content = "https://github.com/yesitsfebreeze/pinky-and-the-brain`n$Origin`n`n# interesting`n`n# files`n"
      [System.IO.File]::WriteAllText((Join-Path $PWD "@pinky"), $Content)
      Write-Host "Created @pinky -> $Origin"
    }
  }

  Write-Host "Done! Pinky memory is now active."
}
