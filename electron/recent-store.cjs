const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function createRecentStore(filename) {
  const key = (p) => process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p);
  let entries = [];
  try {
    const raw = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (Array.isArray(raw)) {
      const seen = new Set();
      entries = raw.filter((p) => typeof p === 'string' && path.isAbsolute(p)).map((p) => path.resolve(p)).filter((p) => {
        const k = key(p); if (seen.has(k)) return false; seen.add(k); return true;
      }).slice(0, 10);
    }
  } catch (error) { if (error.code !== 'ENOENT') console.warn('Historique illisible', error.message); }
  const persist = () => {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename + '.tmp', JSON.stringify(entries), 'utf8');
    fs.renameSync(filename + '.tmp', filename);
  };
  const id = (p) => crypto.createHash('sha256').update(key(p)).digest('hex');
  return {
    list: () => entries.map((p) => ({ id: id(p), name: path.basename(p), path: p })),
    find: (wanted) => entries.find((p) => id(p) === wanted),
    remember(p) {
      if (typeof p !== 'string' || !path.isAbsolute(p) || !fs.statSync(p).isFile()) throw new Error('Fichier invalide.');
      p = path.resolve(p);
      entries = [p, ...entries.filter((old) => key(old) !== key(p))].slice(0, 10);
      persist();
    },
    clear() { entries = []; persist(); }
  };
}
module.exports = { createRecentStore };
