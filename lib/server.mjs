import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { publicRoot, resolvePublicFile } from './core.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

export function buildServer(root = publicRoot()) {
  return http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self' data:; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('Only GET/HEAD'); return; }
    let pathname;
    try { pathname = new URL(req.url, 'http://127.0.0.1/').pathname; } catch { res.writeHead(400); res.end('Bad request'); return; }
    const file = resolvePublicFile(pathname, root);
    if (!file) { res.writeHead(403); res.end('Blocked path'); return; }
    fs.stat(file, (err, stat) => {
      if (err || !stat?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('EDEN: Seite nicht vorhanden. Das vollstaendige Offline-Handbuch muss unter offline/EDEN_Handbuch_v0.8.0 liegen.'); return; }
      const realRoot = fs.realpathSync(root);
      let realFile;
      try { realFile = fs.realpathSync(file); } catch { res.writeHead(404); res.end('Missing file'); return; }
      if (!realFile.startsWith(realRoot + path.sep)) { res.writeHead(403); res.end('Blocked symlink'); return; }
      const mime = TYPES[path.extname(file).toLowerCase()];
      if (!mime) { res.writeHead(415); res.end('Blocked type'); return; }
      res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stat.size });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file).pipe(res);
    });
  });
}

export function startServer({ port = 8765, root = publicRoot() } = {}) {
  return new Promise((resolve, reject) => {
    const server = buildServer(root);
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
