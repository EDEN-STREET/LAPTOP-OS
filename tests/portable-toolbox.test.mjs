import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildPortableToolbox, PORTABLE_FILES } from '../scripts/build-portable-toolbox.mjs';

const hash = b => crypto.createHash('sha256').update(b).digest('hex');

test('portable toolbox builder emits deterministic verified bundle', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eden-portable-'));
  t.after(() => fs.rm(root, {recursive:true,force:true}));
  const { target, manifest } = await buildPortableToolbox(path.join(root,'bundle'));
  assert.equal(manifest.build, '0.8.0-preview.10');
  assert.equal(manifest.entrypoint, 'index.html');
  for (const name of [...PORTABLE_FILES,'index.html','toolbox-profiles.json','README.txt']) {
    const data = await fs.readFile(path.join(target,name));
    assert.equal(manifest.files[name].sha256, hash(data), name+' hash mismatch');
  }
  const entry = await fs.readFile(path.join(target,'index.html'),'utf8');
  assert.match(entry,/EDEN PORTABLE TOOLBOX/);
  const profiles = JSON.parse(await fs.readFile(path.join(target,'toolbox-profiles.json'),'utf8'));
  assert.equal(profiles.profiles['tails-persistent'].install_target,'user-files');
  assert.ok(!('generated_at' in manifest), 'manifest must stay reproducible');
});
