import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const rootDir = path.resolve(import.meta.dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const outZipPath = path.join(publicDir, 'Audio-ToolZ-Windows.zip');
const distZipPath = path.join(distDir, 'Audio-ToolZ-Windows.zip');

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error('dist/index.html missing. Run `npm run build` before build-windows-kit.mjs.');
}
if (!fs.existsSync(path.join(publicDir, 'icon.ico')) || !fs.existsSync(path.join(publicDir, 'icon.png'))) {
  throw new Error('public/icon.ico or public/icon.png missing. Run `node scripts/generate-icons.mjs` first.');
}

// Standard CRC-32 lookup table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const rawBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const crc = crc32(rawBuf);
    const compressed = zlib.deflateRawSync(rawBuf, { level: 9 });
    const useDeflate = compressed.length < rawBuf.length;
    const payload = useDeflate ? compressed : rawBuf;
    const method = useDeflate ? 8 : 0;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, payload);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

const outSourcesZipPath = path.join(publicDir, 'Audio-ToolZ-Sources.zip');
const distSourcesZipPath = path.join(distDir, 'Audio-ToolZ-Sources.zip');

const EXCLUDED_DIST_FILES = new Set([
  'Audio-ToolZ-Windows.zip',
  'Audio-ToolZ-Sources.zip',
  'Audio-ToolZ-Presentation.mp4',
]);

function collectDistFiles(dir, prefix = 'dist') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIST_FILES.has(entry.name)) continue;
    if (/^(flyer-|matrix-).*\.jpg$/i.test(entry.name)) continue;
    if (prefix === 'dist/assets' && entry.name === 'aistudio') continue;
    const full = path.join(dir, entry.name);
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...collectDistFiles(full, rel));
    } else {
      out.push({ name: rel, data: fs.readFileSync(full) });
    }
  }
  return out;
}

const packageJsonContent = JSON.stringify(
  {
    name: 'audio-toolz',
    productName: 'Audio ToolZ',
    version: '1.3.0',
    description: 'Editeur audio de precision pour la creation musicale (GPL v3)',
    private: true,
    main: 'electron-main.cjs',
    scripts: {
      start: 'electron .',
    },
  },
  null,
  2,
);

const electronMainContent = `const { app, BrowserWindow, screen, session } = require('electron');
const fs = require('fs');
const path = require('path');

function loadWindowBounds() {
  const statePath = path.join(app.getPath('userData'), 'window-state.json');
  const fallback = { width: 1440, height: 900, isMaximized: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
      const displays = screen.getAllDisplays();
      const visible =
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        displays.some((d) => {
          const wa = d.workArea;
          return (
            parsed.x + 80 >= wa.x &&
            parsed.x <= wa.x + wa.width - 80 &&
            parsed.y + 40 >= wa.y &&
            parsed.y <= wa.y + wa.height - 40
          );
        });
      return {
        x: visible ? parsed.x : undefined,
        y: visible ? parsed.y : undefined,
        width: Math.max(820, parsed.width),
        height: Math.max(560, parsed.height),
        isMaximized: Boolean(parsed.isMaximized),
      };
    }
  } catch {}
  return fallback;
}

function saveWindowBounds(win) {
  if (!win || win.isDestroyed()) return;
  const statePath = path.join(app.getPath('userData'), 'window-state.json');
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(
      statePath,
      JSON.stringify({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      }),
      'utf8'
    );
  } catch {}
}

function createWindow() {
  const state = loadWindowBounds();
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 820,
    minHeight: 560,
    title: 'Audio ToolZ',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#161820',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (state.isMaximized) {
    win.maximize();
  }

  let saveTimer = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowBounds(win), 180);
  };
  win.on('move', scheduleSave);
  win.on('resize', scheduleSave);
  win.on('close', () => saveWindowBounds(win));

  // Strict zero-internet enforcement
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media' || permission === 'audioCapture');
  });
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allow =
      details.url.startsWith('file://') ||
      details.url.startsWith('devtools://') ||
      details.url.startsWith('data:') ||
      details.url.startsWith('blob:');
    callback({ cancel: !allow });
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;

const psInstallScript = `$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Installation des outils et creation de Audio ToolZ.exe" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Etape 1 : Verifier / Installer Node.js LTS
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Error "Winget introuvable. Installez Node.js LTS depuis https://nodejs.org puis relancez."
        exit 1
    }
    Write-Host "[1/4] Telechargement et installation de Node.js LTS..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "[1/4] Node.js deja installe : $(node -v)" -ForegroundColor Green
}

# Etape 2 : Installer Electron
Write-Host "[2/4] Telechargement et installation d'Electron..." -ForegroundColor Yellow
npm install --save-dev electron

# Etape 3 : Installer @electron/packager
Write-Host "[3/4] Telechargement et installation de @electron/packager..." -ForegroundColor Yellow
npm install --save-dev @electron/packager

# Etape 4 : Creer Audio ToolZ.exe avec icone integree + raccourci Bureau
Write-Host "[4/4] Creation de Audio ToolZ.exe avec icone Kick..." -ForegroundColor Yellow
npx @electron/packager . "Audio ToolZ" --platform=win32 --arch=x64 --icon=icon.ico --out=dist-exe --overwrite --ignore="^/dist-exe"

$ExePath = (Resolve-Path ".\\dist-exe\\Audio ToolZ-win32-x64\\Audio ToolZ.exe").Path
$Desktop = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop "Audio ToolZ.lnk"))
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = Split-Path $ExePath
$Shortcut.IconLocation = "$ExePath,0"
$Shortcut.Save()

Write-Host ""
Write-Host "Termine ! Audio ToolZ.exe est pret (logo integre) :" -ForegroundColor Green
Write-Host "  $ExePath" -ForegroundColor White
Write-Host "Un raccourci 'Audio ToolZ' a aussi ete ajoute sur votre Bureau." -ForegroundColor Green
`;

const batLauncher = `@echo off\r\ncd /d "%~dp0"\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Creer-Audio-ToolZ-EXE.ps1"\r\npause\r\n`;

const entries = [
  { name: 'package.json', data: packageJsonContent },
  { name: 'electron-main.cjs', data: electronMainContent },
  { name: 'icon.ico', data: fs.readFileSync(path.join(publicDir, 'icon.ico')) },
  { name: 'icon.png', data: fs.readFileSync(path.join(publicDir, 'icon.png')) },
  { name: 'Creer-Audio-ToolZ-EXE.ps1', data: psInstallScript },
  { name: 'Lancer-Creation-EXE.bat', data: batLauncher },
  ...collectDistFiles(distDir),
];

function collectSourceFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === 'dist-exe' ||
      entry.name === '.git' ||
      entry.name === '.playwright-cli' ||
      entry.name === '.aistudio' ||
      rel === 'src/assets/images'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full, rel));
    } else {
      out.push({ name: rel, data: fs.readFileSync(full) });
    }
  }
  return out;
}

fs.mkdirSync(publicDir, { recursive: true });
const zipBuf = buildZip(entries);
fs.writeFileSync(outZipPath, zipBuf);
fs.writeFileSync(distZipPath, zipBuf);
console.log(`Generated ${outZipPath} (${(zipBuf.length / 1024).toFixed(1)} KB, ${entries.length} entries)`);

const sourceFiles = [
  ...collectSourceFiles(path.join(rootDir, 'src'), 'src'),
  ...collectSourceFiles(path.join(rootDir, 'scripts'), 'scripts'),
  { name: 'public/icon.ico', data: fs.readFileSync(path.join(publicDir, 'icon.ico')) },
  { name: 'public/icon.png', data: fs.readFileSync(path.join(publicDir, 'icon.png')) },
  { name: 'index.html', data: fs.readFileSync(path.join(rootDir, 'index.html')) },
  { name: 'package.json', data: fs.readFileSync(path.join(rootDir, 'package.json')) },
  { name: 'tsconfig.json', data: fs.readFileSync(path.join(rootDir, 'tsconfig.json')) },
  { name: 'vite.config.ts', data: fs.readFileSync(path.join(rootDir, 'vite.config.ts')) },
  { name: 'electron-main.cjs', data: Buffer.from(electronMainContent.replace("'icon.png'", "'public', 'icon.png'"), 'utf8') },
];
const sourcesZipBuf = buildZip(sourceFiles);
fs.writeFileSync(outSourcesZipPath, sourcesZipBuf);
fs.writeFileSync(distSourcesZipPath, sourcesZipBuf);
console.log(`Generated ${outSourcesZipPath} (${(sourcesZipBuf.length / 1024).toFixed(1)} KB, ${sourceFiles.length} entries)`);
