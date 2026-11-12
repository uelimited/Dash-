"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import React,{useState} from "react";
import ProjectDialog from "./project-dialog";
import ProjectStatusBars from "./project-status-bars";
import {workspaceRequest} from "@/lib/local-workspace";
import {ArrowUpRight,ArrowRight,Building2,Files,ShoppingBag,LayoutGrid,Search,FlaskConical,Layers3,Server,Flame,MapPin,Trash2} from "lucide-react";
import {Workspace,pct} from "@/lib/project";
import {portfolioSummary,projectHref,updatedLabel} from "@/lib/portfolio";
const accents=["#3979ed","#8270d8","#299d8a"];
const icons=[Building2,Server,Flame];
const appearance=(id:string)=>Math.max(0,["prestige-bkc","ctrls-hyd-gf","bitsom-heat-pump"].indexOf(id));
function Progress({label,n,total,color}:{label:string;n:number;total:number;color:string}){
  return <div className="portfolio-progress"><div><span>{label}</span><b>{total?<>{n}<small> / {total}</small></>:<span className="not-entered">—</span>}</b></div><div className="portfolio-progress-track" aria-hidden="true"><i style={{width:`${pct(n,total)}%`,background:color}}/></div></div>;
}
export default function Portfolio({workspace,version}:{workspace:Workspace;version:number}){
  const {canEdit}=useAuth();
  const [search,setSearch]=useState("");
  const [adding,setAdding]=useState(false),[deleting,setDeleting]=useState<string|null>(null),[error,setError]=useState("");
  async function deleteProject(id:string,name:string){
    if(!window.confirm(`Delete ${name} and all its TDS, procurement and drawing records? This cannot be undone.`))return;
    setDeleting(id);setError("");
    try{
      const response=await workspaceRequest({method:"DELETE",body:JSON.stringify({kind:"project",projectId:id,version})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
    }catch(e){setError(e instanceof Error?e.message:"Project could not be deleted.");}finally{setDeleting(null);}
  }
  const a=portfolioSummary(workspace),shown=a.projects.filter(s=>`${s.project.name} ${s.project.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  const samples=workspace.projects.filter(p=>p.demo);
  return <div className="app portfolio-app">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">u</span><span>Project Control</span></div><div className="project-name"><span>Unique Engineers</span><small>Project portfolio</small></div><nav><a className="selected" href="/" aria-current="page"><LayoutGrid size={18}/>Overview</a></nav><div className="portfolio-nav-label">Projects</div><nav className="portfolio-project-nav">{a.projects.map((s,i)=><a key={s.project.id} href={projectHref(s.project.id)}><i style={{background:accents[appearance(s.project.id)]}}/><span>{s.project.name}</span><ArrowUpRight size={13}/></a>)}</nav><div className="sidebar-bottom">{samples.map(p=><a key={p.id} className="sample-link" href={projectHref(p.id)}><FlaskConical size={16}/>{samples.length===1?"Sample dashboard":p.name}</a>)}<div className="sidebar-foot">Unique Engineers<small>Private workspace</small></div></div></aside>
    <div className="workspace portfolio-workspace"><header className="topbar"><span>All projects</span><span>MySQL · {a.projects.length} projects</span><AuthControls/></header><main>
      <div className="page-heading"><div><p className="eyebrow">Unique Engineers</p><h1>Project overview</h1><p className="portfolio-subtitle">TDS and procurement across your projects.</p></div>{canEdit&&<button className="btn primary" onClick={()=>setAdding(true)}>Add project</button>}</div>
      {canEdit&&adding&&<ProjectDialog onClose={()=>setAdding(false)}/>}{error&&<p role="alert" className="form-error">{error}</p>}<p className="live-note">Saved in MySQL. Charts update after saving and check for other changes every 5 seconds.</p><div className="portfolio-metrics">
        <div><span><Layers3 size={16}/>Projects</span><strong>{a.projects.length}</strong><small>{a.withRecords} with records · {a.projects.length-a.withRecords} awaiting records</small></div>
        <div><span><Files size={16}/>TDS approved</span><strong>{a.total?a.approved:"—"}{a.total>0&&<em> / {a.total}</em>}</strong><small>{a.total?`${pct(a.approved,a.total)}% approved, including comments`:"Awaiting TDS records"}</small></div>
        <div><span><ShoppingBag size={16}/>Orders placed</span><strong>{a.total?a.ordered:"—"}{a.total>0&&<em> / {a.total}</em>}</strong><small>{a.total?"LOI, PO and delivered packages":"Awaiting procurement records"}</small></div>
      </div>
      <div className="portfolio-section-heading"><h2>Projects</h2><label className="portfolio-search"><Search size={16}/><input aria-label="Search projects" placeholder="Search projects" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
      <div className="project-cards">{shown.map(s=>{const index=appearance(s.project.id),Icon=icons[index],color=accents[index];return <article className="project-card" key={s.project.id} style={{"--project-accent":color} as React.CSSProperties}>
        <div className="project-card-top"><span className="project-symbol"><Icon size={23} strokeWidth={1.6}/></span><span className={`project-data-state ${s.hasRecords?"has-records":""}`}>{s.hasRecords?"Active records":"Awaiting records"}</span></div>
        <a className="project-card-title" href={projectHref(s.project.id)}><h2>{s.project.name}</h2><ArrowUpRight size={18}/></a><div className="project-card-meta"><span className="project-code-badge">{s.project.code}</span>{s.project.location&&<span><MapPin size={12}/>{s.project.location}</span>}</div>
        <div className="project-card-registers"><ProjectStatusBars project={s.project} section="tds"/><ProjectStatusBars project={s.project} section="procurement"/></div>
        <div className="project-card-delivery"><Progress label="First fix delivered" n={s.firstFix.delivered} total={s.firstFix.hasDeliveryStatus?s.firstFix.total:0} color="#299d8a"/></div>
        <div className="project-card-footer"><div><span>{s.latest?`Updated ${updatedLabel(s.latest)}`:"No updates yet"}</span>{canEdit&&<button className="project-delete" disabled={deleting!==null} onClick={()=>void deleteProject(s.project.id,s.project.name)} aria-label={`Delete ${s.project.name}`}><Trash2 size={12}/>{deleting===s.project.id?"Deleting…":"Delete project"}</button>}</div><a href={projectHref(s.project.id)} aria-label={`Open ${s.project.name}`}>Open project<ArrowRight size={15}/></a></div>
      </article>})}</div>
      {!shown.length&&<div className="portfolio-empty"><Search size={24}/><h2>{a.projects.length?"No matching projects":"No projects yet"}</h2><p>{a.projects.length?"Try a different name or project code.":"Add a project to start its TDS and procurement registers."}</p><button className="btn" onClick={()=>setSearch("")}>Clear search</button></div>}
      <section className="portfolio-comparison surface"><div className="section-title"><div><h2>Project comparison</h2><p>Based on each project’s current registers.</p></div><span>{shown.length} {shown.length===1?"project":"projects"}</span></div><div className="table-scroll"><table aria-label="Project comparison"><thead><tr><th>Project</th><th>TDS approved</th><th>Orders placed</th><th>Delivered</th><th>Last updated</th><th/></tr></thead><tbody>{shown.map(s=><tr key={s.project.id}><td><a href={projectHref(s.project.id)}>{s.project.name}</a></td><td>{s.hasTdsStatus?`${s.approved} / ${s.total}`:"—"}</td><td>{s.hasOrderStatus?`${s.ordered} / ${s.total}`:"—"}</td><td>{s.hasDeliveryStatus?`${s.delivered} / ${s.total}`:"—"}</td><td>{updatedLabel(s.latest)}</td><td><a href={projectHref(s.project.id)} aria-label={`View ${s.project.name} dashboard`}><ArrowUpRight size={15}/></a></td></tr>)}</tbody></table></div></section>
      <p className="portfolio-note">{a.withRecords===0?"Your projects are ready. Share a tracker in chat with the project name, or open a project to add a row.":"All totals come from the project registers. Open a project to view or update its records."} Sample data is excluded.</p>
      <footer><span>Unique Engineers</span><span>INR · Excluding GST</span></footer>
    </main></div>
  </div>;
}
