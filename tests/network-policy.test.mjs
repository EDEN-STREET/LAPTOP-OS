import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/core.mjs';
import { startServer } from '../lib/server.mjs';
import { NETWORK_DESIGN, evaluateTorDesignEvidence } from '../lib/network-policy.mjs';

const baseline={
  platform:'qubes', app_qube:'anon-whonix', net_qube:'sys-whonix',
  tor_bootstrap_percent:100, route_source:'verified_on_device', leak_test_passed:true,
};
test('default network policy is deny-unverified; no real firewall or Tor enforcement claimed',()=>{
  assert.equal(NETWORK_DESIGN.fallback_behavior,'DENY_UNVERIFIED');
  assert.equal(NETWORK_DESIGN.actual_network_policy_installed,false);
  assert.equal(NETWORK_DESIGN.real_tor_leak_test_passed,false);
  assert.equal(evaluateTorDesignEvidence().evaluation,'BLOCKED');
  assert.equal(evaluateTorDesignEvidence().live_network_authorized,false);
});
test('missing sys-whonix or Tor bootstrap always blocks the simulated route',()=>{
  for(const evidence of [
    {...baseline,net_qube:'sys-net'},
    {...baseline,tor_bootstrap_percent:50},
    {...baseline,leak_test_passed:false},
    {...baseline,platform:'windows'},
    {...baseline,route_source:'user_claim'},
    {...baseline,app_qube:'fedora-work'},
  ]){
    const result=evaluateTorDesignEvidence(evidence);
    assert.equal(result.evaluation,'BLOCKED');
    assert.equal(result.live_network_authorized,false);
  }
});
test('even full caller evidence is not an authorization to start network traffic',()=>{
  const result=evaluateTorDesignEvidence(baseline);
  assert.equal(result.evaluation,'DESIGN_EVIDENCE_COMPLETE');
  assert.equal(result.live_network_authorized,false);
  assert.equal(result.firewall_enforcement_verified,false);
  assert.equal(result.safety_guarantee,false);
});
test('architecture demo is bundled and makes simulation and Tails separation explicit',()=>{
  const page=fs.readFileSync(path.join(ROOT,'web','security-architecture.html'),'utf8');
  assert.match(page,/sys-whonix/);
  assert.match(page,/anon-whonix/);
  assert.match(page,/Tails ist kein Qubes-Unterbau/);
  assert.match(page,/Netzwerkfreigabe: NEIN/);
  assert.match(page,/kein echtes Betriebssystem/i);
});


test('Qubes/Whonix/Tails architecture page is served by loopback-only EDEN HTTP server',async()=>{
  const server=await startServer({port:0,root:path.join(ROOT,'web')});
  try{
    assert.equal(server.address().address,'127.0.0.1');
    const address=`http://127.0.0.1:${server.address().port}`;
    const res=await fetch(address+'/security-architecture.html');
    assert.equal(res.status,200);
    assert.ok(res.headers.get('content-type').includes('text/html'));
    const text=await res.text();
    assert.match(text,/anon-whonix/);
    assert.match(text,/sys-whonix/);
    assert.match(text,/Tails Live-System/);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
