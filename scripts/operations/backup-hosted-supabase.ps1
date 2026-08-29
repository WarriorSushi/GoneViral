[CmdletBinding()]
param(
  [string]$BackupRoot = "D:\GoneViral-Backups",
  [switch]$PruneExpired,
  [ValidateRange(7, 3650)]
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available."
  }
}

function Invoke-Checked([string]$Program, [string[]]$Arguments) {
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Program (exit $LASTEXITCODE)."
  }
}

function Get-Sha256([string]$Path) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace("-", "").ToLowerInvariant()
  } finally {
    $stream.Dispose()
    $algorithm.Dispose()
  }
}

Assert-Command "pnpm"
Assert-Command "git"
Assert-Command "7z"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$projectRefFile = Join-Path $repositoryRoot "supabase\.temp\project-ref"
if (-not (Test-Path -LiteralPath $projectRefFile -PathType Leaf)) {
  throw "No linked Supabase project ref exists. Run and verify 'pnpm exec supabase link' first."
}
$projectRef = (Get-Content -LiteralPath $projectRefFile -Raw).Trim()
if ($projectRef -notmatch '^[a-z]{20}$') {
  throw "The linked Supabase project ref is malformed."
}

$resolvedBackupRoot = [System.IO.Path]::GetFullPath($BackupRoot)
if ($resolvedBackupRoot -notmatch '^[A-Za-z]:\\[^\\]+') {
  throw "BackupRoot must be an explicit non-root directory."
}
[System.IO.Directory]::CreateDirectory($resolvedBackupRoot) | Out-Null

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$plainDirectory = Join-Path $resolvedBackupRoot "$timestamp-$projectRef"
$archivePath = "$plainDirectory.7z"
$hashPath = "$archivePath.sha256"
if ((Test-Path -LiteralPath $plainDirectory) -or (Test-Path -LiteralPath $archivePath)) {
  throw "Backup destination already exists: $timestamp-$projectRef"
}
[System.IO.Directory]::CreateDirectory($plainDirectory) | Out-Null

# Restrict the root and this run to the current user. Inherited access for
# administrators and SYSTEM remains available for machine recovery.
& icacls $resolvedBackupRoot /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F" "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Could not restrict backup-root ACLs." }

Push-Location $repositoryRoot
try {
  $gitCommit = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $gitCommit -notmatch '^[0-9a-f]{40}$') {
    throw "Could not record the source Git commit."
  }

  Invoke-Checked "pnpm" @("exec", "supabase", "db", "dump", "--linked", "--role-only", "--file", (Join-Path $plainDirectory "roles.sql"))
  Invoke-Checked "pnpm" @("exec", "supabase", "db", "dump", "--linked", "--schema", "app,private", "--file", (Join-Path $plainDirectory "app-private-schema.sql"))
  Invoke-Checked "pnpm" @("exec", "supabase", "db", "dump", "--linked", "--schema", "app,private", "--data-only", "--use-copy", "--file", (Join-Path $plainDirectory "app-private-data.sql"))
  Invoke-Checked "pnpm" @("exec", "supabase", "db", "dump", "--linked", "--schema", "auth,storage", "--file", (Join-Path $plainDirectory "auth-storage-schema.sql"))
  Invoke-Checked "pnpm" @("exec", "supabase", "db", "dump", "--linked", "--schema", "auth,storage", "--data-only", "--use-copy", "--file", (Join-Path $plainDirectory "auth-storage-data.sql"))
  Invoke-Checked "pnpm" @("exec", "supabase", "db", "dump", "--linked", "--schema", "supabase_migrations", "--data-only", "--use-copy", "--file", (Join-Path $plainDirectory "migration-history.sql"))

  $storageRoot = Join-Path $plainDirectory "storage"
  [System.IO.Directory]::CreateDirectory($storageRoot) | Out-Null
  $storageBuckets = @("goneviral-logo-staging", "goneviral-logo-public")
  foreach ($bucket in $storageBuckets) {
    [System.IO.Directory]::CreateDirectory((Join-Path $storageRoot $bucket)) | Out-Null
  }

  # The installed CLI can list linked Storage but rejects its documented remote
  # cp form. Retrieve the modern secret key into memory and use the supported
  # Storage API without printing or persisting the credential.
  $apiKeyJson = (& pnpm exec supabase projects api-keys --project-ref $projectRef --reveal --output json 2>$null | Out-String)
  if ($LASTEXITCODE -ne 0 -or -not $apiKeyJson.Trim()) {
    throw "Could not retrieve the linked project's modern Storage credential."
  }
  $modernSecretKey = (($apiKeyJson | ConvertFrom-Json) |
    Where-Object { $_.type -eq "secret" -and $_.name -eq "default" } |
    Select-Object -First 1).api_key
  if (-not $modernSecretKey) {
    throw "The linked project has no default modern secret API key."
  }
  $previousStorageKey = $env:GONEVIRAL_BACKUP_SUPABASE_SECRET_KEY
  try {
    $env:GONEVIRAL_BACKUP_SUPABASE_SECRET_KEY = $modernSecretKey
    $storageDownloadArguments = @(
      "scripts/operations/download-supabase-storage.mjs",
      "https://$projectRef.supabase.co",
      $storageRoot
    ) + $storageBuckets
    Invoke-Checked "node" $storageDownloadArguments
  } finally {
    if ($null -eq $previousStorageKey) {
      Remove-Item Env:GONEVIRAL_BACKUP_SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
    } else {
      $env:GONEVIRAL_BACKUP_SUPABASE_SECRET_KEY = $previousStorageKey
    }
    Remove-Variable modernSecretKey, apiKeyJson -ErrorAction SilentlyContinue
  }

  Copy-Item -LiteralPath (Join-Path $repositoryRoot "supabase\config.toml") -Destination (Join-Path $plainDirectory "supabase-config.toml")
  $files = Get-ChildItem -LiteralPath $plainDirectory -Recurse -File
  foreach ($required in @("roles.sql", "app-private-schema.sql", "app-private-data.sql", "auth-storage-schema.sql", "auth-storage-data.sql", "migration-history.sql", "supabase-config.toml")) {
    $requiredPath = Join-Path $plainDirectory $required
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf) -or (Get-Item -LiteralPath $requiredPath).Length -eq 0) {
      throw "Required backup component is missing or empty: $required"
    }
  }

  $manifest = [ordered]@{
    formatVersion = 1
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    projectRef = $projectRef
    gitCommit = $gitCommit
    schemas = @("app", "private", "auth", "storage", "supabase_migrations")
    storageBuckets = $storageBuckets
    storageObjectCount = @($files | Where-Object { $_.FullName.StartsWith($storageRoot, [System.StringComparison]::OrdinalIgnoreCase) }).Count
    files = @($files | ForEach-Object {
      [ordered]@{
        path = $_.FullName.Substring($plainDirectory.Length).TrimStart("\")
        bytes = $_.Length
        sha256 = Get-Sha256 $_.FullName
      }
    })
  }
  $manifestJson = $manifest | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText(
    (Join-Path $plainDirectory "manifest.json"),
    $manifestJson,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-Host "Create a portable encryption passphrase in the 7-Zip prompt. Store it in your password manager, not beside the backup."
  Invoke-Checked "7z" @("a", "-t7z", "-mhe=on", "-mx=9", "-p", $archivePath, (Join-Path $plainDirectory "*"))
  Write-Host "Enter the same passphrase when 7-Zip prompts again to verify the encrypted archive."
  Invoke-Checked "7z" @("t", $archivePath)

  $archiveHash = Get-Sha256 $archivePath
  "$archiveHash  $([System.IO.Path]::GetFileName($archivePath))" | Set-Content -LiteralPath $hashPath -Encoding ascii

  $resolvedPlain = (Resolve-Path -LiteralPath $plainDirectory).Path
  if (-not $resolvedPlain.StartsWith("$resolvedBackupRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove plaintext outside the verified backup root."
  }
  Remove-Item -LiteralPath $resolvedPlain -Recurse -Force

  if ($PruneExpired) {
    $confirmation = Read-Host "Type PRUNE ENCRYPTED BACKUPS to remove matching archives older than $RetentionDays days"
    if ($confirmation -ne "PRUNE ENCRYPTED BACKUPS") {
      throw "Retention pruning was not confirmed. The new backup remains valid."
    }
    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $resolvedBackupRoot -File -Filter "*-$projectRef.7z" |
      Where-Object { $_.LastWriteTimeUtc -lt $cutoff -and $_.FullName -ne $archivePath } |
      ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force
        $oldHash = "$($_.FullName).sha256"
        if (Test-Path -LiteralPath $oldHash -PathType Leaf) { Remove-Item -LiteralPath $oldHash -Force }
      }
  }

  Write-Host "Verified encrypted backup: $archivePath"
  Write-Host "SHA-256 evidence: $hashPath"
  Write-Host "Project ref: $projectRef; Git commit: $gitCommit"
} catch {
  if (Test-Path -LiteralPath $plainDirectory) {
    Write-Warning "Backup failed. Plaintext was retained for inspection at: $plainDirectory"
  } else {
    Write-Warning "Backup or retention step failed after plaintext removal. The encrypted archive remains at: $archivePath"
  }
  throw
} finally {
  Pop-Location
}
