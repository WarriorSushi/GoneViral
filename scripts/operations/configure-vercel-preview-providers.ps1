[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$expectedProjectId = "prj_pvt3u8wDLvJ3C4X9QTB7AlHUvL12"
$expectedProjectName = "goneviral"

function Set-VercelPreviewVariable {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [string] $Value,
    [Parameter(Mandatory)] [bool] $Sensitive
  )

  $variable = [pscustomobject]@{
    key = $Name
    value = $Value
    type = $(if ($Sensitive) { "sensitive" } else { "plain" })
    target = @("preview")
    comment = "GoneViral Phase 15 private Preview"
  }
  $payload = ConvertTo-Json -InputObject $variable -Depth 4 -Compress
  $payload | pnpm exec vercel api /v10/projects/goneviral/env `
    -X POST `
    --input - `
    --silent
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set Vercel Preview variable $Name."
  }

  Remove-Variable payload, variable -ErrorAction SilentlyContinue
}

function Set-SecureVercelPreviewVariable {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [string] $Prompt,
    [Parameter(Mandatory)] [scriptblock] $Validate,
    [Parameter(Mandatory)] [bool] $Sensitive
  )

  $secureValue = Read-Host $Prompt -AsSecureString
  $valuePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $secureValue
  )

  try {
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
      $valuePointer
    ).Trim()
    if (-not (& $Validate $plainValue)) {
      throw "The value entered for $Name did not match the expected format."
    }
    Set-VercelPreviewVariable `
      -Name $Name `
      -Value $plainValue `
      -Sensitive $Sensitive
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer)
    Remove-Variable plainValue -ErrorAction SilentlyContinue
  }
}

Push-Location $repositoryRoot
try {
  $linkPath = Join-Path $repositoryRoot ".vercel\project.json"
  if (-not (Test-Path -LiteralPath $linkPath)) {
    throw "This repository is not linked to a Vercel project."
  }

  $link = Get-Content -LiteralPath $linkPath -Raw | ConvertFrom-Json
  if (
    $link.projectId -ne $expectedProjectId -or
    $link.projectName -ne $expectedProjectName
  ) {
    throw "Refusing to configure an unexpected Vercel project."
  }

  Write-Host "Configuring Vercel Preview only for GoneViral." -ForegroundColor Cyan
  Write-Host "Input is hidden and is not written to a local file." -ForegroundColor Cyan

  Set-SecureVercelPreviewVariable `
    -Name "DODO_PAYMENTS_API_KEY" `
    -Prompt "Paste the Dodo TEST API key" `
    -Validate { param($value) $value.Length -ge 16 } `
    -Sensitive $true

  Set-SecureVercelPreviewVariable `
    -Name "NEXT_PUBLIC_SENTRY_DSN" `
    -Prompt "Paste the Sentry DSN" `
    -Validate {
      param($value)
      $uri = $null
      [Uri]::TryCreate($value, [UriKind]::Absolute, [ref] $uri) -and
        $uri.Scheme -eq "https" -and
        $uri.Host.EndsWith("sentry.io")
    } `
    -Sensitive $false

  Set-SecureVercelPreviewVariable `
    -Name "SENTRY_AUTH_TOKEN" `
    -Prompt "Paste the Sentry source-map auth token" `
    -Validate { param($value) $value.Length -ge 16 } `
    -Sensitive $true

  Set-SecureVercelPreviewVariable `
    -Name "RESEND_API_KEY" `
    -Prompt "Paste the Resend goneviral-preview-app API key" `
    -Validate { param($value) $value -match '^re_[A-Za-z0-9_-]+$' } `
    -Sensitive $true

  $publicVariables = [ordered]@{
    DODO_PAYMENTS_BUSINESS_ID = "bus_0Na3wgD5PCSJBuqMJ3qdP"
    DODO_PAYMENTS_PRODUCT_ID = "pdt_0NmSnEdwALRKJDCADcAai"
    RESEND_FROM_EMAIL = "notifications@updates.goneviral.in"
    RESEND_REPLY_TO = "goneviral.in@gmail.com"
    SENTRY_ORG = "altcorp-ri"
    SENTRY_PROJECT = "goneviral"
  }

  foreach ($entry in $publicVariables.GetEnumerator()) {
    Set-VercelPreviewVariable `
      -Name $entry.Key `
      -Value $entry.Value `
      -Sensitive $false
  }

  Write-Host "Success: provider values were stored in Vercel Preview." `
    -ForegroundColor Green
  Write-Host "Payments and application email remain safely disabled/mock." `
    -ForegroundColor Green
  Read-Host "Press Enter to close"
}
catch {
  Write-Host "Setup stopped: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "No later values were requested or stored." -ForegroundColor Yellow
  Read-Host "Press Enter to close"
  exit 1
}
finally {
  Pop-Location
}
