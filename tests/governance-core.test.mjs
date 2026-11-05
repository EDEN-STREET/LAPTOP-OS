import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('governance core preserves evidence, registry and anonymity boundaries', async () => {
  const g=JSON.parse(await fs.readFile(new URL('../config/governance-core.json',import.meta.url),'utf8'));
  assert.deepEqual(Object.keys(g.evidence_levels),['E0','E1','E2','E3','E4']);
  assert.equal(g.execution_boundaries.unrestricted_shell_from_llm,false);
  assert.equal(g.execution_boundaries.docker_socket_to_agents,false);
  assert.equal(g.execution_boundaries.cluster_admin_to_workflow_engine,false);
  assert.equal(g.credentials.agents_receive_raw_secrets_by_default,false);
  assert.equal(g.events.full_prompt_logging_default,false);
  assert.equal(g.events.source_contact_graph_default,false);
  assert.equal(g.data_rules.backup_valid_only_after_restore_test,true);
  assert.equal(g.knowledge_planes.source_sensitive_cross_compartment_search,false);
});

test('governance requires canonical machine service model and git registries', async () => {
  const g=JSON.parse(await fs.readFile(new URL('../config/governance-core.json',import.meta.url),'utf8'));
  assert.equal(g.required_registries.machine_inventory,'machine-inventory.json');
  assert.equal(g.required_registries.service_registry,'service-registry.yaml');
  assert.equal(g.required_registries.model_registry,'model-registry.yaml');
  assert.equal(g.required_registries.git_source_of_truth,'GIT_SOURCE_OF_TRUTH.md');
});
