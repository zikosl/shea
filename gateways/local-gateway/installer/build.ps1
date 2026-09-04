$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Protocol = Resolve-Path (Join-Path $Root "..\..\packages\pos-protocol")
$Stage = Join-Path $Root "stage"
$Runtime = Join-Path $Stage "runtime"

Push-Location $Root
try {
  npm ci
  npm run build
  npm prune --omit=dev
  Remove-Item $Stage -Recurse -Force -ErrorAction SilentlyContinue
  New-Item $Runtime -ItemType Directory -Force | Out-Null
  Copy-Item dist, prisma, node_modules, package.json, installer -Destination $Stage -Recurse
  $StagedProtocol = Join-Path $Stage "node_modules\@shea\pos-protocol"
  Remove-Item $StagedProtocol -Recurse -Force -ErrorAction SilentlyContinue
  New-Item $StagedProtocol -ItemType Directory -Force | Out-Null
  Copy-Item (Join-Path $Protocol "package.json"), (Join-Path $Protocol "dist") -Destination $StagedProtocol -Recurse

  $NodeVersion = (node -p "process.versions.node")
  $Archive = Join-Path $env:TEMP "node-v$NodeVersion-win-x64.zip"
  Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile $Archive
  $Checksums = (Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/SHASUMS256.txt").Content
  $ArchiveName = Split-Path $Archive -Leaf
  $ExpectedHash = (($Checksums -split "`n" | Where-Object { $_ -match "\s+$([regex]::Escape($ArchiveName))$" }) -split "\s+")[0]
  $ActualHash = (Get-FileHash $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if (!$ExpectedHash -or $ActualHash -ne $ExpectedHash.ToLowerInvariant()) { throw "Node.js runtime checksum verification failed" }
  Expand-Archive $Archive (Join-Path $env:TEMP "shea-node") -Force
  Copy-Item (Join-Path $env:TEMP "shea-node\node-v$NodeVersion-win-x64\node.exe") $Runtime

  $Iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
  if (!(Test-Path $Iscc)) { throw "Inno Setup 6 is required: https://jrsoftware.org/isinfo.php" }
  & $Iscc (Join-Path $PSScriptRoot "SheaLocalGateway.iss")
} finally {
  Pop-Location
}
