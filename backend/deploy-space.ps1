<#
.SYNOPSIS
    Deploys this backend to the Hugging Face Space that serves the portfolio chatbot.

.DESCRIPTION
    The Space is a separate git repository from the GitHub repo this file lives in, so
    deploying means pushing to that remote rather than to origin. This script clones (or
    updates) the Space, copies the runtime files across, commits, and pushes.

    Only an explicit allowlist of files is copied. GROQ_API_KEY must live in the Space's
    repository secrets (Settings -> Repository secrets), never in the repo, so .env is
    never copied and the script aborts if one turns up in the Space working tree.

.PARAMETER SpaceUrl
    Git URL of the Hugging Face Space.

.PARAMETER WorkDir
    Where to keep the Space clone between deploys. Defaults to a sibling of the repo.

.PARAMETER Message
    Commit message for the deploy.

.EXAMPLE
    .\deploy-space.ps1
    .\deploy-space.ps1 -Message "swap to gpt-oss-120b"
#>

[CmdletBinding()]
param(
    [string]$SpaceUrl = "https://huggingface.co/spaces/isuruig/portfolio-chatbot-backend",
    [string]$WorkDir  = "$env:LOCALAPPDATA\portfolio-space-deploy",
    [string]$Message  = "Deploy backend update"
)

$ErrorActionPreference = "Stop"

# Files the Space actually needs. Allowlist, not exclude-list, so a stray secret
# can never be swept in by accident.
$Payload = @(
    "main.py",
    "requirements.txt",
    "Dockerfile",
    ".dockerignore",
    "README.md",              # carries the HF Space YAML frontmatter
    "portfolio-knowledge.json"
)

$BackendDir = $PSScriptRoot
Write-Host "Backend source : $BackendDir"
Write-Host "Space          : $SpaceUrl"

# --- sanity: every payload file must exist before we touch the Space ---
foreach ($f in $Payload) {
    $p = Join-Path $BackendDir $f
    if (-not (Test-Path $p)) { throw "Missing required file: $f" }
}

# --- keep the knowledge base in step with the site's copy ---
$SiteKnowledge = Join-Path (Split-Path $BackendDir -Parent) "src\lib\data\portfolio-knowledge.json"
if (Test-Path $SiteKnowledge) {
    $a = Get-FileHash $SiteKnowledge -Algorithm SHA256
    $b = Get-FileHash (Join-Path $BackendDir "portfolio-knowledge.json") -Algorithm SHA256
    if ($a.Hash -ne $b.Hash) {
        Write-Host "portfolio-knowledge.json differs from the site copy - syncing from src/lib/data" -ForegroundColor Yellow
        Copy-Item $SiteKnowledge (Join-Path $BackendDir "portfolio-knowledge.json") -Force
    }
}

# --- clone or refresh the Space ---
$SpaceDir = Join-Path $WorkDir "portfolio-chatbot-backend"
if (Test-Path (Join-Path $SpaceDir ".git")) {
    Write-Host "Updating existing clone..."
    git -C $SpaceDir pull --ff-only
} else {
    New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
    Write-Host "Cloning Space..."
    git clone $SpaceUrl $SpaceDir
}
if (-not (Test-Path $SpaceDir)) { throw "Space clone failed: $SpaceDir not found" }

# --- copy the payload ---
foreach ($f in $Payload) {
    Copy-Item (Join-Path $BackendDir $f) (Join-Path $SpaceDir $f) -Force
    Write-Host "  copied $f"
}

# --- refuse to push a secret ---
$leaked = Get-ChildItem -Path $SpaceDir -Force -Recurse -File |
          Where-Object { $_.Name -eq ".env" -or $_.Name -like "*.env" } |
          Where-Object { $_.FullName -notlike "*\.git\*" }
if ($leaked) {
    $leaked | ForEach-Object { Write-Host "  !! $($_.FullName)" -ForegroundColor Red }
    throw "Refusing to deploy: env file present in the Space working tree. Remove it and set GROQ_API_KEY as a Space repository secret instead."
}

# --- commit and push ---
git -C $SpaceDir add -A
$pending = git -C $SpaceDir status --porcelain
if (-not $pending) {
    Write-Host "Nothing changed - Space is already up to date." -ForegroundColor Green
} else {
    git -C $SpaceDir commit -m $Message
    Write-Host "Pushing to Hugging Face (may prompt for credentials)..."
    git -C $SpaceDir push
    Write-Host "Pushed. The Space rebuilds automatically; allow a few minutes." -ForegroundColor Green
}

Write-Host ""
Write-Host "Verify once the Space finishes building:" -ForegroundColor Cyan
Write-Host '  curl -s https://isuruig-portfolio-chatbot-backend.hf.space/health'
Write-Host '    -> expect "llm_ok": true, "model": "openai/gpt-oss-120b", "status": "healthy"'
Write-Host ''
Write-Host '  curl -s -X POST https://isuruig-portfolio-chatbot-backend.hf.space/chat \'
Write-Host '    -H "Content-Type: application/json" -d ''{"message":"Where do you work?"}'''
Write-Host '    -> expect HTTP 200 mentioning Veracity Digital'
