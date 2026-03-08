# pinky-memory: cross-project AI memory installer
# Usage: & ([scriptblock]::Create((irm https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.ps1)))
& {
  $ErrorActionPreference = "Stop"

  $HubUrl   = "https://github.com/yesitsfebreeze/pinky-and-the-brain.git"
  $HubDir   = Join-Path ([System.IO.Path]::GetTempPath()) "pinky-hub-$(Get-Random)"
  $SkillDir = Join-Path (Join-Path (Join-Path $HOME ".agents") "skills") "pinky-memory"

  # --- 1. Fetch skill hub (temporary clone for files) ---
  Write-Host "Fetching skill hub..."
  git clone --quiet --depth 1 $HubUrl $HubDir

  # --- 2. Install skill globally ---
  New-Item -ItemType Directory -Force -Path $SkillDir | Out-Null
  Copy-Item -Path (Join-Path $HubDir "SKILL.md") -Destination (Join-Path $SkillDir "SKILL.md") -Force
  Write-Host "Skill installed -> $SkillDir"

  # --- 3. Install @brain and @pinky agents globally ---
  $PromptsDir = Join-Path $env:APPDATA "Code\User\prompts"
  if (-not (Test-Path (Split-Path $PromptsDir))) {
    $PromptsDir = ""
    Write-Host "VS Code prompts directory not found - install brain.agent.md and pinky.agent.md manually"
  }
  if ($PromptsDir) {
    New-Item -ItemType Directory -Force -Path $PromptsDir | Out-Null
    Copy-Item -Path (Join-Path $HubDir "brain.agent.md") -Destination (Join-Path $PromptsDir "brain.agent.md") -Force
    Copy-Item -Path (Join-Path $HubDir "pinky.agent.md") -Destination (Join-Path $PromptsDir "pinky.agent.md") -Force
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
      Write-Host "  Line 1: https://github.com/<user>/<slug>.brain"
    } else {
      # Derive brain repo URL: strip .git suffix, append .brain
      $BrainUrl = $Origin -replace '\.git$', ''
      $BrainUrl = "$BrainUrl.brain"
      $Content = "$BrainUrl`n`n@links`n"
      [System.IO.File]::WriteAllText((Join-Path $PWD "@pinky"), $Content)
      Write-Host "Created @pinky -> $BrainUrl"
      Write-Host "Create the brain repo on your host: $BrainUrl"
    }
  }

  # --- 5. Cleanup ---
  Remove-Item -Recurse -Force $HubDir -ErrorAction SilentlyContinue

  Write-Host "Done! Create your {slug}.brain repo and pinky memory is active."
}
