import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { publicRoot, resolvePublicFile } from './core.mjs';
import { ModelGateway } from './model-gateway.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function json(res,status,value){
  const body=Buffer.from(JSON.stringify(value));
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store'});
  res.end(body);
}
function readJson(req,{max=32768}={}){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;
    req.on('data',c=>{size+=c.length;if(size>max){reject(new Error('Request body too large'));req.destroy();return}chunks.push(c)});
    req.on('end',()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{})}catch{reject(new Error('Invalid JSON'))}});
    req.on('error',reject);
  });
}
async function handleModelApi(req,res,url,gateway){
  const p=url.pathname;
  if(p==='/api/model-gateway/status'&&req.method==='GET'){
    json(res,200,{providers:gateway.providers(),selection:gateway.selection(),remote_default:false});return true;
  }
  if(p==='/api/model-gateway/models'&&req.method==='GET'){
    const provider=url.searchParams.get('provider')||'';
    try{json(res,200,{provider,models:await gateway.listModels(provider)})}catch(e){json(res,400,{error:String(e.message||e)})}return true;
  }
  if(p==='/api/model-gateway/connect'&&req.method==='POST'){
    try{
      const body=await readJson(req);
      const result=await gateway.connect(String(body.provider||''),{token:body.token,baseUrl:body.base_url});
      json(res,200,result);
    }catch(e){json(res,400,{error:String(e.message||e)})}
    return true;
  }
  if(p==='/api/model-gateway/disconnect'&&req.method==='POST'){
    try{const body=await readJson(req);gateway.disconnect(String(body.provider||''));json(res,200,{ok:true})}
    catch(e){json(res,400,{error:String(e.message||e)})}
    return true;
  }
  if(p==='/api/model-gateway/select'&&req.method==='POST'){
    try{const body=await readJson(req);json(res,200,gateway.select(String(body.role||''),String(body.provider||''),String(body.model||'')))}
    catch(e){json(res,400,{error:String(e.message||e)})}
    return true;
  }
  return false;
}

export function buildServer(root = publicRoot(), { modelGateway = new ModelGateway() } = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    let url;
    try { url = new URL(req.url, 'http://127.0.0.1/'); } catch { res.writeHead(400); res.end('Bad request'); return; }
    const localApiPage = url.pathname === '/model-gateway.html';
    res.setHeader('Content-Security-Policy', `default-src 'self' data:; connect-src ${localApiPage ? "'self'" : "'none'"}; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`);

    if(url.pathname.startsWith('/api/model-gateway/')){
      if(await handleModelApi(req,res,url,modelGateway))return;
      json(res,404,{error:'Unknown local API'});return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('Only GET/HEAD'); return; }
    const file = resolvePublicFile(url.pathname, root);
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

export function startServer({ port = 8765, root = publicRoot(), modelGateway } = {}) {
  return new Promise((resolve, reject) => {
    const server = buildServer(root,{modelGateway});
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
