$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = if ($env:SERVER_VERSION) { $env:SERVER_VERSION } else { "dev" }
$commit = try { (git rev-parse --short=12 HEAD).Trim() } catch { "unknown" }
$date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$serverVersionPkg = "github.com/lin-snow/dox/apps/server/internal/version"
$serverOut = Join-Path $root "dist/windows-amd64/dox-server.exe"
$cliOut = Join-Path $root "dist/windows-amd64/dox.exe"
$packageDir = Join-Path $root "dist/windows-amd64"
$zipOut = Join-Path $root "dist/dox-windows-amd64.zip"

New-Item -ItemType Directory -Force (Split-Path $serverOut), (Split-Path $cliOut) | Out-Null
Remove-Item $zipOut -Force -ErrorAction SilentlyContinue

Write-Host ">>> building dox-server.exe"
Push-Location (Join-Path $root "apps/server")
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "1"
go build -trimpath `
  -ldflags "-s -w -X $serverVersionPkg.version=$version -X $serverVersionPkg.commit=$commit -X $serverVersionPkg.date=$date -X $serverVersionPkg.builtBy=windows-build" `
  -o $serverOut ./cmd/dox-server
$goExit = $LASTEXITCODE
Pop-Location
if ($goExit -ne 0) { throw "go build failed" }

Write-Host ">>> building dox.exe"
bun build --compile --target=bun-windows-x64 ./apps/cli/src/index.ts --outfile $cliOut
if ($LASTEXITCODE -ne 0) { throw "bun build failed" }

@"
dox for Windows

Run .\dox.exe from this directory. The CLI starts the bundled server for each
command and stores the SQLite database under %LOCALAPPDATA%\dox\data.

Requirements: none. Go, Bun, Node.js, and Docker are not needed at runtime.

Remote server mode:
  .\dox.exe --server https://example.com list
  .\dox.exe login --server https://example.com

Local data:
  %LOCALAPPDATA%\dox\data\dox.db
  %LOCALAPPDATA%\dox\profiles\local.toml
"@ | Set-Content (Join-Path $packageDir "README.txt") -Encoding UTF8

Push-Location $packageDir
Compress-Archive -Path "dox.exe", "dox-server.exe", "README.txt" -DestinationPath $zipOut -Force
Pop-Location
Write-Host ">>> created $zipOut"
