#!/usr/bin/env node
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';
import { BUILD, TARGETS, systemSnapshot, buildPlan, safePlanPath, savePlanOnce, publicRoot, resolvePublicFile, installedWebRoot, installUserUI } from '../lib/core.mjs';
import { startServer } from '../lib/server.mjs';
import { publishGithub } from '../lib/github-publisher.mjs';
import { evaluateGate5Preflight, formatGate5ReportText, saveGate5Report } from '../lib/gate5-preflight.mjs';

const command = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'onboard';
const json = process.argv.includes('--json');
const noOpen = process.argv.includes('--no-open');
const planOnly = process.argv.includes('--plan-only');
const strictMode = process.argv.includes('--strict');
const readArgValue = (prefix) => {
  const found = process.argv.find((arg) => arg.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : undefined;
};
const banner = () => console.log(`\n◆ EDEN LAPTOP-OS · ${BUILD} · NPM ONLY · SICHERE VORSCHAU\n`);

function doctor() {
  const s = systemSnapshot();
  const checks = [
    { id:'node',ok:s.node_suitable,message:s.node_suitable?`Node ${s.node} bereit`:`Node ${s.node} zu alt: >=22 benötigt` },
    { id:'ui',ok:s.ui_present,message:s.ui_present?'EDEN-UI und Installer vorhanden':'EDEN-UI fehlt' },
    { id:'source',ok:s.offline_bundle_present,optional:true,message:s.offline_bundle_present?'Historisches Offline-Handbuch lokal':'Historisches Vollhandbuch separat (optional)'},
    { id:'installed',ok:s.user_install_present,optional:true,message:s.user_install_present?'EDEN-App im Benutzerprofil installiert':'Noch keine lokale dauerhafte App-Kopie'},
  ];
  const ok=checks.filter(x=>!x.optional).every(x=>x.ok);
  if (json) { console.log(JSON.stringify({snapshot:s,checks,can_preview:ok,hardware_verified:false,os_installed:false},null,2)); return ok?0:1; }
  banner();
  console.log(`System: ${s.platform}/${s.arch} · ${s.release}`);
  console.log(`Node: ${s.node} · CPU: ${s.cpus ?? '?'} · RAM: ${s.ram_gib} GiB · freier Platz ca.: ${s.free_disk_gib_approx ?? 'unbekannt'} GiB`);
  for(const c of checks) console.log(`${c.ok?'[OK]':c.optional?'[OPTIONAL]':'[FEHLER]'} ${c.message}`);
  console.log('Keine Gerätekennungen ausgelesen, keine Diagnose hochgeladen. Kein Windows-/Linux-System installiert.');
  return ok?0:1;
}

async function setup({launchAfter=true}={}) {
  if(doctor()!==0)return 1;
  if (!input.isTTY || !output.isTTY) { console.error('Setup erfordert eine interaktive CMD/PowerShell. Für reine Diagnose: eden doctor --json');return 2; }
  const rl=readline.createInterface({input,output});
  try{
    console.log('\nNur nach Rückfrage wird die EDEN-Browser-App in deinem Benutzerprofil abgelegt. Keine Administratorrechte, Autostart, OS-/Datenträgeränderung.');
    const exists=fs.existsSync(installedWebRoot());
    if(!exists){
      const accept=(await rl.question('EDEN-Browser-App als neue Version lokal speichern? [ja/NEIN]: ')).trim().toLowerCase();
      if(['ja','j','yes','y'].includes(accept)){
        try {console.log(`App installiert: ${installUserUI()}`);}catch(e){console.error(`App konnte nicht installiert werden: ${e.code||e.message}`);return 1;}
      }else{console.log('Keine dauerhafte App-Kopie erstellt. Die Vorschau kann aus dem npm-Cache gestartet werden.');}
    }else console.log('Vorhandene EDEN-Installation bleibt unverändert.');
    console.log('\nWähle dein Ziel (keine automatische Betriebssysteminstallation):');
    for(const [key,t] of Object.entries(TARGETS)) console.log(`  ${key}. ${t.label}\n     ${t.note}`);
    const choice=(await rl.question('Ziel [1-5 oder 0 = nur Oberfläche]: ')).trim();
    if(TARGETS[choice]){
      const plan=buildPlan(choice,systemSnapshot());
      console.log(`\nPlan: ${plan.target_label} · PLAN_ONLY · Datenträger-/Firmware-/Routeraktionen BLOCKIERT`);
      if(!fs.existsSync(safePlanPath())){
        const consent=(await rl.question('Nur lokalen Plan unter deinen Benutzerdaten speichern? [ja/NEIN]: ')).trim().toLowerCase();
        if(['ja','j','yes','y'].includes(consent)){
          try{console.log(`Plan gespeichert: ${savePlanOnce(plan)}`);}catch(e){console.error(`Plan nicht gespeichert: ${e.code||e.message}`);return 1;}
        }else console.log('Plan nicht gespeichert.');
      }else console.log(`Plan existiert bereits und wird NICHT überschrieben: ${safePlanPath()}`);
    }else console.log('Kein Installationsplan angelegt.');
  }finally{rl.close();}
  if(launchAfter && !planOnly) return await launch();
  return 0;
}

function status() {
  banner();
  console.log(fs.existsSync(installedWebRoot())?'App-Version lokal vorhanden.':'Keine dauerhafte EDEN-App-Kopie.');
  if(!fs.existsSync(safePlanPath())) {console.log('Kein Installationsplan.');return 0;}
  try{
    const p=JSON.parse(fs.readFileSync(safePlanPath(),'utf8'));
    console.log(`Ziel: ${p.target_label}\nStand: ${p.created_at}\nModus: ${p.mode}\nReale Aktionen freigegeben: NEIN`);return 0;
  }catch {console.error('Plan nicht lesbar. Nicht automatisch repariert.');return 1;}
}
function verify(){
  banner();
  const root=publicRoot(), file=resolvePublicFile('/',root);
  const check=Boolean(file && fs.existsSync(file) && fs.statSync(file).size>1000);
  console.log(`${check?'[OK]':'[FEHLER]'} UI vorhanden: ${file??'ungueltiger Pfad'}`);
  console.log('App-Prüfung ≠ Verifikation einer echten Betriebssysteminstallation.');
  return check?0:1;
}
function openLocalBrowser(url) {
  if(noOpen)return;
  try{
    const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
    const program=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
    const child=spawn(program,args,{detached:true,stdio:'ignore',windowsHide:true});
    child.on('error',()=>console.log(`Browser manuell öffnen: ${url}`));
    child.unref();
  }catch{console.log(`Browser manuell öffnen: ${url}`);}
}
async function launch() {
  if(verify()!==0)return 1;
  try{
    await startServer();
    const url='http://127.0.0.1:8765/setup.html';
    console.log(`\nEDEN läuft lokal: ${url}`);
    console.log('Nur 127.0.0.1, kein Remote-Server, keine Shell- oder Agentenrechte.\nBeenden: Strg+C');
    openLocalBrowser(url);
    return 0;
  }catch(e){console.error(`Startfehler: ${e.code||e.message} · ggf. läuft EDEN schon auf Port 8765.`);return 1;}
}
function gate5() {
  const profileId = readArgValue('--profile');
  const configPath = readArgValue('--config');
  const savePath = readArgValue('--save-report');
  const report = evaluateGate5Preflight({ profileId, configPath });
  if (savePath) {
    try {
      const saved = saveGate5Report(report, savePath);
      if (!json) console.log(`Gate-5-Bericht gespeichert (ohne Überschreiben): ${saved}`);
    } catch (e) {
      console.error(`Gate-5-Bericht konnte nicht gespeichert werden: ${e.code || e.message}`);
      return 1;
    }
  }
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatGate5ReportText(report));
  }
  if (report.config_error) return 2;
  if (strictMode && report.overall_status === 'BLOCKED') return 1;
  return 0;
}
function help(){
  banner();
  console.log('eden                Geführter npm-Einstieg mit lokaler Installation und UI\neden setup          Geführtes Setup mit Freigabe\neden launch         EDEN-Oberfläche sofort starten\neden doctor         Lesende Systemprüfung\neden gate5          Gate-5 Universal Hardware Preflight (strikt lesend, --json, --profile=...)\neden status         Vorhandenen Plan anzeigen\neden verify         UI-Dateiprüfung\neden publish-github GitHub-Branch+Draft-PR (nur nach Bestaetigung)\neden help           Hilfe');
  console.log('\nNur npm benötigt (Node.js inkl. npm muss bereits installiert sein).\nKeine Disk-/Firmware-/Router-/OS-Modifikation.');return 0;
}
try{
  const rc=command==='onboard'||command==='setup'?await setup():
    command==='launch'||command==='start'?await launch():
    command==='doctor'?doctor():
    command==='gate5'||command==='preflight'?gate5():
    command==='status'?status():
    command==='verify'?verify():command==='publish-github'?(await publishGithub({dryRun:process.argv.includes('--dry-run')}),0):help();
  process.exitCode=rc;
}catch(e){console.error(`EDEN hat sicher gestoppt: ${e.message}`);process.exitCode=1;}
