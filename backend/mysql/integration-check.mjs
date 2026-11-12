import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const endpoint='http://localhost:3000/api/workspace';
async function request(method='GET',body,expected=200){
  const response=await fetch(endpoint,{method,headers:{'Content-Type':'application/json','X-Dash-Request':'1',Origin:'http://localhost:3000'},...(body?{body:JSON.stringify(body)}:{})});
  const result=await response.json();assert.equal(response.status,expected,result.error);return result;
}
const baseline=await request();
assert.equal(baseline.initialized,true,'Import the browser records before running the integration check.');
const code=`CHECK-${randomUUID().slice(0,8)}`;
let projectId;
try{
  let saved=await request('POST',{name:'Temporary database verification',code});
  projectId=saved.workspace.projects.find(p=>p.code===code).id;
  await request('POST',{name:'Duplicate project check',code},400);
  const rowId=`check-${randomUUID()}`;
  const row=state=>state.workspace.projects.find(p=>p.id===projectId).items.find(r=>r.id===rowId);
  saved=await request('PATCH',{projectId,section:'tds',id:rowId,isNew:true,values:{name:'Temporary material',trade:'HVAC',group:'First fix',revision:'R0',tds:'Not started'},expected:{}});
  const stale=row(saved);
  saved=await request('PATCH',{projectId,section:'tds',id:rowId,values:{tds:'Approved'},expected:{tds:'Not started'}});
  assert.equal(row(saved).tds,'Approved');
  saved=await request('PATCH',{projectId,section:'procurement',id:rowId,values:{stage:'LOI sent'},expected:{stage:'Not started'}});
  assert.equal(row(saved).tds,'Approved');assert.equal(row(saved).stage,'LOI sent');
  const persisted=await request();
  assert.equal(row(persisted).stage,'LOI sent');
  assert.equal(persisted.workspace.projects.find(p=>p.id===projectId).items.filter(r=>r.tds==='Approved').length,1);
  await request('PATCH',{projectId,section:'tds',id:rowId,values:{tds:'Rejected'},expected:{tds:'Not started'}},409);
  await request('DELETE',{projectId,section:'tds',id:rowId,expected:stale},409);
  await request('PUT',{workspace:persisted.workspace,version:baseline.version},409);
  await request('POST',{action:'initialize',source:'included'},409);
  // Two writes based on the same field value must not silently overwrite each other.
  const outcomes=await Promise.all(['Approved with comments','Rejected'].map(tds=>fetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json','X-Dash-Request':'1',Origin:'http://localhost:3000'},body:JSON.stringify({projectId,section:'tds',id:rowId,values:{tds},expected:{tds:'Approved'}})})));
  assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);
  saved=await request();
  await request('DELETE',{projectId,section:'procurement',id:rowId,expected:row(saved)});
  assert.equal(row(await request()),undefined);
  const forbidden=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Dash-Request':'1',Origin:'https://unrelated.example'},body:JSON.stringify({name:'Blocked',code:'BLOCKED'})});
  assert.equal(forbidden.status,403);
  console.log('PASS: add/edit, shared TDS/procurement persistence, chart counts, stale edit/delete prevention, concurrent writes, protected import, and cross-origin rejection.');
}finally{
  if(projectId){
    const latest=await request();
    await request('DELETE',{kind:'project',projectId,version:latest.version});
    const after=await request();
    assert.deepEqual(after.workspace,baseline.workspace,'Existing project records must remain unchanged.');
    console.log('PASS: temporary project removed; all original project records are unchanged.');
  }
}
