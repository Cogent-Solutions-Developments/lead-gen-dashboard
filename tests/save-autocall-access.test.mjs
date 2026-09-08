import { it } from 'node:test';
import assert from 'node:assert/strict';
import { saveAutocallAccess } from '../lib/save-autocall-access.ts';

it('persists false explicitly and reads back the saved user before reporting success', async () => {
  let assigned = true;
  const steps = [];
  const saved = await saveAutocallAccess('employee', false, {
    save: async (id, enabled) => {steps.push(['save', id, enabled]); assigned = enabled; return {enabled};},
    read: async id => {steps.push(['read', id]); return {id, departmentAssignments: assigned ? ['autocall', 'delegate_sales'] : ['delegate_sales']};},
  });
  assert.deepEqual(steps, [['save','employee',false],['read','employee']]);
  assert.deepEqual(saved.departmentAssignments, ['delegate_sales']);
});
it('does not report success when the grant reappears on read-back', async () => {
  await assert.rejects(saveAutocallAccess('employee', false, {
    save: async () => ({enabled:false}),
    read: async id => ({id, departmentAssignments:['autocall']}),
  }), /could not be verified/);
});
it('propagates save failures and does not read or fake an updated user', async () => {
  let read = false;
  await assert.rejects(saveAutocallAccess('employee', false, {
    save: async () => {throw new Error('Write failed');},
    read: async id => {read=true; return {id,departmentAssignments:[]};},
  }), /Write failed/);
  assert.equal(read,false);
});
it('rejects an incomplete response, wrong identity, or incorrect acknowledgement', async () => {
  for (const user of [{id:'employee'}, {id:'someone-else',departmentAssignments:[]}]) {
    await assert.rejects(saveAutocallAccess('employee', false, {save:async()=>({enabled:false}),read:async()=>user}), /could not be verified/);
  }
  await assert.rejects(saveAutocallAccess('employee', false, {save:async()=>({enabled:true}),read:async()=>({id:'employee',departmentAssignments:[]})}), /did not confirm/);
});
it('also verifies a grant without dropping unrelated permissions', async () => {
  const expected={id:'employee',departmentAssignments:['autocall','delegate_sales']};
  assert.deepEqual(await saveAutocallAccess('employee',true,{save:async()=>({enabled:true}),read:async()=>expected}),expected);
});
