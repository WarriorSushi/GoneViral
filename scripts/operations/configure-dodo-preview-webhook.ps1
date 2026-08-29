[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$projectId = "prj_pvt3u8wDLvJ3C4X9QTB7AlHUvL12"
$projectName = "goneviral"
$previewOrigin =
  "https://goneviral-phase15-preview-warriorsushis-projects.vercel.app"

function New-AlphaNumericSecret {
  $characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  $builder = [Text.StringBuilder]::new(32)
  for ($index = 0; $index -lt 32; $index++) {
    $characterIndex = [Security.Cryptography.RandomNumberGenerator]::GetInt32(
      $characters.Length
    )
    [void] $builder.Append($characters[$characterIndex])
  }
  return $builder.ToString()
}

function Set-VercelPreviewSecret {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [string] $Value
  )

  $variable = [pscustomobject]@{
    key = $Name
    value = $Value
    type = "sensitive"
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
}

function Read-DodoWebhookSecret {
  $secureValue = Read-Host "Paste the Dodo webhook signing secret" `
    -AsSecureString
  $valuePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $secureValue
  )

  try {
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
      $valuePointer
    ).Trim()
    if ($plainValue.Length -lt 16) {
      throw "The Dodo webhook signing secret is unexpectedly short."
    }
    Set-VercelPreviewSecret `
      -Name "DODO_PAYMENTS_WEBHOOK_KEY" `
      -Value $plainValue
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer)
    Remove-Variable plainValue -ErrorAction SilentlyContinue
  }
}

Push-Location $repositoryRoot
try {
  $link = Get-Content -LiteralPath ".vercel\project.json" -Raw |
    ConvertFrom-Json
  if ($link.projectId -ne $projectId -or $link.projectName -ne $projectName) {
    throw "Refusing to configure an unexpected Vercel project."
  }

  $bypassSecret = New-AlphaNumericSecret
  $bypassPayload = [pscustomobject]@{
    generate = [pscustomobject]@{
      secret = $bypassSecret
      note = "GoneViral Dodo test webhook"
    }
  } | ConvertTo-Json -Depth 4 -Compress
  $bypassPayload |
    pnpm exec vercel api /v1/projects/goneviral/protection-bypass `
      -X PATCH `
      --input - `
      --silent
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create the Dodo-specific Vercel bypass."
  }

  $webhookUrl =
    "$previewOrigin/api/webhooks/dodo?x-vercel-protection-bypass=$bypassSecret"
  Set-Clipboard -Value $webhookUrl

  Write-Host "Dodo TEST MODE webhook URL copied to the clipboard." `
    -ForegroundColor Cyan
  Write-Host "In Dodo: Developer > Webhooks > Add Endpoint."
  Write-Host "Description: GoneViral Phase 15 Preview"
  Write-Host "Paste the clipboard into Endpoint URL."
  Write-Host "Subscribe to exactly these events:"
  @(
    "payment.succeeded",
    "payment.failed",
    "payment.processing",
    "payment.cancelled",
    "refund.succeeded",
    "refund.failed",
    "dispute.opened",
    "dispute.expired",
    "dispute.accepted",
    "dispute.cancelled",
    "dispute.challenged",
    "dispute.won",
    "dispute.lost"
  ) | ForEach-Object { Write-Host "  - $_" }
  Write-Host (
    "Leave transformations/custom headers off and keep the default rate limit."
  )
  Read-Host "Create the endpoint, copy its signing secret, then press Enter"

  Read-DodoWebhookSecret

  pnpm exec vercel env add DODO_PAYMENTS_ENVIRONMENT preview `
    --value "test_mode" `
    --yes `
    --force `
    --no-sensitive
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to switch Dodo Preview configuration to test_mode."
  }

  Write-Host "Success: Dodo test webhook configuration was stored." `
    -ForegroundColor Green
  Write-Host "Payments remain disabled until certification." `
    -ForegroundColor Green
  Read-Host "Press Enter to close"
}
catch {
  Write-Host "Setup stopped: $($_.Exception.Message)" -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}
finally {
  Set-Clipboard -Value ""
  Remove-Variable bypassSecret, bypassPayload, webhookUrl `
    -ErrorAction SilentlyContinue
  Pop-Location
}
