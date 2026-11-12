"use client";
import {workspaceRequest} from "@/lib/local-workspace";
import React,{useEffect,useRef,useState} from "react";
import {X,Clock3} from "lucide-react";
import {Project,Row,Workspace} from "@/lib/project";
import {fields,validate,Field} from "@/lib/fields";
import {equalValue,RegisterSection,sectionLabel} from "@/lib/register-schema";

type Saved={workspace:Workspace;version:number};
type Props={section:RegisterSection;row:Row;isNew?:boolean;project:Project;onClose:()=>void;onSaved:(result:Saved,isNew:boolean,id:string)=>void};
function display(value:unknown){return value===null||value===undefined||value===""?"—":typeof value==="number"?value.toLocaleString("en-IN"):String(value);}
export function RowHistory({row,project}:{row:Row;project:Project}){
  const labels=Object.fromEntries(["tds","procurement","design"].flatMap(s=>fields(s,project)).map(f=>[f.key,f.label]));
  return <div className="row-history">{[...(row.changeHistory||[])].reverse().map((event:Row)=><article key={event.id}><div><strong>{event.action}</strong><time>{new Date(event.date).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"})} IST</time></div><p>{event.source} · {sectionLabel(event.section)}</p>{event.initialBatch&&<p>Initial values retained in the dated source update. Later changes are listed below.</p>}<dl>{(event.changes||[]).map((c:any)=><div key={c.field}><dt>{labels[c.field]||c.field}</dt><dd><span>{display(c.before)}</span><i>→</i><b>{display(c.after)}</b></dd></div>)}</dl>{event.preserved?.map((c:any)=><p key={c.field} className="history-preserved">{labels[c.field]||c.field}: kept {display(c.kept)}. Excel supplied {display(c.incoming)}; review before replacing.</p>)}</article>)}{!row.changeHistory?.length&&<div className="empty"><Clock3 size={22}/><p>Saved changes will appear here.</p></div>}</div>;
}
export default function RowEditor({section,row,isNew=false,project,onClose,onSaved}:Props){
  const fs=fields(section,project).map(f=>section==="design"?{...f,section:["status","revision","submitted","due","clashes","notes"].includes(f.key)?"Update":"Document"}:f);
  const sections=[...new Set(fs.map(f=>f.section||"Update"))].sort((a,b)=>a==="Update"?-1:b==="Update"?1:0);
  const [base,setBase]=useState(row),[draft,setDraft]=useState({...row}),[tab,setTab]=useState(isNew?(section==="design"?"Document":"Material"):"Update");
  const [saving,setSaving]=useState(false),[error,setError]=useState(""),[conflict,setConflict]=useState(false),[confirm,setConfirm]=useState<"close"|"reload"|null>(null);
  const ref=useRef<HTMLDivElement>(null);
  const changes=Object.fromEntries(fs.filter(f=>isNew||!equalValue(base[f.key],draft[f.key])).map(f=>[f.key,draft[f.key]??null]));
  const dirty=isNew?fs.some(f=>!equalValue(base[f.key],draft[f.key])):Object.keys(changes).length>0;
  function close(){if(saving)return;if(dirty)setConfirm("close");else onClose();}
  async function save(){
    if(saving||(!isNew&&!dirty))return;
    const validation=validate(draft,fs,section==="design"?"design":"items");
    if(validation){setError(validation);const field=fs.find(f=>validation.startsWith(f.label));if(field)setTab(field.section||"Update");return;}
    setSaving(true);setError("");setConflict(false);
    try{
      const response=await workspaceRequest({method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId:project.id,section,id:base.id,isNew,values:changes,expected:Object.fromEntries(Object.keys(changes).map(k=>[k,base[k]??null]))})});
      const result=await response.json() as Saved & {error?:string};if(!response.ok){setConflict(response.status===409);throw new Error(result.error||"Unable to save this row. Try again.");}
      onSaved(result,isNew,base.id);
    }catch(e:any){setError(e.message);}finally{setSaving(false);}
  }
  async function remove(){
    const message=section==="design"?"Delete this drawing?":"Delete this material from both TDS and procurement? These registers share the same material record.";
    if(saving||!window.confirm(message+" This cannot be undone."))return;
    setSaving(true);setError("");
    try{
      const response=await workspaceRequest({method:"DELETE",body:JSON.stringify({kind:"row",projectId:project.id,section,id:base.id,expected:base})});
      const result=await response.json() as Saved & {error?:string};
      if(!response.ok){setConflict(response.status===409);throw new Error(result.error||"Row could not be deleted.");}
      onSaved(result,false,base.id);
    }catch(e:any){setError(e.message);}finally{setSaving(false);}
  }
  async function reload(){
    setSaving(true);setConfirm(null);
    try{const response=await workspaceRequest();const data=await response.json() as Saved & {error?:string};if(!response.ok)throw new Error(data.error||"Could not reload the row.");const p=data.workspace.projects.find((p:Project)=>p.id===project.id);const latest=(section==="design"?p?.design:p?.items)?.find((r:Row)=>r.id===base.id);if(!latest)throw new Error("This row could not be found. Your draft has been kept.");setBase(latest);setDraft({...latest});setError("");setConflict(false);}catch(e:any){setError(e.message);}finally{setSaving(false);}
  }
  const handlers=useRef({close,save,dirty});handlers.current={close,save,dirty};
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;ref.current?.focus();const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    function key(e:KeyboardEvent){if(e.key==="Escape"){e.preventDefault();handlers.current.close();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();void handlers.current.save();}if(e.key==="Tab"){const els=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||[]).filter(el=>el.getClientRects().length);const first=els[0],last=els[els.length-1];if(first&&e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(last&&!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    function leave(e:BeforeUnloadEvent){if(handlers.current.dirty){e.preventDefault();e.returnValue="";}}
    document.addEventListener("keydown",key);window.addEventListener("beforeunload",leave);return()=>{document.removeEventListener("keydown",key);window.removeEventListener("beforeunload",leave);document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  function input(field:Field){const value=draft[field.key]??"";const change=(value:unknown)=>setDraft(previous=>({...previous,[field.key]:value}));return <label key={field.key} className={field.type==="textarea"||field.key==="name"?"full":""}>{field.label}{field.required&&<span className="required"> *</span>}{field.type==="select"?<select value={value} onChange={e=>change(e.target.value)} disabled={saving}><option value="">Select…</option>{field.options?.filter(Boolean).map(o=><option key={o}>{o}</option>)}</select>:field.type==="textarea"?<textarea rows={3} value={value} onChange={e=>change(e.target.value)} disabled={saving}/>:<input type={field.type||"text"} value={value} min={field.type==="number"?0:undefined} max={field.max} step={field.type==="number"?"any":undefined} onChange={e=>change(field.type==="number"?(e.target.value===""?null:Number(e.target.value)):e.target.value)} onInput={field.type==="date"||field.type==="month"?e=>change(e.currentTarget.value):undefined} disabled={saving} placeholder={field.type==="number"?"Not entered":field.type==="url"?"https://…":undefined}/>}</label>;}
  return <div className="drawer-backdrop" onClick={close}><div className="drawer row-editor" ref={ref} role="dialog" aria-modal="true" aria-label={isNew?"Add row":"Edit row"} tabIndex={-1} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">{project.name} · {sectionLabel(section)} · {isNew?"New row":base.id}</p><h2>{isNew?(section==="design"?"Add drawing":"Add material"):base.name}</h2><p className="row-edit-caption">{isNew?section==="design"?"Add a drawing or BIM record.":"One material, linked across TDS and procurement.":"Edit the fields you need. Save when ready."}</p></div><button className="icon-button" aria-label="Close row editor" onClick={close} disabled={saving}><X size={20}/></button></div><div className="editor-tabs" role="tablist" aria-label="Row details">{[...sections,...(!isNew?["History"]:[])].map(s=><button type="button" key={s} role="tab" aria-selected={tab===s} className={tab===s?"active":""} onClick={()=>setTab(s)}>{s}</button>)}</div><form noValidate onSubmit={e=>{e.preventDefault();void save();}}><div className="editor-body">{error&&<div className="form-error" role="alert">{error}{conflict&&<button type="button" className="text-link" onClick={()=>setConfirm("reload")}>Reload latest row</button>}</div>}{tab==="History"?<RowHistory row={base} project={project}/>:<><div className="form-grid">{fs.filter(f=>f.section===tab).map(input)}</div>{section==="procurement"&&tab==="Update"&&<p className="editor-note">Leave unknown amounts blank. Update the same LOI / PO value when the PO replaces the LOI.</p>}{tab==="Material"&&<p className="editor-note">These material details are shared by TDS and procurement.</p>}</>}</div>{confirm?<div className="row-discard" role="alert"><span>{confirm==="reload"?"Discard this draft and load the latest saved row?":"Discard your unsaved changes?"}</span><div><button type="button" className="btn" onClick={()=>setConfirm(null)}>Keep editing</button><button type="button" className="btn danger" onClick={()=>confirm==="reload"?void reload():onClose()}>{confirm==="reload"?"Discard & reload":"Discard changes"}</button></div></div>:<div className="editor-footer">{!isNew&&<button type="button" className="btn danger" disabled={saving} onClick={()=>void remove()}>Delete row</button>}<span className="row-save-state">{saving?"Saving…":dirty?"Unsaved changes":""}</span><span className="toolbar-spacer"/><button type="button" className="btn" disabled={saving} onClick={close}>Cancel</button><button className="btn primary" type="submit" disabled={saving||(!isNew&&!dirty)}>{saving?"Saving…":isNew?"Add row":"Save changes"}</button></div>}</form></div></div>;
}

