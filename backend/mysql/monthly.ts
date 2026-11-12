import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {RowEditError} from '../../frontend/lib/row-edits';
import {indiaToday,delayRequired,type MonthlyTask,type Proof} from '../../frontend/lib/monthly';
function fail(message:string):never{throw new RowEditError(message);}
const text=(v:unknown,label:string,max=2000)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():fail(`Enter ${label}.`);
function date(v:unknown){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Enter a valid date.');return v as string;}
function proofs(v:any):Proof[]{
 if(!Array.isArray(v)||v.length>3)fail('Attach up to three pieces of proof per update.');
 return v.map((p:any)=>{const name=text(p?.name,'a proof name',200),url=text(p?.url,'a proof file or link',750000);
  if(url.startsWith('data:')){if(!/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/.test(url)||Buffer.from(url.split(',')[1],'base64').length>512*1024)fail('Use a JPG, PNG, WebP or PDF file up to 512 KB.');}
  else {try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();}catch{fail('Use a valid http or https evidence link.');}}
  return {name,url};});
}
export function validateMonthly(t:any){
 if(!t||!Array.isArray(t.events)||t.events.length>300)fail('Invalid monthly work record.');
 text(t.name,'a work description',250);text(t.manager,'a project manager',150);text(t.unit,'a unit',30);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(t.month)||!Number.isFinite(t.target)||t.target<=0||!Number.isFinite(t.done)||t.done<0||t.done>t.target)fail('Check the work month, target and completed quantity.');
 if(date(t.start)>date(t.originalDue)||date(t.due)<t.start)fail('Due date cannot be before the start date.');
 if(!['Not started','In progress','Blocked','Submitted for review','Completed'].includes(t.status))fail('Invalid work status.');
 let size=0;for(const e of t.events){text(e.actor,'your name',150);text(e.note,'an update',5000);for(const p of proofs(e.proof)){size+=p.url.length;}}
 if(size>2800000)fail('This task has reached its 2 MB proof storage limit. Add a document link instead.');
}
export function changeMonthly(existing:MonthlyTask|undefined,input:any,trades:string[]):MonthlyTask{
 const v=input.values||{},actor=text(v.actor,'your name',150),now=new Date().toISOString();
 if(input.action==='create'){
  if(existing)throw new RowEditError('This work item already exists.',409);
  const task:MonthlyTask={id:input.id,name:text(v.name,'a work description',250),month:v.month,manager:text(v.manager,'a project manager',150),location:typeof v.location==='string'?v.location.trim().slice(0,250):'',trade:v.trade,target:v.target,unit:text(v.unit,'a unit',30),done:0,start:date(v.start),originalDue:date(v.due),due:date(v.due),status:'Not started',createdAt:now,updatedAt:now,events:[{id:randomUUID(),date:now,actor,kind:'Assigned',note:'Work assigned by planning.',proof:[]}]};
  if(!trades.includes(task.trade))fail('Select a project trade.');validateMonthly(task);return task;
 }
 if(!existing)throw new RowEditError('Work item not found.',404);
 if(!isDeepStrictEqual(existing,input.expected))throw new RowEditError('This task changed. Close and reopen it before saving.',409);
 const t:MonthlyTask=structuredClone(existing);let kind='',note=text(v.note,'an explanation or update');const proof=proofs(v.proof||[]);
 if(input.action==='progress'){
  if(t.status==='Completed')fail('This work has already been completed.');
  if(delayRequired(t))fail('Submit the overdue delay report with proof before updating progress.');
  if(!Number.isFinite(v.done)||v.done<0||v.done>t.target)fail('Completed quantity must be between zero and the target.');
  if(!['Not started','In progress','Blocked','Submitted for review'].includes(v.status))fail('Choose a valid progress status.');
  if(v.status==='Not started'&&v.done!==0)fail('Work with progress cannot be marked not started.');
  if(v.status==='Submitted for review'&&(v.done!==t.target||!proof.length))fail('Complete the target and attach completion proof before submitting for review.');
  t.done=v.done;t.status=v.status;kind=v.status==='Submitted for review'?'Completion submitted':'Progress update';
 }else if(input.action==='delay'){
  if(t.status==='Completed')fail('Completed work cannot have a new delay report.');
  if(!proof.length)fail('Attach proof for the delay.');
  const proposed=date(v.proposed);if(proposed<=t.due||proposed<indiaToday())fail('Propose a future completion date after the current deadline.');
  const help=text(v.help,'the help required (or None)');
  t.delay={due:t.due,reason:note,help,proposed,decision:'Pending'};
  kind='Delay reported';note+=`\nHelp required: ${help}\nProposed completion: ${proposed}`;
 }else if(input.action==='review'){
  if(v.decision==='Approve completion'){
   if(t.status!=='Submitted for review')fail('Completion must be submitted before approval.');
   if(delayRequired(t))fail('The overdue delay report must be submitted before closing this work.');
   t.status='Completed';kind='Completion approved';
  }else if(v.decision==='Request changes'){
   if(t.status!=='Submitted for review')fail('No completion submission to review.');t.status='In progress';kind='Changes requested';
  }else if(['Approve revised date','Reject revised date'].includes(v.decision)){
   if(!t.delay||t.delay.decision!=='Pending')fail('No pending date request to review.');
   if(v.decision==='Approve revised date'){const old=t.due;t.due=t.delay.proposed;t.delay.decision='Approved';note+=`\nDeadline: ${old} → ${t.due}`;}else t.delay.decision='Rejected';
   kind=v.decision;
  }else fail('Select a review decision.');
 }else fail('Invalid monthly register action.');
 t.updatedAt=now;t.events.push({id:randomUUID(),date:now,actor,kind,note,proof});validateMonthly(t);return t;
}
