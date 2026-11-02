// EDEN release publisher: uploads ONLY a fixed allowlist of public source files.
// No git checkout, no secrets, no force pushes, no writes to main.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { ROOT } from './core.mjs';

export const REPO='EDEN-STREET/LAPTOP-OS';
export const BRANCH='feature/eden-npm-windows-v0.8.0-preview.3';
export const FILES=[
 'README.md','LICENSE','package.json','npm-shrinkwrap.json',
 'bin/eden.mjs','lib/core.mjs','lib/server.mjs','lib/github-publisher.mjs',
 'web/index.html','web/setup.html','web/handbuch.html','web/builder.html',
 'web/toolbox.html','web/grimoire.html','web/testlab.html','web/quellen.html',
 'docs/GITHUB_RELEASE_OHNE_GIT.md','docs/WINDOWS_SETUP.md',
 'docs/QUELLEN_UND_VERSIONEN.md','docs/ROADMAP_NAECHSTE_SCHRITTE.md',
 'docs/SICHERHEITSVERTRAG.md','docs/PLAYWRIGHT_UND_RELEASE.md',
 'tests/npm-only.test.mjs','tests/setup.test.mjs',
 'tests/publish.test.mjs'
];

export function getPublicPayload(root=ROOT){
 const rootReal=fs.realpathSync(root); const entries=[];
 for(const p of FILES){
  const abs=path.resolve(rootReal,p);
  if(!abs.startsWith(rootReal+path.sep)) throw new Error('Unsafe release path');
  const stats=fs.lstatSync(abs);
  if(!stats.isFile()||stats.isSymbolicLink()||stats.size>1024*1024)throw new Error(`Release-Datei abgelehnt: ${p}`);
  const content=fs.readFileSync(abs,'utf8');
  if(content.includes('\uFFFD'))throw new Error(`Beschaedigtes UTF-8 in ${p}`);
  const hash=crypto.createHash('sha256').update(content,'utf8').digest('hex');
  entries.push({path:p,mode:'100644',type:'blob',content,sha256:hash,bytes:Buffer.byteLength(content,'utf8')});
 }
 return entries;
}

function gh(method, endpoint, payload){
 const args=['api','-X',method,endpoint];
 if(payload!==undefined)args.push('--input','-');
 const r=spawnSync('gh',args,{input:payload===undefined?undefined:JSON.stringify(payload),encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,windowsHide:true,env:{...process.env,GH_PAGER:'cat'}});
 if(r.error){if(r.error.code==='ENOENT')throw new Error('GitHub CLI gh ist nicht installiert oder nicht im PATH');throw r.error;}
 if(r.status!==0)throw new Error(`GitHub API ${method} ${endpoint}: ${String(r.stderr||r.stdout).slice(0,450)}`);
 try{return JSON.parse(r.stdout)}catch{throw new Error('Unerwartete GitHub-API-Antwort');}
}

export async function publishGithub({dryRun=false}={}){
 const entries=getPublicPayload();
 console.log(`EDEN GitHub-Publisher · ${REPO} · ${BRANCH}`);
 console.log('Nur diese festen, oeffentlichen Projektquellen werden verwendet:');
 for(const f of entries)console.log(`  ${f.path} (${f.bytes} B; SHA256 ${f.sha256.slice(0,12)})`);
 console.log(`\n${entries.length} Textdateien; keine privaten Archive, keine Profil-/Geratedaten, keine Passwoerter.`);
 if(dryRun){console.log('\nDRY RUN – keine GitHub-Aktion ausgefuehrt.');return {dry_run:true,files:entries.length};}
 if(!stdin.isTTY || !stdout.isTTY)throw new Error('Veroeffentlichung erfordert eine interaktive Eingabeaufforderung. Nur Vorschau: --dry-run');
 console.log('\nACHTUNG: EDEN-STREET/LAPTOP-OS ist ein OEFFENTLICHES GitHub-Repository.');
 console.log('Es wird nur ein neuer Branch und ein DRAFT Pull Request erstellt; main bleibt unveraendert.');
 const rl=readline.createInterface({input:stdin,output:stdout});
 let answer;
 try{answer=(await rl.question(`Zum Veroeffentlichen exakt PUBLISH ${REPO} eintippen: `)).trim();}finally{rl.close();}
 if(answer!==`PUBLISH ${REPO}`){console.log('Abgebrochen. Keine GitHub-Schreiboperation.');return {cancelled:true};}
 const meta=gh('GET',`repos/${REPO}`);
 if(meta.full_name!==REPO || meta.default_branch!=='main')throw new Error('Repository/Default-Branch hat sich geaendert. Abbruch.');
 if(meta.private!==false)throw new Error('Repository-Sichtbarkeit ist anders als erwartet. Abbruch.');
 const base=gh('GET',`repos/${REPO}/git/ref/heads/main`);
 const mainSha=base?.object?.sha;
 if(!/^[0-9a-f]{40}$/.test(mainSha||''))throw new Error('main SHA konnte nicht geprueft werden.');
 const commit=gh('GET',`repos/${REPO}/git/commits/${mainSha}`);
 const baseTree=commit?.tree?.sha;
 if(!/^[0-9a-f]{40}$/.test(baseTree||''))throw new Error('main Tree SHA ungueltig.');
 // Reject existing branch and any unforeseen collisions with existing files.
 try{gh('GET',`repos/${REPO}/git/ref/heads/${BRANCH}`);throw new Error('Release-Branch existiert bereits – keine automatische Ueberschreibung.');}
 catch(e){if(!/HTTP 404|Not Found|not found/i.test(String(e.message)))throw e;}
 const inventory=gh('GET',`repos/${REPO}/git/trees/${baseTree}?recursive=1`);
 const old=Array.isArray(inventory.tree)?inventory.tree:[];
 if(inventory.truncated)throw new Error('Repo-Inventar unvollstaendig. Abbruch.');
 const existing=new Set(old.filter(x=>x.type==='blob').map(x=>x.path));
 const permittedCollisions=new Set(['README.md','LICENSE']);
 for(const file of entries){if(existing.has(file.path)&&!permittedCollisions.has(file.path))throw new Error(`Unerwartete vorhandene Datei: ${file.path}. Manuell vergleichen.`);}
 // Verify that the pre-existing LICENSE is not replaced by a different license.
 const license=old.find(x=>x.path==='LICENSE');
 const ourLicense=entries.find(x=>x.path==='LICENSE');
 if(license){const raw=gh('GET',`repos/${REPO}/git/blobs/${license.sha}`);if(raw.encoding!=='base64'||Buffer.from(raw.content.replace(/\s/g,''),'base64').toString('utf8')!==ourLicense.content)throw new Error('LICENSE stimmt nicht mit dem Bestand ueberein. Kein Ueberschreiben.');}
 const tree=gh('POST',`repos/${REPO}/git/trees`,{base_tree:baseTree,tree:entries.map(({path,mode,type,content})=>({path,mode,type,content}))});
 if(!/^[0-9a-f]{40}$/.test(tree.sha||''))throw new Error('GitHub tree create failed');
 const newCommit=gh('POST',`repos/${REPO}/git/commits`,{message:'feat: EDEN Windows npm-only guided setup preview.3',tree:tree.sha,parents:[mainSha]});
 if(!/^[0-9a-f]{40}$/.test(newCommit.sha||''))throw new Error('GitHub commit create failed');
 gh('POST',`repos/${REPO}/git/refs`,{ref:`refs/heads/${BRANCH}`,sha:newCommit.sha});
 console.log(`Branch erfolgreich erstellt: https://github.com/${REPO}/tree/${BRANCH}`);
 let url=`https://github.com/${REPO}/compare/main...${BRANCH}?expand=1`;
 try{const pr=gh('POST',`repos/${REPO}/pulls`,{title:'EDEN Windows npm-only Onboarding v0.8.0-preview.3',head:BRANCH,base:'main',draft:true,body:'Nicht-destruktiver Windows/npm Starter. Kein OS-/Firmware-/Router-Schreiben. Tests und Security Review vor Merge. Ausschliesslich oeffentliche Quelltexte, keine EDEN Quellarchive.\n\nBitte zuerst CI, UX, Sicherheitsgrenzen und `npm exec` pruefen.'});url=pr.html_url||url;}
 catch(e){console.log('Pull Request konnte nicht automatisch angelegt werden. Die vorbereitete Vergleichsansicht lautet:');console.log(String(e.message));}
 console.log(`\nReview: ${url}\nmain wurde nicht geaendert.`);
 return {branch:BRANCH,review_url:url,files:entries.length};
}
