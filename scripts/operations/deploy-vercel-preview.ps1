[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$productionConfig = (Resolve-Path (
    Join-Path $repositoryRoot "vercel.json"
  )).Path
$previewConfig = (Resolve-Path (
    Join-Path $repositoryRoot "vercel.preview.json"
  )).Path

if ($productionConfig -notlike "$repositoryRoot\*") {
  throw "Unexpected production Vercel configuration path."
}

$temporaryConfig = Join-Path (
  [System.IO.Path]::GetTempPath()
) "goneviral-vercel-$([Guid]::NewGuid().ToString('N')).json"

Push-Location $repositoryRoot
try {
  $branch = (git branch --show-current).Trim()
  $commit = (git rev-parse HEAD).Trim()

  if ($branch -ne "codex/phase-15-staging") {
    throw "Preview deployment requires codex/phase-15-staging."
  }

  Move-Item -LiteralPath $productionConfig -Destination $temporaryConfig
  try {
    pnpm exec vercel deploy `
      --yes `
      --target preview `
      --local-config $previewConfig `
      --regions bom1 `
      -m "githubCommitRef=$branch" `
      -m "githubCommitSha=$commit"

    if ($LASTEXITCODE -ne 0) {
      throw "Vercel Preview deployment failed."
    }
  }
  finally {
    Move-Item -LiteralPath $temporaryConfig `
      -Destination $productionConfig
  }
}
finally {
  if (Test-Path -LiteralPath $temporaryConfig) {
    Remove-Item -LiteralPath $temporaryConfig -Force
  }
  Pop-Location
}
