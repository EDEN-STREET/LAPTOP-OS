import { systemSnapshot } from './core.mjs';

export const ASSISTANT_INTENTS = Object.freeze({
  open_module: { risk:'safe', auto:true },
  show_next_step: { risk:'safe', auto:true },
  readonly_check: { risk:'safe', auto:true },
  create_plan: { risk:'plan-only', auto:true },
  explain: { risk:'safe', auto:true },
  unknown: { risk:'safe', auto:false }
});

const MODULES = Object.freeze({
  hub:'ultimate-hub.html', toolbox:'toolbox.html', builder:'builder.html',
  testlab:'testlab.html', wiki:'wiki.html', handbook:'handbuch.html',
  handbuch:'handbuch.html', projects:'projects.html', projekte:'projects.html',
  support:'support.html', academy:'academy.html', image:'image-studio.html',
  bild:'image-studio.html', markdown:'markdown-studio.html', diff:'diff-studio.html',
  setup:'setup.html', security:'security-architecture.html', sicherheit:'security-architecture.html'
});

function norm(text='') { return String(text).trim().toLocaleLowerCase('de'); }

function matchModule(text) {
  for (const [name,href] of Object.entries(MODULES)) if (text.includes(name)) return {name,href};
  return null;
}

function deterministicInterpret(text) {
  const q=norm(text);
  if (!q) return {intent:'unknown',confidence:0,summary:'Keine Eingabe.',next_step:'Beschreibe in normaler Sprache, was EDEN tun soll.'};
  const mod=matchModule(q);
  if (mod && /öffn|zeige|geh|starte|bring|wechsel/.test(q)) return {
    intent:'open_module',confidence:.99,summary:'EDEN-Modul öffnen: '+mod.name,
    action:{type:'navigate',href:mod.href},next_step:'Modul öffnen'
  };
  if (/nächste(r|n|s)? schritt|next step|was jetzt|weiter/.test(q)) return {
    intent:'show_next_step',confidence:.96,summary:'Nächsten sicheren Arbeitsschritt bestimmen.',
    action:{type:'next_step'},next_step:'Offene Nachweise und Status prüfen'
  };
  if (/doctor|status|prüf|check|diagnose|gesund/.test(q)) return {
    intent:'readonly_check',confidence:.93,summary:'Lesenden EDEN-Systemcheck ausführen.',
    action:{type:'readonly_check',check:q.includes('status')?'status':'doctor'},next_step:'Ergebnis prüfen'
  };
  if (/plan|workflow|vorbereiten|einrichten|installier|konfigurier|mach .* fertig/.test(q)) return {
    intent:'create_plan',confidence:.86,summary:'Änderung als PLAN_ONLY vorbereiten.',
    action:{type:'plan',goal:text.trim()},next_step:'Plan prüfen; reale Änderungen bleiben gesperrt'
  };
  if (/erklär|was ist|warum|hilfe/.test(q)) return {
    intent:'explain',confidence:.9,summary:'EDEN-Hilfe anzeigen.',
    action:{type:'explain',topic:text.trim()},next_step:'Erklärung lesen'
  };
  return {intent:'unknown',confidence:.45,summary:'Absicht nicht sicher erkannt.',next_step:'Ziel genauer beschreiben'};
}

export function validateDecision(raw, input='') {
  const d=raw && typeof raw==='object'?raw:{};
  const intent=Object.hasOwn(ASSISTANT_INTENTS,d.intent)?d.intent:'unknown';
  const confidence=Number.isFinite(Number(d.confidence))?Math.max(0,Math.min(1,Number(d.confidence))):0;
  const policy=ASSISTANT_INTENTS[intent];
  const action=d.action && typeof d.action==='object'?d.action:null;
  if (intent==='open_module' && (!action || action.type!=='navigate' || !Object.values(MODULES).includes(action.href))) {
    return {...deterministicInterpret(input),source:'policy-fallback',policy_block:'invalid navigation target'};
  }
  return {
    intent, confidence,
    summary:String(d.summary||'').slice(0,300),
    action,
    next_step:String(d.next_step||'').slice(0,240),
    risk:policy.risk,
    auto:policy.auto,
    source:String(d.source||'deterministic')
  };
}

async function askRemote(input,{url,timeoutMs=1500}={}) {
  const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try {
    const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:input}),signal:ctl.signal});
    if(!res.ok) throw new Error('mini-llm http '+res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

export async function interpretAssistant(input,{miniLlmUrl=process.env.EDEN_MINI_LLM_URL}={}) {
  const fallback=deterministicInterpret(input);
  if(!miniLlmUrl) return validateDecision({...fallback,source:'deterministic'},input);
  try {
    const remote=await askRemote(input,{url:miniLlmUrl});
    const checked=validateDecision({...remote,source:'needle2'},input);
    const threshold=Number(process.env.EDEN_ASSISTANT_CONFIDENCE||0.82);
    if(checked.confidence<threshold) return validateDecision({...fallback,source:'confidence-fallback'},input);
    return checked;
  } catch {
    return validateDecision({...fallback,source:'availability-fallback'},input);
  }
}

export function executeSafeAssistantAction(decision) {
  if(!decision || decision.risk!=='safe') return {status:'PLAN_ONLY',message:'Keine reale Änderung ausgeführt.'};
  if(decision.action?.type==='readonly_check') {
    const s=systemSnapshot();
    return {status:'OK',message:'Lesender Systemcheck abgeschlossen.',data:{platform:s.platform,arch:s.arch,node:s.node,node_suitable:s.node_suitable,ram_gib:s.ram_gib,ui_present:s.ui_present}};
  }
  if(decision.action?.type==='next_step') return {status:'OK',message:'Öffne Testlab/Ultimate Hub und prüfe den ersten offenen Nachweis.',href:'testlab.html'};
  if(decision.action?.type==='explain') return {status:'OK',message:'Nutze Support, Wiki oder Handbuch für die Erklärung.',href:'support.html'};
  if(decision.action?.type==='navigate') return {status:'OK',message:'Navigation freigegeben.',href:decision.action.href};
  return {status:'NOOP',message:'Keine automatische Aktion.'};
}
