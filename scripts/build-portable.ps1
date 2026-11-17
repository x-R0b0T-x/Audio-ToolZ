$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not $env:RUNNER_TEMP) { throw 'Executer ce script dans GitHub Actions.' }
$versions = npm view electron@43 version --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Impossible de resoudre Electron.' }
$electronVersion = @($versions)[-1]
if ($electronVersion -notmatch '^43\.\d+\.\d+$') { throw 'Version Electron inattendue.' }
npm install
if ($LASTEXITCODE -ne 0) { throw 'Installation npm en echec.' }
npm run lint
if ($LASTEXITCODE -ne 0) { throw 'Verification TypeScript en echec.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Compilation Vite en echec.' }
Get-ChildItem dist -Recurse -File -Filter '*.zip' | Remove-Item -Force
$out = Join-Path $PWD 'release-output'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
$bundle = Join-Path $out 'Audio-ToolZ-1.3-Windows-Portable-x64'
New-Item $bundle -ItemType Directory -Force | Out-Null
$manifestPath = Join-Path $env:RUNNER_TEMP 'electron-SHASUMS256.txt'
Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$electronVersion/SHASUMS256.txt" -OutFile $manifestPath
$checksums = @{}
foreach ($line in (Get-Content -LiteralPath $manifestPath -Encoding utf8)) {
  if ($line.Trim() -match '^([a-fA-F0-9]{64})\s+\*?(.+)$') {
    $checksums[$Matches[2].Trim()] = $Matches[1]
  }
}
$name = "electron-v$electronVersion-win32-x64.zip"
if (-not $checksums.ContainsKey($name)) { throw "Somme de controle absente : $name" }
$archive = Join-Path $env:RUNNER_TEMP 'electron-x64.zip'
Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$electronVersion/$name" -OutFile $archive
if ((Get-FileHash $archive -Algorithm SHA256).Hash -ine $checksums[$name]) { throw 'Archive Electron corrompue.' }
Expand-Archive $archive $bundle -Force
Rename-Item (Join-Path $bundle 'electron.exe') 'Audio ToolZ.exe'
Copy-Item 'public/icon.ico' (Join-Path $bundle 'icon.ico')
$appDir = Join-Path $bundle 'resources/app'
New-Item $appDir -ItemType Directory -Force | Out-Null
Copy-Item 'dist' (Join-Path $appDir 'dist') -Recurse
Copy-Item 'electron/main.cjs' (Join-Path $appDir 'main.cjs')
@{ name = 'audio-toolz'; version = '1.3.0'; main = 'main.cjs'; private = $true } | ConvertTo-Json | Set-Content (Join-Path $appDir 'package.json') -Encoding utf8
$toolsDir = Join-Path $env:RUNNER_TEMP 'audio-toolz-resource-tools'
npm install --prefix "$toolsDir" --no-package-lock --no-audit --no-fund rcedit@4.0.1
if ($LASTEXITCODE -ne 0) { throw 'Installation de rcedit en echec.' }
node scripts/set-exe-icon.cjs "$toolsDir" (Join-Path $bundle 'Audio ToolZ.exe') (Join-Path $bundle 'icon.ico')
if ($LASTEXITCODE -ne 0) { throw 'Integration de cette icone dans le binaire en echec.' }
$localeDir = Join-Path $bundle 'locales'
if (-not (Test-Path (Join-Path $localeDir 'fr.pak'))) { throw 'Langue francaise absente.' }
Get-ChildItem $localeDir -File | Where-Object { $_.Name -ne 'fr.pak' } | Remove-Item -Force
$licensesDir = Join-Path $bundle 'resources/licenses'
New-Item $licensesDir -ItemType Directory -Force | Out-Null
foreach ($license in @('LICENSE', 'LICENSES.chromium.html')) {
  if (-not (Test-Path (Join-Path $bundle $license))) { throw "Licence requise absente : $license" }
  Move-Item (Join-Path $bundle $license) (Join-Path $licensesDir $license) -Force
}
foreach ($item in @('Audio ToolZ.exe', 'locales/fr.pak', 'resources', 'chrome_100_percent.pak', 'chrome_200_percent.pak', 'ffmpeg.dll', 'icudtl.dat', 'resources.pak', 'v8_context_snapshot.bin', 'version', 'icon.ico')) {
  if (-not (Test-Path (Join-Path $bundle $item))) { throw "Fichier requis absent : $item" }
}
$bytes = [IO.File]::ReadAllBytes((Join-Path $bundle 'Audio ToolZ.exe'))
$pe = [BitConverter]::ToInt32($bytes, 0x3c)
if ([BitConverter]::ToUInt16($bytes, $pe + 4) -ne 0x8664) { throw 'Architecture du binaire incorrecte : x64 requis.' }
foreach ($unwanted in @('LIRE-MOI.txt', 'MANIFEST-SHA256.txt')) {
  $unwantedPath = Join-Path $bundle $unwanted
  if (Test-Path $unwantedPath) { Remove-Item $unwantedPath -Force }
}
Copy-Item 'CHANGELOG.md' $bundle
$zip = Join-Path $out 'Audio-ToolZ-1.3-Windows-Portable-x64.zip'
Compress-Archive -Path $bundle -DestinationPath $zip -CompressionLevel Optimal
'{0}  {1}' -f (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower(), (Split-Path $zip -Leaf) | Set-Content (Join-Path $out 'SHA256SUMS.txt') -Encoding ascii
