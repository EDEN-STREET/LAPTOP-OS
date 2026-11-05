import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ModelGateway } from '../lib/model-gateway.mjs';
import { buildServer } from '../lib/server.mjs';
import { ROOT } from '../lib/core.mjs';

function fakeFetch(log=[]){
  return async (url,opts={})=>{
    log.push({url:String(url),opts});
    return {
      ok:true,status:200,
      async json(){return {data:[{id:'qwen/test-small'},{id:'qwen/test-large'}]}}
    };
  };
}

test('model gateway is network-idle until an explicit provider request', () => {
  const calls=[];const g=new ModelGateway({fetchImpl:fakeFetch(calls),env:{}});
  const s=g.providers();
  assert.equal(calls.length,0);
  assert.equal(s.find(x=>x.id==='openrouter').connected,false);
  assert.equal(s.find(x=>x.id==='nvidia-local').configured,true);\n  assert.equal(s.find(x=>x.id==='nvidia-local').connected,false);
});

test('remote credential stays session-only and is never exposed by status', async () => {
  const calls=[];const g=new ModelGateway({fetchImpl:fakeFetch(calls),env:{}});
  const r=await g.connect('openrouter',{token:'secret-test-token'});
  assert.equal(r.models.length,2);
  assert.equal(calls.length,1);
  assert.equal(calls[0].opts.headers.authorization,'Bearer secret-test-token');
  const status=JSON.stringify(g.providers());
  assert.equal(status.includes('secret-test-token'),false);
  assert.equal(g.providers().find(x=>x.id==='openrouter').credential_source,'session');
  g.disconnect('openrouter');
  assert.equal(g.providers().find(x=>x.id==='openrouter').connected,false);
});

test('local NIM custom URL is restricted to loopback', () => {
  const g=new ModelGateway({fetchImpl:fakeFetch(),env:{}});
  assert.throws(()=>g.setBaseUrl('nvidia-local','https://example.com/v1'),/loopback/i);
  g.setBaseUrl('nvidia-local','http://127.0.0.1:9000/v1');
  assert.equal(g.baseUrl('nvidia-local'),'http://127.0.0.1:9000/v1');
  assert.throws(()=>g.setBaseUrl('openrouter','http://127.0.0.1:1/v1'),/not allowed/i);
});

test('model roles accept only known role and provider identifiers', () => {
  const g=new ModelGateway({fetchImpl:fakeFetch(),env:{}});
  assert.deepEqual(g.select('planner','openrouter','qwen/example'),{role:'planner',provider:'openrouter',model:'qwen/example'});
  assert.throws(()=>g.select('root','openrouter','x'),/role/i);
  assert.throws(()=>g.select('worker','unknown','x'),/provider/i);
});

test('local server model API never returns submitted credential', async t => {
  const calls=[];const gateway=new ModelGateway({fetchImpl:fakeFetch(calls),env:{}});
  const server=buildServer(path.join(ROOT,'web'),{modelGateway:gateway});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  t.after(()=>new Promise(resolve=>server.close(()=>resolve())));
  const origin='http://127.0.0.1:'+server.address().port;
  const connect=await fetch(origin+'/api/model-gateway/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider:'openrouter',token:'do-not-leak'})});
  assert.equal(connect.status,200);
  const status=await (await fetch(origin+'/api/model-gateway/status')).json();
  assert.equal(JSON.stringify(status).includes('do-not-leak'),false);
  assert.equal(status.providers.find(x=>x.id==='openrouter').connected,true);
  const select=await fetch(origin+'/api/model-gateway/select',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'worker',provider:'openrouter',model:'qwen/test-small'})});
  assert.equal(select.status,200);
});


test('OpenAI is built in as remote opt-in and OpenLLM as loopback-local', () => {
  const g=new ModelGateway({fetchImpl:fakeFetch(),env:{}});
  const providers=g.providers();
  const openai=providers.find(x=>x.id==='openai');
  const openllm=providers.find(x=>x.id==='openllm-local');
  assert.equal(openai.remote,true);
  assert.equal(openai.configured,false);
  assert.equal(openai.connected,false);
  assert.equal(openllm.remote,false);
  assert.equal(openllm.configured,true);
  assert.equal(openllm.connected,false);
  assert.equal(openllm.configurable_base_url,true);
  assert.equal(openllm.base_url,'http://127.0.0.1:3000/v1');
});

test('OpenLLM custom endpoint remains loopback-only', () => {
  const g=new ModelGateway({fetchImpl:fakeFetch(),env:{}});
  g.setBaseUrl('openllm-local','http://localhost:3100/v1');
  assert.equal(g.baseUrl('openllm-local'),'http://localhost:3100/v1');
  assert.throws(()=>g.setBaseUrl('openllm-local','https://remote.example/v1'),/loopback/i);
  assert.throws(()=>g.setBaseUrl('openai','http://127.0.0.1:9999/v1'),/not allowed/i);
});


test('server CSP permits local API only on Model Gateway page', async t => {
  const server=buildServer(path.join(ROOT,'web'),{modelGateway:new ModelGateway({fetchImpl:fakeFetch(),env:{}})});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  t.after(()=>new Promise(resolve=>server.close(()=>resolve())));
  const origin='http://127.0.0.1:'+server.address().port;
  const home=await fetch(origin+'/index.html');
  const gateway=await fetch(origin+'/model-gateway.html');
  assert.match(home.headers.get('content-security-policy'),/connect-src 'none'/);
  assert.match(gateway.headers.get('content-security-policy'),/connect-src 'self'/);
});
