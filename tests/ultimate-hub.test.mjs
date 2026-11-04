import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../'+p, import.meta.url),'utf8');

test('Ultimate Hub and local tools are packaged', async () => {
  for (const path of ['web/ultimate-hub.html','web/tool-registry.js','web/image-studio.html','web/local-tools.html']) {
    const body = await read(path);
    assert.ok(body.length > 500, path+' should contain a real implementation');
  }
});

test('registry exposes confirmed modules and new local tools', async () => {
  const registry = await read('web/tool-registry.js');
  for (const id of ['eden-term','builder','testlab','image-studio','local-tools']) assert.match(registry,new RegExp("id:'"+id+"'"));
  assert.match(registry,/status:'planned'/);
});

test('new browser tools are local-only by construction', async () => {
  const pages = await Promise.all(['web/ultimate-hub.html','web/image-studio.html','web/local-tools.html'].map(read));
  for (const page of pages) {
    assert.doesNotMatch(page,/<script[^>]+src=["']https?:\/\//i);
    assert.doesNotMatch(page,/\bfetch\s*\(/);
    assert.doesNotMatch(page,/XMLHttpRequest|WebSocket|EventSource/);
  }
});

test('image studio contains undo, redo and export controls', async () => {
  const page = await read('web/image-studio.html');
  for (const marker of ['id="undo"','id="redo"','id="export"','canvas.toBlob','URL.createObjectURL']) assert.match(page,new RegExp(marker.replace(/[.*+?^$()|[\]{}]/g,'\\$&')));
});

test('utility lab contains SHA-256, JSON and filename tools', async () => {
  const page = await read('web/local-tools.html');
  assert.match(page,/crypto\.subtle\.digest\('SHA-256'/);
  assert.match(page,/JSON\.parse/);
  assert.match(page,/sanitizeName/);
});
