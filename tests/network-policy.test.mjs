import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/core.mjs';
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
  assert.match(page,/keine echte/i);
});
