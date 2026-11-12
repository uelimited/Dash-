import {changeMonthly,validateMonthly} from './monthly';
import mysql, {type Pool, type PoolConnection, type RowDataPacket} from 'mysql2/promise';
import {isDeepStrictEqual} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readConfig} from './config.mjs';
import {blankProject,initialWorkspace,type Workspace,type Project,type Row} from '../../frontend/lib/project';
import {ensurePortfolio} from './portfolio-seed';
import {applyRegisterUpdates} from '../../frontend/lib/register-updates';
import {applyRowEdit,RowEditError} from '../../frontend/lib/row-edits';

export const registers=['items','design','fronts','milestones','expenses','bills','recurring','history','stock','monthly'] as const;
export type SavedWorkspace={workspace:Workspace;version:number;initialized:boolean;storage:'mysql'};
const globalPool=globalThis as typeof globalThis & {dashMysqlPool?:Pool};
function pool(){return globalPool.dashMysqlPool??=mysql.createPool({...readConfig(),connectionLimit:5,waitForConnections:true,queueLimit:30});}
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const idValid=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=191;

export function validateWorkspace(value:unknown):asserts value is Workspace {
  if(!object(value)||!Array.isArray(value.projects)||value.projects.length>500)throw new RowEditError('Invalid project data.');
  const projectIds=new Set<string>();
  for(const project of value.projects){
    if(!object(project)||!idValid(project.id)||projectIds.has(project.id))throw new RowEditError('Project IDs must be present and unique.');
    projectIds.add(project.id);
    if(typeof project.name!=='string'||!project.name.trim()||project.name.length>250||typeof project.code!=='string'||!project.code.trim()||project.code.length>100)throw new RowEditError('Enter a valid project name and code.');
    if(!Array.isArray(project.trades)||project.trades.some((t:unknown)=>typeof t!=='string'))throw new RowEditError('Invalid project trades.');
    if(project.stock===undefined)project.stock=[];
    if(project.monthly===undefined)project.monthly=[];
    for(const key of registers){
      if(!Array.isArray(project[key])||project[key].length>10000)throw new RowEditError(`Invalid ${key} records.`);
      const ids=new Set<string>();
      for(const record of project[key]){
        if(!object(record)||!idValid(record.id)||ids.has(record.id))throw new RowEditError(`Each ${key} record must have a unique ID.`);
        if(key==='stock'&&(!Number.isFinite(record.qty)||record.qty<0||!Number.isFinite(record.minimum)||record.minimum<0||typeof record.name!=='string'||!record.name.trim()||typeof record.unit!=='string'||!record.unit.trim()||!project.trades.includes(record.trade)))throw new RowEditError('Invalid site stock entry.');
        if(key==='monthly')validateMonthly(record);
        ids.add(record.id);
      }
    }
  }
}

export function mutateWorkspace(saved:SavedWorkspace,method:string,input:any):Workspace {
  if(!object(input))throw new RowEditError('Invalid request.');
  const {workspace}=saved;
  if(method==='PATCH'&&input.section==='monthly'){
    const project=workspace.projects.find(p=>p.id===input.projectId);
    if(!project)throw new RowEditError('Project not found.',404);
    if(!idValid(input.id))throw new RowEditError('Invalid work item ID.');
    const existing=project.monthly.find(r=>r.id===input.id);
    const record=changeMonthly(existing as any,input,project.trades);
    const next={...project,monthly:existing?project.monthly.map(r=>r.id===record.id?record:r):[...project.monthly,record],history:[{id:randomUUID(),name:`Monthly work · ${record.name}: ${record.events.at(-1)?.kind}`,date:record.updatedAt},...project.history].slice(0,1000)};
    return {projects:workspace.projects.map(p=>p.id===project.id?next:p)};
  }
  if(method==='PATCH'&&input.section==='stock'){
    const project=workspace.projects.find(p=>p.id===input.projectId);
    if(!project)throw new RowEditError('Project not found.',404);
    if(!idValid(input.id)||!object(input.values))throw new RowEditError('Invalid stock entry.');
    const existing=project.stock.find(r=>r.id===input.id);
    if(input.isNew?!!existing:!existing)throw new RowEditError('Stock records changed. Reload before saving.',409);
    if(existing&&!isDeepStrictEqual(existing,input.expected))throw new RowEditError('This stock entry changed. Close and reopen it before saving.',409);
    const v=input.values;
    if(typeof v.name!=='string'||!v.name.trim()||v.name.length>250||typeof v.unit!=='string'||!v.unit.trim()||v.unit.length>30)throw new RowEditError('Enter a material name and unit.');
    if(!project.trades.includes(v.trade))throw new RowEditError('Select a project trade.');
    if(!Number.isFinite(v.qty)||v.qty<0||!Number.isFinite(v.minimum)||v.minimum<0)throw new RowEditError('Stock quantities must be zero or greater.');
    if(typeof v.location!=='string'||v.location.length>250||typeof v.notes!=='string'||v.notes.length>2000)throw new RowEditError('Location or notes are invalid.');
    const record={id:input.id,name:v.name.trim(),trade:v.trade,unit:v.unit.trim(),qty:v.qty,minimum:v.minimum,location:v.location.trim(),notes:v.notes.trim(),updatedAt:new Date().toISOString()};
    if(project.stock.some(r=>r.id!==record.id&&['name','trade','unit','location'].every(k=>String(r[k]).toLowerCase()===String((record as any)[k]).toLowerCase())))throw new RowEditError('This material and location already exist. Update the existing stock entry.');
    const next={...project,stock:existing?project.stock.map(r=>r.id===record.id?record:r):[...project.stock,record],history:[{id:randomUUID(),name:`Site stock · ${record.name}: ${existing?.qty??0} → ${record.qty} ${record.unit}`,date:record.updatedAt},...project.history].slice(0,1000)};
    return {projects:workspace.projects.map(p=>p.id===project.id?next:p)};
  }
  if(method==='PATCH'){
    if(!['tds','procurement','design'].includes(input.section)||!idValid(input.id)||!object(input.values)||!object(input.expected))throw new RowEditError('Invalid record edit.');
    return applyRowEdit(workspace,input as any,new Date().toISOString(),randomUUID());
  }
  if(method==='POST'){
    const name=String(input.name||'').trim(),code=String(input.code||'').trim();
    if(!name||!code||name.length>250||code.length>100)throw new RowEditError('Enter a project name and code.');
    if(workspace.projects.some(p=>p.code.toLowerCase()===code.toLowerCase()))throw new RowEditError('This project code already exists.');
    const project={...blankProject(name,'Other'),code,location:String(input.location||'').trim(),start:'',end:'',budget:null,retention:null,paymentDays:null,advance:null,notes:'',history:[{id:randomUUID(),name:'Project created',date:new Date().toISOString()}]};
    return {projects:[...workspace.projects,project]};
  }
  if(method==='DELETE'){
    const project=workspace.projects.find(p=>p.id===input.projectId);
    if(!project)throw new RowEditError('Project no longer exists.',404);
    if(input.kind==='project'){
      if(input.version!==saved.version)throw new RowEditError('Records changed. Review the latest project before deleting.',409);
      return {projects:workspace.projects.filter(p=>p.id!==input.projectId)};
    }
    if(!['tds','procurement','design','stock','monthly'].includes(input.section))throw new RowEditError('Invalid register.');
    const key=input.section==='monthly'?'monthly':input.section==='stock'?'stock':input.section==='design'?'design':'items',row=project[key].find(r=>r.id===input.id);
    if(!row)throw new RowEditError('Row no longer exists.',404);
    if(!isDeepStrictEqual(row,input.expected))throw new RowEditError('This row changed. Reload it before deleting.',409);
    const next={...project,[key]:project[key].filter(r=>r.id!==input.id),history:[{id:randomUUID(),name:`Deleted ${row.name}`,date:new Date().toISOString()},...project.history].slice(0,1000)};
    return {projects:workspace.projects.map(p=>p.id===project.id?next:p)};
  }
  if(method==='PUT'){
    if(input.version!==saved.version)throw new RowEditError('The project records changed. Reload before saving.',409);
    if(Array.isArray(input.workspace?.projects))for(const p of input.workspace.projects)if(p.stock===undefined)p.stock=workspace.projects.find(old=>old.id===p.id)?.stock||[];
    if(Array.isArray(input.workspace?.projects))for(const p of input.workspace.projects){
      const old=workspace.projects.find(x=>x.id===p.id)?.monthly||[];
      if(p.monthly!==undefined&&!isDeepStrictEqual(p.monthly,old))throw new RowEditError('Update monthly work through its register to preserve deadlines and history.');
      p.monthly=old;
    }
    validateWorkspace(input.workspace);
    return input.workspace;
  }
  throw new RowEditError('Unsupported operation.',405);
}

const decode=(data:any)=>typeof data==='string'?JSON.parse(data):data;
async function read(connection:PoolConnection):Promise<SavedWorkspace>{
  const [state]=await connection.query<RowDataPacket[]>('SELECT version, initialized FROM dash_workspace WHERE id=1 FOR UPDATE');
  if(!state.length)throw new Error('MYSQL_NOT_CONFIGURED');
  const [projects]=await connection.query<RowDataPacket[]>('SELECT id,details FROM dash_projects ORDER BY position');
  const [records]=await connection.query<RowDataPacket[]>('SELECT project_id,register_name,record_data FROM dash_records ORDER BY project_id,register_name,position');
  const result=projects.map(row=>({...decode(row.details),...Object.fromEntries(registers.map(key=>[key,[]]))})) as Project[];
  const byId=new Map(result.map(p=>[p.id,p]));
  for(const row of records){
    const p=byId.get(row.project_id),kind=row.register_name as typeof registers[number];
    if(!p||!registers.includes(kind))throw new Error('INVALID_DATABASE_RECORD');
    p[kind].push(decode(row.record_data));
  }
  return {workspace:{projects:result},version:Number(state[0].version),initialized:!!state[0].initialized,storage:'mysql'};
}

async function persist(connection:PoolConnection,before:Workspace,after:Workspace){
  // Update only changed projects. All writes and the version increment share one transaction.
  const nextIds=new Set(after.projects.map(p=>p.id));
  for(const p of before.projects)if(!nextIds.has(p.id))await connection.execute('DELETE FROM dash_projects WHERE id=?',[p.id]);
  for(const [position,p] of after.projects.entries()){
    const previous=before.projects.find(x=>x.id===p.id);
    if(isDeepStrictEqual(previous,p)&&before.projects[position]?.id===p.id)continue;
    const details={...p} as Record<string,any>;
    for(const key of registers)delete details[key];
    await connection.execute('INSERT INTO dash_projects (id,position,name,code,details) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE position=VALUES(position),name=VALUES(name),code=VALUES(code),details=VALUES(details)',[p.id,position,p.name,p.code,JSON.stringify(details)]);
    for(const kind of registers){
      if(isDeepStrictEqual(previous?.[kind],p[kind]))continue;
      await connection.execute('DELETE FROM dash_records WHERE project_id=? AND register_name=?',[p.id,kind]);
      const rows=p[kind];
      const batchSize=kind==='monthly'?1:100;
      for(let offset=0;offset<rows.length;offset+=batchSize){
        const chunk=rows.slice(offset,offset+batchSize);
        const placeholders=chunk.map(()=>'(?,?,?,?,?)').join(',');
        await connection.execute(`INSERT INTO dash_records (project_id,register_name,id,position,record_data) VALUES ${placeholders}`,chunk.flatMap((row,index)=>[p.id,kind,row.id,offset+index,JSON.stringify(row)]));
      }
    }
  }
}

export async function workspaceOperation(method:string,input?:unknown):Promise<SavedWorkspace>{
  const connection=await pool().getConnection();
  try{
    await connection.beginTransaction();
    const saved=await read(connection);
    if(method==='GET'){await connection.commit();return saved;}
    let next:Workspace;
    if(method==='POST'&&object(input)&&input.action==='initialize'){
      if(saved.initialized)throw new RowEditError('MySQL already contains project records. Reload to use them; no data was overwritten.',409);
      if(input.source==='browser'){validateWorkspace(input.workspace);next=applyRegisterUpdates(input.workspace);}
      else if(input.source==='included')next=applyRegisterUpdates(ensurePortfolio(initialWorkspace()));
      else throw new RowEditError('Choose which records to import.');
    }else{
      if(!saved.initialized)throw new RowEditError('Choose your starting records before editing.',409);
      next=mutateWorkspace(saved,method,input);
    }
    validateWorkspace(next);
    await persist(connection,saved.workspace,next);
    const version=saved.version+1;
    await connection.execute('UPDATE dash_workspace SET version=?,initialized=TRUE WHERE id=1',[version]);
    await connection.commit();
    return {workspace:next,version,initialized:true,storage:'mysql'};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export function databaseError(error:unknown){
  if(error instanceof RowEditError)return {status:error.status,error:error.message};
  if(error instanceof SyntaxError)return {status:400,error:'The request contains invalid JSON.'};
  const code=(error as any)?.code;
  if((error as Error)?.message==='MYSQL_NOT_CONFIGURED')return {status:503,error:'MySQL setup is required. Run backend/setup-mysql.ps1 in the Dash folder.'};
  if(code==='ER_ACCESS_DENIED_ERROR')return {status:503,error:'MySQL could not sign in with the app account. Check the database configuration.'};
  if(code==='ECONNREFUSED'||code==='ETIMEDOUT')return {status:503,error:'MySQL is unavailable. Start the MySQL80 service and retry. Your changes have not been saved.'};
  return {status:503,error:'The database request failed. Your changes have not been saved. Please retry.'};
}
