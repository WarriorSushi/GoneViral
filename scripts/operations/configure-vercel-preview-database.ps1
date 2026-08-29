[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRef = "fndssapjkaicxzeruuvv"
$poolerHost = "aws-0-ap-south-1.pooler.supabase.com"
$securePassword = Read-Host `
  "Enter the rotated GoneViral Supabase database password" `
  -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
  $securePassword
)

try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    $passwordPointer
  )
  $encodedPassword = [Uri]::EscapeDataString($plainPassword)
  $databaseUser = "postgres.$projectRef"

  $variables = @(
    [pscustomobject]@{
      key = "DATABASE_URL"
      value = "postgresql://${databaseUser}:${encodedPassword}@${poolerHost}:6543/postgres?sslmode=require"
      type = "sensitive"
      target = @("preview")
      comment = "GoneViral staging transaction pooler"
    }
    [pscustomobject]@{
      key = "DATABASE_DIRECT_URL"
      value = "postgresql://${databaseUser}:${encodedPassword}@${poolerHost}:5432/postgres?sslmode=require"
      type = "sensitive"
      target = @("preview")
      comment = "GoneViral staging administrative session pooler"
    }
  )

  foreach ($variable in $variables) {
    $payload = ConvertTo-Json -InputObject $variable -Depth 4 -Compress
    $payload | pnpm exec vercel api /v10/projects/goneviral/env `
      -X POST `
      --input - `
      --silent

    if ($LASTEXITCODE -ne 0) {
      throw "Failed to add $($variable.key) to Vercel Preview."
    }
  }

  Write-Host `
    "Success: encrypted Vercel Preview database variables added." `
    -ForegroundColor Green
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Variable plainPassword, encodedPassword, payload `
    -ErrorAction SilentlyContinue
}
