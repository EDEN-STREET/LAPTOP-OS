import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ui = readFileSync(path.join(root, 'web', 'index.html'), 'utf8');

test('EDEN-Term public UI cites its actual historical design provenance without inventing a filename', () => {
  assert.match(ui, /EDEN-Term/);
  assert.match(ui, /historischer EDEN-Term-Entwurf \(Original separat archiviert\)/);
  assert.doesNotMatch(ui, /DkZ_EDEN_Terminal_Demo\.html/);
  assert.match(ui, /keine Live-Dienste/);
});
