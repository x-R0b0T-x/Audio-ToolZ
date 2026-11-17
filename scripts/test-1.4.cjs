const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRecentStore } = require('../electron/recent-store.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-toolz-test-'));
try {
  const history = path.join(root, 'data', 'recent-files.json');
  const store = createRecentStore(history);
  const names = Array.from({ length: 12 }, (_, i) => path.join(root, 'audio-' + i + '.wav'));
  for (const name of names) { fs.writeFileSync(name, 'test'); store.remember(name); }
  assert.equal(store.list().length, 10);
  assert.equal(store.list()[0].path, names[11]);
  store.remember(names[5]);
  assert.equal(store.list().length, 10);
  assert.equal(store.list()[0].path, names[5]);
  const reloaded = createRecentStore(history);
  assert.deepEqual(reloaded.list(), store.list());
  assert.equal(reloaded.find(reloaded.list()[0].id), names[5]);
  assert.equal(reloaded.find('id-inconnu'), undefined);
  assert.throws(() => reloaded.remember(path.join(root, 'absent.wav')));
  reloaded.clear();
  assert.equal(createRecentStore(history).list().length, 0);
  assert.ok(names.every((name) => fs.existsSync(name)));
  console.log('Historique : limite, ordre, doublons, persistance, erreurs et effacement valides.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
