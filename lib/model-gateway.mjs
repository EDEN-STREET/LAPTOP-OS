const PROVIDERS = Object.freeze({
  openrouter: Object.freeze({label:'OpenRouter',baseUrl:'https://openrouter.ai/api/v1',modelsPath:'/models',chatPath:'/chat/completions',env:'OPENROUTER_API_KEY',credentialRequired:true,remote:true}),
  huggingface: Object.freeze({label:'Hugging Face Inference Providers',baseUrl:'https://router.huggingface.co/v1',modelsPath:'/models',chatPath:'/chat/completions',env:'HF_TOKEN',credentialRequired:true,remote:true}),
  'nvidia-hosted': Object.freeze({label:'NVIDIA NIM Hosted',baseUrl:'https://integrate.api.nvidia.com/v1',modelsPath:'/models',chatPath:'/chat/completions',env:'NVIDIA_API_KEY',credentialRequired:true,remote:true}),
  'nvidia-local': Object.freeze({label:'NVIDIA NIM Local',baseUrl:'http://127.0.0.1:8000/v1',modelsPath:'/models',chatPath:'/chat/completions',credentialRequired:false,remote:false,customLoopback:true})
});
const ROLES = new Set(['planner','compiler','worker','judge','embedder']);

function ensureProvider(id){const p=PROVIDERS[id];if(!p)throw new Error('Unknown model provider');return p}
function loopbackBase(raw){
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol))throw new Error('Local NIM URL must use http/https');
  if(!['127.0.0.1','localhost','::1','[::1]'].includes(u.hostname))throw new Error('Local NIM URL must stay on loopback');
  u.username='';u.password='';u.search='';u.hash='';
  return u.toString().replace(/\/$/,'');
}
function tokenBuffer(value){
  const text=String(value||'').trim();
  if(!text||text.length>4096||/[\r\n]/.test(text))throw new Error('Invalid credential');
  return Buffer.from(text,'utf8');
}
function normalizeModels(body){
  const list=Array.isArray(body?.data)?body.data:Array.isArray(body)?body:[];
  return list.map(x=>typeof x==='string'?{id:x}:{id:String(x?.id||'')})
    .filter(x=>x.id).slice(0,5000);
}

export class ModelGateway {
  constructor({fetchImpl=globalThis.fetch,env=process.env}={}){
    if(typeof fetchImpl!=='function')throw new Error('fetch unavailable');
    this.fetch=fetchImpl;this.env=env;this.secrets=new Map();this.baseUrls=new Map();this.selections=new Map();
  }
  providers(){
    return Object.entries(PROVIDERS).map(([id,p])=>({
      id,label:p.label,remote:p.remote,
      connected:this.secrets.has(id)||Boolean(p.env&&this.env[p.env])||(!p.credentialRequired&&id==='nvidia-local'),
      credential_source:this.secrets.has(id)?'session':p.env&&this.env[p.env]?'environment':null,
      base_url:this.baseUrls.get(id)||p.baseUrl
    }));
  }
  credential(id){
    const p=ensureProvider(id),buf=this.secrets.get(id);
    if(buf)return buf.toString('utf8');
    return p.env?String(this.env[p.env]||''): '';
  }
  baseUrl(id){const p=ensureProvider(id);return this.baseUrls.get(id)||p.baseUrl}
  setCredential(id,value){
    const p=ensureProvider(id);
    if(!p.credentialRequired&&!String(value||'').trim())return;
    const old=this.secrets.get(id);if(old)old.fill(0);
    this.secrets.set(id,tokenBuffer(value));
  }
  disconnect(id){
    ensureProvider(id);const old=this.secrets.get(id);if(old)old.fill(0);this.secrets.delete(id);
    this.baseUrls.delete(id);
    for(const [role,s] of [...this.selections])if(s.provider===id)this.selections.delete(role);
  }
  setBaseUrl(id,value){
    const p=ensureProvider(id);
    if(!p.customLoopback)throw new Error('Custom URL is not allowed for this provider');
    this.baseUrls.set(id,loopbackBase(value));
  }
  async request(id,path,{method='GET',body}={}){
    const p=ensureProvider(id),token=this.credential(id);
    if(p.credentialRequired&&!token)throw new Error('Credential required');
    const headers={'accept':'application/json'};
    if(token)headers.authorization='Bearer '+token;
    if(body!==undefined)headers['content-type']='application/json';
    const res=await this.fetch(this.baseUrl(id)+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error'});
    if(!res.ok)throw new Error(p.label+' returned HTTP '+res.status);
    return res.json();
  }
  async listModels(id){const p=ensureProvider(id);return normalizeModels(await this.request(id,p.modelsPath))}
  async connect(id,{token,baseUrl}={}){
    const p=ensureProvider(id);
    if(baseUrl!==undefined){if(!p.customLoopback)throw new Error('Base URL is fixed for remote providers');this.setBaseUrl(id,baseUrl)}
    if(token!==undefined&&String(token).trim())this.setCredential(id,token);
    const models=await this.listModels(id);
    return {provider:id,connected:true,models};
  }
  select(role,provider,model){
    if(!ROLES.has(role))throw new Error('Unknown model role');
    ensureProvider(provider);const id=String(model||'').trim();
    if(!id||id.length>300)throw new Error('Invalid model id');
    const value={provider,model:id};this.selections.set(role,value);return {role,...value};
  }
  selection(){return Object.fromEntries(this.selections)}
  async chat(role,messages,{temperature=0.1,max_tokens=1024}={}){
    const s=this.selections.get(role);if(!s)throw new Error('No model selected for role '+role);
    const p=ensureProvider(s.provider);
    const body={model:s.model,messages,temperature,max_tokens};
    return this.request(s.provider,p.chatPath,{method:'POST',body});
  }
}

export const MODEL_PROVIDERS = PROVIDERS;
