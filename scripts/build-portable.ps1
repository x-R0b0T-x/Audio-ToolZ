$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$version = '1.3.0'
# Electron 44+ ne fournit plus Windows ia32.
$versions = npm view electron@43 version --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Impossible de résoudre Electron 43.' }
$electronVersion = @($versions)[-1]
if ($electronVersion -notmatch '^43\.\d+\.\d+$') { throw 'Version Electron inattendue.' }
npm install
if ($LASTEXITCODE -ne 0) { throw 'Installation npm en échec.' }
npm run lint
if ($LASTEXITCODE -ne 0) { throw 'Vérification TypeScript en échec.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Compilation Vite en échec.' }
# Les archives de distribution présentes dans public ne doivent pas être réembarquées.
Get-ChildItem dist -Recurse -File -Filter '*.zip' | Remove-Item -Force
$out = Join-Path $root 'release-output'
$bundle = Join-Path $out 'Audio-ToolZ-1.3-Windows-Portable'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item $bundle -ItemType Directory -Force | Out-Null
if (-not $env:RUNNER_TEMP) { throw 'Exécuter ce script dans GitHub Actions (RUNNER_TEMP requis).' }
$manifestPath = Join-Path $env:RUNNER_TEMP 'electron-SHASUMS256.txt'
Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$electronVersion/SHASUMS256.txt" -OutFile $manifestPath
$checksums = @{}
foreach ($manifestLine in (Get-Content -LiteralPath $manifestPath -Encoding utf8)) {
  if ($manifestLine.Trim() -match '^([a-fA-F0-9]{64})\s+\*?(.+)$') {
    $checksums[$Matches[2].Trim()] = $Matches[1]
  }
}
if ($checksums.Count -eq 0) { throw 'Manifeste SHA256 Electron vide ou illisible.' }
foreach ($target in @(@{ Electron = 'ia32'; Folder = 'x86' }, @{ Electron = 'x64'; Folder = 'x64' })) {
  $arch = $target.Electron
  $destination = Join-Path $bundle $target.Folder
  $archive = Join-Path $env:RUNNER_TEMP "electron-$arch.zip"
  $name = "electron-v$electronVersion-win32-$arch.zip"
  if (-not $checksums.ContainsKey($name)) {
    $available = ($checksums.Keys | Where-Object { $_ -like '*win32*' }) -join ', '
    throw "Somme de contrôle absente : $name. Entrées Windows disponibles : $available"
  }
  Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$electronVersion/$name" -OutFile $archive
  $expected = $checksums[$name]
  if ((Get-FileHash $archive -Algorithm SHA256).Hash -ine $expected) { throw 'Archive Electron corrompue.' }
  Expand-Archive $archive $destination
  Rename-Item (Join-Path $destination 'electron.exe') 'Audio ToolZ.exe'
  Copy-Item 'public/icon.ico' (Join-Path $destination 'icon.ico')
  $appDir = Join-Path $destination 'resources/app'
  New-Item $appDir -ItemType Directory -Force | Out-Null
  Copy-Item 'dist' (Join-Path $appDir 'dist') -Recurse
  Copy-Item 'electron/main.cjs' (Join-Path $appDir 'main.cjs')
  @{ name = 'audio-toolz'; version = $version; main = 'main.cjs'; private = $true } | ConvertTo-Json | Set-Content (Join-Path $appDir 'package.json') -Encoding utf8
  $required = @('Audio ToolZ.exe', 'locales', 'resources', 'chrome_100_percent.pak', 'chrome_200_percent.pak', 'ffmpeg.dll', 'icudtl.dat', 'resources.pak', 'v8_context_snapshot.bin', 'version', 'icon.ico')
  foreach ($item in $required) {
    if (-not (Test-Path (Join-Path $destination $item))) { throw "Fichier requis absent : $arch/$item" }
  }
  # Vérifie l’architecture réelle du fichier PE, sans confondre nom de dossier et binaire.
  $bytes = [IO.File]::ReadAllBytes((Join-Path $destination 'Audio ToolZ.exe'))
  $pe = [BitConverter]::ToInt32($bytes, 0x3c)
  $machine = [BitConverter]::ToUInt16($bytes, $pe + 4)
  $expectedMachine = if ($arch -eq 'ia32') { 0x014c } else { 0x8664 }
  if ($machine -ne $expectedMachine) { throw "Architecture PE incorrecte : $arch" }
}
Copy-Item 'CHANGELOG.md' $bundle
@"
Audio ToolZ 1.3 — Windows portable

Extraire entièrement le ZIP dans un dossier accessible en écriture.
Windows 32 bits : ouvrir x86\Audio ToolZ.exe
Windows 64 bits : ouvrir x64\Audio ToolZ.exe
Ne pas déplacer l’exécutable seul : conserver les DLL, ressources et dossiers.
Les préférences sont stockées dans user-data à côté de chaque exécutable.
Les documents audio doivent être exportés avant fermeture.
Cette distribution n’est pas signée numériquement.
Electron utilisé : $electronVersion
Les fichiers internes peuvent varier selon la version du moteur Electron.
Les fichiers Desktop.ini et les raccourcis ne sont pas requis.
"@ | Set-Content (Join-Path $bundle 'LIRE-MOI.txt') -Encoding utf8
Get-ChildItem $bundle -Recurse -File | ForEach-Object {
  '{0}  {1}' -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), ([IO.Path]::GetRelativePath($bundle, $_.FullName))
} | Set-Content (Join-Path $out 'MANIFEST-SHA256.txt') -Encoding utf8
Copy-Item (Join-Path $out 'MANIFEST-SHA256.txt') $bundle
$zip = Join-Path $out 'Audio-ToolZ-1.3-Windows-Portable-x86-x64.zip'
Compress-Archive -Path $bundle -DestinationPath $zip -CompressionLevel Optimal
'{0}  {1}' -f (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower(), (Split-Path $zip -Leaf) | Set-Content (Join-Path $out 'SHA256SUMS.txt') -Encoding ascii
