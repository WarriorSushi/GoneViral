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

function Read-ResendWebhookSecret {
  $secureValue = Read-Host "Paste the Resend webhook signing secret" `
    -AsSecureString
  $valuePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $secureValue
  )

  try {
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
      $valuePointer
    ).Trim()
    if (-not $plainValue.StartsWith("whsec_") -or $plainValue.Length -lt 20) {
      throw "The Resend webhook signing secret has an unexpected format."
    }
    Set-VercelPreviewSecret `
      -Name "RESEND_WEBHOOK_SECRET" `
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
      note = "GoneViral Resend preview webhook"
    }
  } | ConvertTo-Json -Depth 4 -Compress
  $bypassPayload |
    pnpm exec vercel api /v1/projects/goneviral/protection-bypass `
      -X PATCH `
      --input - `
      --silent
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create the Resend-specific Vercel bypass."
  }

  $webhookUrl =
    "$previewOrigin/api/webhooks/resend?x-vercel-protection-bypass=$bypassSecret"
  Set-Clipboard -Value $webhookUrl

  Write-Host "Resend webhook URL copied to the clipboard." `
    -ForegroundColor Cyan
  Write-Host "In Resend: Webhooks > Add Webhook."
  Write-Host "Endpoint name: GoneViral Phase 15 Preview"
  Write-Host "Paste the clipboard into Endpoint URL."
  Write-Host "Subscribe to exactly these events:"
  @(
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.suppressed"
  ) | ForEach-Object { Write-Host "  - $_" }

  while ($true) {
    $choice = Read-Host (
      "Type R to recopy the URL, or press Enter after creating the " +
      "webhook and copying its signing secret"
    )
    if ($choice.Trim().Equals("R", [StringComparison]::OrdinalIgnoreCase)) {
      Set-Clipboard -Value $webhookUrl
      Write-Host "Resend webhook URL copied again." -ForegroundColor Cyan
      continue
    }
    break
  }

  Read-ResendWebhookSecret

  pnpm exec vercel env add EMAIL_DELIVERY_MODE preview `
    --value "mock" `
    --yes `
    --force `
    --no-sensitive
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to keep Preview email delivery in mock mode."
  }

  Write-Host "Success: Resend webhook configuration was stored." `
    -ForegroundColor Green
  Write-Host "Email delivery remains in mock mode until certification." `
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
