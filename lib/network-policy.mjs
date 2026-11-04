/** EDEN read-only routing design validator.
 * This does NOT configure a firewall, test Tor circuits, or authorize network access.
 * Real enforcement belongs to a separately reviewed Qubes/Whonix network policy.
 */
export const NETWORK_DESIGN = Object.freeze({
  schema_version: '0.1.0',
  kind: 'DOCUMENTATION_AND_SIMULATION_ONLY',
  required_network_qube: 'sys-whonix',
  required_application_qube: 'anon-whonix',
  separate_live_system: 'Tails',
  fallback_behavior: 'DENY_UNVERIFIED',
  actual_network_policy_installed: false,
  real_tor_leak_test_passed: false,
});

export function evaluateTorDesignEvidence(evidence = {}) {
  const notes = [];
  if (evidence.platform !== 'qubes') notes.push('Qubes OS nicht als reale Laufzeit belegt');
  if (evidence.app_qube !== 'anon-whonix') notes.push('App-Qube ist nicht anon-whonix');
  if (evidence.net_qube !== 'sys-whonix') notes.push('Tor-Netzwerk-Qube ist nicht sys-whonix');
  if (evidence.tor_bootstrap_percent !== 100) notes.push('Tor-Bootstrap nicht nachgewiesen');
  if (evidence.route_source !== 'verified_on_device') notes.push('Reale Route nicht extern verifiziert');
  if (evidence.leak_test_passed !== true) notes.push('Leak-Test nicht belegt');
  return {
    schema_version: NETWORK_DESIGN.schema_version,
    evaluation: notes.length ? 'BLOCKED' : 'DESIGN_EVIDENCE_COMPLETE',
    reasons: notes,
    intended_fallback: 'DENY_UNVERIFIED',
    // Never treat a caller-supplied object as an installed or effective firewall policy.
    live_network_authorized: false,
    firewall_enforcement_verified: false,
    safety_guarantee: false,
    next_gate: 'Independent Qubes/Whonix and physical-device verification required',
  };
}
