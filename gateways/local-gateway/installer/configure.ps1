$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Node = Join-Path $Root "runtime\node.exe"

$DatabaseUrlSecure = Read-Host "Local PostgreSQL URL" -AsSecureString
$CloudUrl = Read-Host "Cloud Gateway API URL"
$StoreId = Read-Host "Store ID"
$GatewayTokenSecure = Read-Host "One-time gateway token" -AsSecureString
$PairingCode = Read-Host "POS pairing code (leave empty to generate one)"

$DatabaseUrlPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DatabaseUrlSecure)
$GatewayTokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GatewayTokenSecure)
try {
  $env:SHEA_CONFIG_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($DatabaseUrlPointer)
  $env:SHEA_CONFIG_GATEWAY_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($GatewayTokenPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($DatabaseUrlPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($GatewayTokenPointer)
}

$Arguments = @(
  (Join-Path $Root "dist\configure.js"),
  "--cloud-url", $CloudUrl,
  "--store-id", $StoreId
)
if ($PairingCode) { $Arguments += @("--pairing-code", $PairingCode) }
& $Node $Arguments
if ($LASTEXITCODE -ne 0) { throw "Gateway configuration failed" }
$env:SHEA_CONFIG_DATABASE_URL = $null
$env:SHEA_CONFIG_GATEWAY_TOKEN = $null

$env:SHEA_GATEWAY_ENV = Join-Path $env:ProgramData "Shea\Local Gateway\gateway.env"
& $Node (Join-Path $Root "node_modules\prisma\build\index.js") migrate deploy --schema (Join-Path $Root "prisma\schema.prisma")
if ($LASTEXITCODE -ne 0) { throw "Database migration failed" }

& $Node (Join-Path $Root "dist\windows-service.js") install
Write-Host "Shea Local Gateway is configured. Pair POS terminals using this server's LAN address on port 3510." -ForegroundColor Green
Read-Host "Press Enter to close"
