export function generatePowerShellPortableScript(appUrl: string): string {
  const safeUrl = appUrl || 'http://localhost:3000';
  return `# Script PowerShell - Création étape par étape de "Audio ToolZ.exe"
# - Exécuté dans le dossier extrait de Audio-ToolZ-Windows.zip (avec package.json) :
#   installe Node.js + Electron un par un et compile Audio ToolZ.exe 100% hors-ligne
#   avec logo intégré, mémorisation de la position et sans accès Internet.
# - Exécuté ailleurs : génère un raccourci Bureau autonome vers ${safeUrl}.

$ErrorActionPreference = "Stop"
$DesktopPath = [Environment]::GetFolderPath("Desktop")

Write-Host "=== Création de Audio ToolZ.exe ===" -ForegroundColor Cyan

if (Test-Path ".\\package.json") {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "[1/4] Téléchargement et installation de Node.js LTS..." -ForegroundColor Yellow
        winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "[1/4] Node.js déjà présent : $(node -v)" -ForegroundColor Green
    }

    if (Test-Path ".\\vite.config.ts") {
        Write-Host "[2/4] Installation des dépendances et build Vite..." -ForegroundColor Yellow
        npm install
        npm run build
    }

    Write-Host "[3/4] Installation d'Electron et du packager Windows..." -ForegroundColor Yellow
    npm install --save-dev electron
    npm install --save-dev @electron/packager

    $pkg = Get-Content ".\\package.json" -Raw | ConvertFrom-Json
    $pkg | Add-Member -NotePropertyName "main" -NotePropertyValue "electron-main.cjs" -Force
    $pkg | ConvertTo-Json -Depth 16 | Set-Content ".\\package.json" -Encoding UTF8

    $IconFlag = if (Test-Path ".\\icon.ico") { "--icon=icon.ico" } elseif (Test-Path ".\\public\\icon.ico") { "--icon=public\\icon.ico" } else { "" }
    Write-Host "[4/4] Création de Audio ToolZ.exe..." -ForegroundColor Yellow
    if ($IconFlag) {
        npx @electron/packager . "Audio ToolZ" --platform=win32 --arch=x64 $IconFlag --out=dist-exe --overwrite --ignore="^/dist-exe"
    } else {
        npx @electron/packager . "Audio ToolZ" --platform=win32 --arch=x64 --out=dist-exe --overwrite --ignore="^/dist-exe"
    }

    $ExePath = (Resolve-Path ".\\dist-exe\\Audio ToolZ-win32-x64\\Audio ToolZ.exe").Path
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "Audio ToolZ.lnk"))
    $Shortcut.TargetPath = $ExePath
    $Shortcut.WorkingDirectory = Split-Path $ExePath
    $Shortcut.IconLocation = "$ExePath,0"
    $Shortcut.Save()

    Write-Host "Audio ToolZ.exe prêt (100 % hors-ligne) : $ExePath" -ForegroundColor Green
} else {
    $TargetDir = Join-Path $DesktopPath "Audio ToolZ"
    $ProfileDir = Join-Path $TargetDir "ProfilLocal"
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null
    $ExePath = Join-Path $TargetDir "Audio ToolZ.exe"

    $Browser = @(
        "$env:ProgramFiles (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
        "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
        "$env:ProgramFiles (x86)\\Google\\Chrome\\Application\\chrome.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $Browser) {
        winget install --id Microsoft.Edge -e --accept-package-agreements --accept-source-agreements
        $Browser = "$env:ProgramFiles (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    }

    $CsCode = @"
using System.Diagnostics;
class Program {
    static void Main() {
        Process.Start(new ProcessStartInfo {
            FileName = @"$Browser",
            Arguments = @"--app=${safeUrl} --user-data-dir=""$ProfileDir"" --window-size=1440,900",
            UseShellExecute = false
        });
    }
}
"@
    $CsPath = Join-Path $env:TEMP "AudioToolZLauncher.cs"
    Set-Content -Path $CsPath -Value $CsCode -Encoding UTF8
    $Csc = Get-ChildItem "C:\\Windows\\Microsoft.NET\\Framework64" -Filter "csc.exe" -Recurse -ErrorAction SilentlyContinue |
           Select-Object -First 1 -ExpandProperty FullName
    & $Csc /nologo /target:winexe /out:"$ExePath" "$CsPath"
    Remove-Item $CsPath -Force -ErrorAction SilentlyContinue

    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "Audio ToolZ.lnk"))
    $Shortcut.TargetPath = $ExePath
    $Shortcut.WorkingDirectory = $TargetDir
    $Shortcut.Save()

    Write-Host "Audio ToolZ.exe créé sur votre Bureau : $ExePath" -ForegroundColor Green
}
`;
}
