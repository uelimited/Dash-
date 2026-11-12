"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import {useState} from 'react';
import {Database,Download} from 'lucide-react';
import {storageKey,workspaceRequest} from '@/lib/local-workspace';
import type {Workspace} from '@/lib/project';

export default function DatabaseStart(){
  const {canEdit}=useAuth();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [backup]=useState(()=>{
    try{const raw=localStorage.getItem(storageKey);if(!raw)return {raw:null,workspace:null};const saved=JSON.parse(raw);if(!Array.isArray(saved.workspace?.projects))throw new Error();return {raw,workspace:saved.workspace as Workspace};}
    catch{return {raw:localStorage.getItem(storageKey),workspace:null};}
  });
  function download(){
    if(!backup.raw)return;
    const url=URL.createObjectURL(new Blob([backup.raw],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='dash-browser-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function initialize(source:'browser'|'included'){
    setBusy(true);setError('');
    try{
      const response=await workspaceRequest({method:'POST',body:JSON.stringify({action:'initialize',source,...(source==='browser'?{workspace:backup.workspace}:{})})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
    }catch(e){setError(e instanceof Error?e.message:'Records could not be imported.');}finally{setBusy(false);}
  }
  if(!canEdit)return <main className="database-start"><h1>Project setup pending</h1><p>An administrator needs to import the starting records.</p><AuthControls/></main>;
  return <main className="database-start"><div className="database-start-icon"><Database size={28}/></div><p className="eyebrow">MySQL connected</p><h1>Bring your projects into MySQL</h1>
    {backup.workspace?<><p>This browser has {backup.workspace.projects.filter(p=>!p.demo).length} projects saved. Move this copy into the empty database to keep your latest edits.</p><button className="btn primary" disabled={busy} onClick={()=>void initialize('browser')}>{busy?'Importing records…':'Move browser records to MySQL'}</button></>:<><p>{backup.raw?'The saved browser copy could not be read. Download it for recovery before continuing.':'No saved projects were found in this browser. If you edited Dash in another browser or address, open Dash there first to import your latest records.'}</p>{!backup.raw&&<button className="btn" disabled={busy} onClick={()=>void initialize('included')}>{busy?'Importing records…':'Use included project records'}</button>}</>}
    {backup.raw&&<button className="btn" onClick={download}><Download size={15}/>Download browser backup</button>}
    {error&&<p className="form-error" role="alert">{error}</p>}<small>Your browser copy stays untouched. Future changes will be saved in MySQL.</small>
  </main>;
}
