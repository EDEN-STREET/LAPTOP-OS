import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../'+p, import.meta.url),'utf8');

test('Ultimate Hub and local tools are packaged', async () => {
  for (const path of ['web/ultimate-hub.html','web/tool-registry.js','web/image-studio.html','web/local-tools.html','web/academy.html','web/support.html','web/markdown-studio.html','web/diff-studio.html','web/model-gateway.html']) {
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


test('Academy and Support are implemented as local non-privileged surfaces', async () => {
  const academy = await read('web/academy.html');
  const support = await read('web/support.html');
  assert.match(academy,/Wissenscheck/);
  assert.match(academy,/kein Security-Zertifikat/i);
  assert.match(support,/READ-ONLY/);
  assert.match(support,/Ursache beheben statt Test abzuschwächen/);
});

test('writing and diff studios avoid remote execution paths', async () => {
  for (const path of ['web/markdown-studio.html','web/diff-studio.html']) {
    const page = await read(path);
    assert.doesNotMatch(page,/\bfetch\s*\(|XMLHttpRequest|WebSocket|child_process|exec\s*\(/);
  }
});

test('image studio includes a local text layer stack', async () => {
  const page = await read('web/image-studio.html');
  for (const marker of ['id="layers"','id="addLayer"','state.layers','Text-Layer']) assert.match(page,new RegExp(marker.replace(/[.*+?^$()|[\]{}]/g,'\\$&')));
});


test('model gateway UI keeps credentials out of browser persistence', async () => {
  const page = await read('web/model-gateway.html');
  assert.doesNotMatch(page,/localStorage|sessionStorage|indexedDB/);
  assert.match(page,/type='password'|type="password"/);
  assert.match(page,/api\/model-gateway\/connect/);
});

test('agent mesh encodes cascade verification and anonymity boundary', async () => {
  const mesh = JSON.parse(await read('config/agent-mesh.json'));
  assert.equal(mesh.core.protocol,'A2A');
  assert.equal(mesh.execution_gate.llm_consensus_is_not_authorization,true);
  assert.deepEqual(mesh.execution_gate.small_worker_executes_only_after,['compiler-check','planner-check','node-policy-check']);
  assert.ok(mesh.arms.every(x=>x.goal_loop===true));
});
