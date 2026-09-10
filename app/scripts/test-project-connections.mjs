// Isolated tests of the actual production relationship model. No account or network access.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = mkdtempSync(join(tmpdir(), 'project-connections-'));
const localTsc = join(app, 'node_modules/typescript/bin/tsc');
const args = [join(app, 'src/lib/projects/connections.ts'), '--target', 'ES2022', '--module', 'commonjs', '--strict', '--skipLibCheck', '--outDir', output];
if (existsSync(localTsc)) execFileSync(process.execPath, [localTsc, ...args]);
else execFileSync('tsc', args);
const { canonicalConnection, validateConnection, buildRelations, neighborhood, relationshipLanes, parseConnection } = await import(pathToFileURL(join(output, 'connections.js')));
after(() => rmSync(output, { recursive: true, force: true }));
const ids = new Set(['a', 'b', 'c', 'd']);
const edge = (source_id, target_id, kind = 'related', id = `${source_id}-${target_id}-${kind}`) => ({ id, user_id: 'owner', source_id, target_id, kind, created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-10T00:00:00Z' });
const input = (source_id, target_id, kind = 'related') => ({ source_id, target_id, kind });

test('canonicalizes only symmetric relationships', () => {
  assert.deepEqual(canonicalConnection(input('b', 'a')), input('a', 'b'));
  for (const kind of ['depends-on', 'blocks', 'parent-child']) assert.deepEqual(canonicalConnection(input('b', 'a', kind)), input('b', 'a', kind));
});
test('write payload cannot copy row identity, ownership, or timestamps from Undo', () => {
  assert.deepEqual(Object.keys(canonicalConnection(edge('a', 'b'))).sort(), ['kind', 'source_id', 'target_id']);
});
test('rejects blank endpoints', () => assert.equal(validateConnection(input('', 'a'), [], ids), 'different'));
test('rejects self-links', () => assert.equal(validateConnection(input('a', 'a'), [], ids), 'different'));
test('rejects unavailable endpoints', () => assert.equal(validateConnection(input('a', 'missing'), [], ids), 'missing'));
test('rejects reversed symmetric duplicates', () => assert.equal(validateConnection(input('b', 'a'), [edge('a', 'b')], ids), 'duplicate'));
test('rejects exact directed duplicates', () => assert.equal(validateConnection(input('a', 'b', 'depends-on'), [edge('a', 'b', 'depends-on')], ids), 'duplicate'));
test('permits distinct meanings between the same projects', () => assert.equal(validateConnection(input('a', 'b', 'depends-on'), [edge('a', 'b')], ids), null));
test('editing does not conflict with the edited record', () => assert.equal(validateConnection(input('b', 'a'), [edge('a', 'b')], ids, 'a-b-related'), null));
test('detects multi-hop dependency cycles', () => assert.equal(validateConnection(input('c', 'a', 'depends-on'), [edge('a', 'b', 'depends-on'), edge('b', 'c', 'depends-on')], ids), 'cycle'));
test('normalizes mixed blocking/dependency execution direction', () => {
  assert.equal(validateConnection(input('a', 'b', 'blocks'), [edge('a', 'b', 'depends-on')], ids), 'cycle');
  assert.equal(validateConnection(input('b', 'a', 'blocks'), [edge('a', 'b', 'depends-on')], ids), null);
});
test('detects hierarchy cycles separately', () => assert.equal(validateConnection(input('c', 'a', 'parent-child'), [edge('a', 'b', 'parent-child'), edge('b', 'c', 'parent-child')], ids), 'cycle'));
test('does not mix hierarchy with execution constraints', () => assert.equal(validateConnection(input('b', 'a', 'parent-child'), [edge('a', 'b', 'blocks')], ids), null));
test('validates against hidden projects, not just canvas filters', () => assert.equal(validateConnection(input('c', 'a', 'depends-on'), [edge('a', 'b', 'depends-on'), edge('b', 'c', 'depends-on')], ids), 'cycle'));
test('does not mutate the caller\'s data', () => {
  const original = edge('b', 'a'); canonicalConnection(original); validateConnection(original, [], ids);
  assert.equal(original.source_id, 'b');
});
test('handles an existing cyclic graph without an infinite traversal', () => assert.equal(validateConnection(input('d', 'a', 'blocks'), [edge('a', 'b', 'blocks'), edge('b', 'a', 'blocks')], ids), null));
test('preserves unconnected projects without inventing edges', () => assert.deepEqual(buildRelations([], [], ids), []));
test('excludes stale endpoints when building visible relationships', () => assert.deepEqual(buildRelations([edge('a', 'missing')], [], ids), []));
test('deduplicates shared idea links and keeps their provenance', () => {
  const result = buildRelations([], [{ id: 'i1', linked_project_ids: ['b', 'a', 'a', 'missing'] }, { id: 'i2', linked_project_ids: ['a', 'b'] }], ids);
  assert.equal(result.length, 1); assert.equal(result[0].kind, 'shared-idea'); assert.deepEqual(result[0].ideaIds, ['i1', 'i2']); assert.equal(result[0].record, undefined);
});
test('keeps manual and derived links distinct', () => assert.equal(buildRelations([edge('a', 'b')], [{ id: 'i', linked_project_ids: ['a', 'b'] }], ids).length, 2));
test('neighborhood contains only the selected project and direct neighbors', () => {
  const relations = buildRelations([edge('a', 'b'), edge('b', 'c')], [], ids);
  assert.deepEqual([...neighborhood(relations, 'a')].sort(), ['a', 'b']);
});
test('parallel and opposite relationships receive different label lanes', () => {
  const relations = buildRelations([edge('a', 'b'), edge('a', 'b', 'blocks'), edge('b', 'a', 'parent-child')], [], ids);
  assert.equal(new Set(relationshipLanes(relations).values()).size, 3);
});
test('parses supported database records', () => assert.deepEqual(parseConnection(edge('a', 'b')), edge('a', 'b')));
test('rejects malformed database responses instead of displaying phantom links', () => {
  for (const row of [null, {}, { ...edge('a', 'b'), kind: 'invented' }, { ...edge('a', 'b'), updated_at: null }]) assert.throws(() => parseConnection(row));
});
