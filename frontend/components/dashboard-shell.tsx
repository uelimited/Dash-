"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import MaterialDetail from "./material-detail";
import type {View} from "./pages/types";
import {pagePaths} from "./pages/types";
import OverviewPage from "./pages/overview-page";
import TdsPage from "./pages/tds-page";
import ProcurementPage from "./pages/procurement-page";
import MonthlyPage from "./pages/monthly-page";
import SitePage from "./pages/site-page";
import DesignPage from "./pages/design-page";
import ProjectDetailsPage from "./pages/settings-page";
const pageComponents={overview:OverviewPage,tds:TdsPage,procurement:ProcurementPage,costs:OverviewPage,design:DesignPage,monthly:MonthlyPage,site:SitePage,settings:ProjectDetailsPage,sources:OverviewPage};

import {workspaceRequest} from "@/lib/local-workspace";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, LayoutGrid, Files, ShoppingBag, Wallet, Box, Building2, Settings2, ChevronRight, ArrowUpRight, X, Plus, Menu, Check, ArrowLeft, FileSpreadsheet, Link as LinkIcon } from "lucide-react";
import { Project, Row, Workspace, ordered, hasBudget, hasOrderValue, variance, money, dateLabel, uid } from "@/lib/project";

import { defaultRow } from "@/lib/fields";
import RecordEditor from "./record-editor";
import RowEditor, {RowHistory} from "./row-editor";
import {emptyRegisterRow} from "@/lib/row-edits";
import {RegisterSection} from "@/lib/register-schema";


import { defaultTrackerFilters } from "@/lib/tracker";
import { comparableOrder } from "@/lib/overview";

const navigation = [
  {id:"overview",label:"Overview",icon:LayoutGrid},
  {id:"tds",label:"TDS",icon:Files},
  {id:"procurement",label:"Procurement",icon:ShoppingBag},
  {id:"design",label:"Design",icon:Box},
  {id:"monthly",label:"Monthly work register",icon:CalendarDays},
  {id:"site",label:"Site register",icon:Building2},
] as const;
const titles:Record<View,string>={overview:"Overview",tds:"Technical submissions",procurement:"Procurement",costs:"Project costs",design:"Design",monthly:"Monthly work register",site:"Site register",settings:"Project details",sources:"Source files"};

export default function Dashboard({workspace,setWorkspace,version,projectId,view}:{workspace:Workspace;setWorkspace:React.Dispatch<React.SetStateAction<Workspace>>;version:React.MutableRefObject<number>;projectId:string;view:View}){
  const {canEdit}=useAuth();
  const ActivePage=pageComponents[view];
  const [registerFilters,setRegisterFilters]=useState(()=>{
    const query=new URLSearchParams(window.location.search);
    return {...defaultTrackerFilters,...Object.fromEntries(["trade","status","workStage","budget"].flatMap(key=>query.has(key)?[[key,query.get(key)!]]:[]))};
  });
  const [drawer,setDrawer]=useState<{kind:string,row:Row,isNew?:boolean}|null>(null);
  const [rowEditor,setRowEditor]=useState<{section:RegisterSection,row:Row,isNew?:boolean}|null>(null);
  const [detail,setDetail]=useState<Row|null>(null);
  const ready=canEdit;
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [mobileNav,setMobileNav]=useState(false);
  const p=workspace.projects.find(project=>project.id===projectId)!;

  useEffect(()=>{if(message){const timer=setTimeout(()=>setMessage(""),3000);return()=>clearTimeout(timer);}},[message]);

  function go(next:View,selectedTrade="All trades",selectedStatus="All statuses",workStage="All work stages",selectedBudget="All budgets"){
    const query=new URLSearchParams({project:projectId,trade:selectedTrade,status:selectedStatus,workStage,budget:selectedBudget});
    window.location.assign(pagePaths[next]+"?"+query.toString());
  }
  async function saveProject(next:Project,description:string){
    if(!ready){setError("Sign in to save project changes.");return false;}
    if(saving)return false;
    setSaving(true);setError("");
    const changed={...next,history:[{id:uid(),name:description,date:new Date().toISOString()},...p.history].slice(0,1000)};
    const nextWorkspace={projects:workspace.projects.map(x=>x.id===p.id?changed:x)};
    try{
      const response=await workspaceRequest({method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspace:nextWorkspace,version:version.current})});
      const result=await response.json() as {version:number;workspace?:Workspace;error?:string};
      if(!response.ok)throw new Error(result.error||"Changes could not be saved.");
      version.current=result.version;setWorkspace(result.workspace||nextWorkspace);setMessage("Changes saved");return true;
    }catch(e:any){setError(e.message);return false;}finally{setSaving(false);}
  }
  async function saveRecord(row:Row){
    if(!drawer)return;
    if(drawer.kind==="project"){
      if(await saveProject({...p,...row} as Project,"Project details updated"))setDrawer(null);
      return;
    }
    const key=drawer.kind as "recurring"|"expenses"|"bills"|"fronts"|"design"|"milestones";
    const rows=p[key];
    const updated=drawer.isNew?[...rows,row]:rows.map(r=>r.id===row.id?row:r);
    if(await saveProject({...p,[key]:updated},`${row.name} updated`))setDrawer(null);
  }
  async function removeRecord(){
    if(!drawer)return;
    const key=drawer.kind as "recurring"|"expenses"|"bills";
    if(await saveProject({...p,[key]:p[key].filter(r=>r.id!==drawer.row.id)},`${drawer.row.name} removed`))setDrawer(null);
  }
  function edit(kind:string,row:Row){if(!canEdit)return;setError("");setDrawer({kind,row});}
  function add(kind:string){if(!canEdit)return;setError("");setDrawer({kind,row:defaultRow(kind,p),isNew:true});}

  function openRow(section:RegisterSection,row?:Row){if(!canEdit)return;setDetail(null);setRowEditor({section,row:row||{...emptyRegisterRow(section,`${section==="design"?"DWG":"MAT"}-${crypto.randomUUID()}`),trade:p.trades[0]||""},isNew:!row});}

  return <div className={`app ${mobileNav?"nav-open":""}`}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">u</span><span>Project Control</span></div>
      <a className="back-to-projects" href="/"><ArrowLeft size={15}/>All projects</a>
      <div className="project-name"><span>{p.name}</span><small>{p.code}{p.location?` · ${p.location}`:p.type!=="Other"?` · ${p.type}`:""}</small></div>
      <nav>{navigation.map((n,i)=><React.Fragment key={n.id}>{i===3&&<div className="nav-divider"/>}<button className={view===n.id?"selected":""} onClick={()=>go(n.id)}><n.icon size={18} strokeWidth={1.65}/>{n.label}</button></React.Fragment>)}</nav>
      <div className="sidebar-bottom"><button onClick={()=>go("settings")} className={view==="settings"?"selected":""}><Settings2 size={17}/>Project details</button><div className="sidebar-foot">Unique Engineers<small>{p.demo?"Sample project":"Private project"}</small></div></div>
    </aside>
    {mobileNav&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
    <div className={`workspace ${view==="overview"?"overview-workspace":view==="costs"?"costs-workspace":view==="tds"||view==="procurement"?"register-workspace":""}`}>
      <header className="topbar"><button className="menu-button icon-button" aria-label="Open navigation" onClick={()=>setMobileNav(!mobileNav)}><Menu size={20}/></button><span>MEPF <i/> Civil <i/> BMS / ELV</span><span>{saving?"Saving…":p.demo?"Sample data":p.history.length?"Saved in MySQL":"MySQL · No records added"}</span><AuthControls/></header>
      <main>
        {error&&<div className="error-banner" role="alert"><span>{error}</span>{!ready&&<a href="/signin-with-chatgpt?return_to=/" target="_top">Sign in</a>}<button aria-label="Dismiss error" className="icon-button" onClick={()=>setError("")}><X size={16}/></button></div>}
        <div className="page-heading"><div><p className="eyebrow">{p.name}</p><h1>{titles[view]}</h1></div><span className="reporting-date">Reporting date · {dateLabel(p.asOf)}</span></div>


        <ActivePage key={p.id} p={p} go={go} openRow={openRow} edit={edit} add={add} registerFilters={registerFilters} setRegisterFilters={setRegisterFilters} setDetail={setDetail}/>

        <footer><span>{p.name} · {p.code}</span><span>INR · Excluding GST</span></footer>
      </main>
    </div>
    {canEdit&&drawer&&<RecordEditor key={drawer.kind+drawer.row.id} kind={drawer.kind} row={drawer.row} p={p} isNew={drawer.isNew} saving={saving} onClose={()=>setDrawer(null)} onSave={saveRecord} onDelete={removeRecord}/>}
    {canEdit&&rowEditor&&<RowEditor key={rowEditor.section+rowEditor.row.id} {...rowEditor} project={p} onClose={()=>setRowEditor(null)} onSaved={(result,isNew,id)=>{setWorkspace(result.workspace);version.current=result.version;setRowEditor(null);if(isNew&&view!=="design")setRegisterFilters({...defaultTrackerFilters,search:id});setMessage(isNew?"Row added":"Changes saved");}}/>}
    {detail&&<MaterialDetail row={detail} p={p} initialTab={view==="procurement"?"Procurement":"TDS"} onEdit={section=>openRow(section,detail)} onClose={()=>setDetail(null)}/>}
    {error&&drawer&&<div className="save-error" role="alert">{error}</div>}
    {message&&<div className="toast" role="status"><Check size={15}/>{message}</div>}
  </div>;
}
