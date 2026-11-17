const path = require('node:path');
const fs = require('node:fs');

async function main() {
  const [toolsDir, exePath, iconPath] = process.argv.slice(2);
  if (!toolsDir || !exePath || !iconPath) throw new Error('Arguments manquants.');
  const ico = fs.readFileSync(iconPath);
  if (ico.length < 6 || ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) < 1) {
    throw new Error('Fichier ICO invalide.');
  }
  const entry = require.resolve('rcedit', { paths: [path.resolve(toolsDir)] });
  const mod = require(entry);
  const edit = typeof mod === 'function' ? mod : mod.rcedit;
  if (typeof edit !== 'function') throw new Error('API rcedit introuvable.');
  await edit(path.resolve(exePath), {
    icon: path.resolve(iconPath),
    'file-version': '1.4.0',
    'product-version': '1.4.0',
    'version-string': {
      ProductName: 'Audio ToolZ',
      FileDescription: 'Audio ToolZ',
      OriginalFilename: 'Audio ToolZ.exe'
    }
  });
  console.log('Icone et version integrees dans Audio ToolZ.exe.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
