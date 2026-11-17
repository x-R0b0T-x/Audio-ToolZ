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
foreach ($item in @('Audio ToolZ.exe', 'locales', 'resources', 'chrome_100_percent.pak', 'chrome_200_percent.pak', 'ffmpeg.dll', 'icudtl.dat', 'resources.pak', 'v8_context_snapshot.bin', 'version', 'icon.ico')) {
  if (-not (Test-Path (Join-Path $bundle $item))) { throw "Fichier requis absent : $item" }
}
$bytes = [IO.File]::ReadAllBytes((Join-Path $bundle 'Audio ToolZ.exe'))
$pe = [BitConverter]::ToInt32($bytes, 0x3c)
if ([BitConverter]::ToUInt16($bytes, $pe + 4) -ne 0x8664) { throw 'Architecture du binaire incorrecte : x64 requis.' }
Copy-Item 'CHANGELOG.md' $bundle
@"
Audio ToolZ 1.3 - Windows x64 uniquement
Extraire entierement le ZIP dans un dossier accessible en ecriture.
Lancer Audio ToolZ.exe sans deplacer les DLL et dossiers associes.
Les preferences sont conservees dans user-data a cote du fichier executable.
Exporter les documents audio avant fermeture.
Distribution non signee numeriquement. Electron : $electronVersion
Les fichiers internes varient selon le moteur ; Desktop.ini non requis.
"@ | Set-Content (Join-Path $bundle 'LIRE-MOI.txt') -Encoding utf8
$manifest = @(Get-ChildItem $bundle -Recurse -File | ForEach-Object {
  '{0}  {1}' -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), ([IO.Path]::GetRelativePath($bundle, $_.FullName))
})
$manifest | Set-Content (Join-Path $bundle 'MANIFEST-SHA256.txt') -Encoding utf8
$zip = Join-Path $out 'Audio-ToolZ-1.3-Windows-Portable-x64.zip'
Compress-Archive -Path $bundle -DestinationPath $zip -CompressionLevel Optimal
'{0}  {1}' -f (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower(), (Split-Path $zip -Leaf) | Set-Content (Join-Path $out 'SHA256SUMS.txt') -Encoding ascii
