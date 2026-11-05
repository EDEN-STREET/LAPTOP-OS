import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BUILD, ROOT } from '../lib/core.mjs';

export const PORTABLE_FILES = Object.freeze([
  'portable-toolbox.html',
  'toolbox.html',
  'tool-registry.js',
  'eden-hub.css',
  'image-studio.html',
  'local-tools.html',
  'markdown-studio.html',
  'diff-studio.html',
  'academy.html',
  'support.html',
  'wiki.html',
  'handbuch.html'
]);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function buildPortableToolbox(outDir = path.join(ROOT, 'dist', 'eden-toolbox-portable-'+BUILD)) {
  const sourceWeb = path.join(ROOT, 'web');
  const target = path.resolve(outDir);
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });

  const manifest = {
    schema_version: 1,
    product: 'EDEN Portable Toolbox',
    build: BUILD,
    entrypoint: 'index.html',
    files: {}
  };

  for (const name of PORTABLE_FILES) {
    const src = path.join(sourceWeb, name);
    const data = await fs.readFile(src);
    await fs.writeFile(path.join(target, name), data);
    manifest.files[name] = { sha256: sha256(data), bytes: data.length };
  }

  const entry = await fs.readFile(path.join(sourceWeb, 'portable-toolbox.html'));
  await fs.writeFile(path.join(target, 'index.html'), entry);
  manifest.files['index.html'] = { sha256: sha256(entry), bytes: entry.length };

  const profiles = await fs.readFile(path.join(ROOT, 'config', 'toolbox-profiles.json'));
  await fs.writeFile(path.join(target, 'toolbox-profiles.json'), profiles);
  manifest.files['toolbox-profiles.json'] = { sha256: sha256(profiles), bytes: profiles.length };

  const readme = [
    'EDEN Portable Toolbox '+BUILD,
    '',
    'Start: index.html im lokalen Browser öffnen.',
    'Für Tails: im Persistent Storage oder auf separatem Medium ablegen.',
    'Für Qubes: in einem EDEN App Qube verwenden; nicht in dom0.',
    'Für Qubes-Whonix: in einer Workstation/App Qube verwenden; nicht in sys-whonix.',
    '',
    'PORTABLE-MANIFEST.json enthält SHA-256-Prüfsummen aller Dateien.',
    ''
  ].join('\n');
  await fs.writeFile(path.join(target, 'README.txt'), readme, 'utf8');
  const readmeBytes = Buffer.from(readme);
  manifest.files['README.txt'] = { sha256: sha256(readmeBytes), bytes: readmeBytes.length };

  await fs.writeFile(path.join(target, 'PORTABLE-MANIFEST.json'), JSON.stringify(manifest, null, 2)+'\n', 'utf8');
  return { target, manifest };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const idx = process.argv.indexOf('--out');
  const out = idx >= 0 && process.argv[idx+1] ? process.argv[idx+1] : undefined;
  const result = await buildPortableToolbox(out);
  console.log(JSON.stringify({ product: result.manifest.product, build: result.manifest.build, target: result.target, files: Object.keys(result.manifest.files).length }));
}
