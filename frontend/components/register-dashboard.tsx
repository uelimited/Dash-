"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import React,{useMemo} from "react";
import {Plus,ArrowUpRight,Check,ChevronRight,FileSpreadsheet,Search,SlidersHorizontal,X} from "lucide-react";
import {Project,Row,STAGES,TDS,approved,money,pct,dateLabel} from "@/lib/project";
import {colors,tdsColors,tdsNames,stageColors} from "@/lib/chart-palette";
import {TrackerFilters,TrackerSection,defaultTrackerFilters,filterTracker,trackerSummary,WORK_STAGES,BUDGET_FILTERS} from "@/lib/tracker";
import TrackerTable from "./tracker-table";

type Props={project:Project;section:TrackerSection;filters:TrackerFilters;onFilters:(f:TrackerFilters)=>void;onDetail:(r:Row)=>void;onEdit:(r:Row)=>void;onAdd:()=>void;onSources:()=>void};
function Dot({color}:{color:string}){return <i className="chart-dot" style={{background:color}}/>}
 
export default function RegisterDashboard({project:p,section,filters:f,onFilters,onDetail,onEdit,onAdd,onSources}:Props){
  const {canEdit}=useAuth();
  const scope=useMemo(()=>filterTracker(p.items,section,f,{status:true,budget:true}),[p.items,section,f]);
  const acrossTrades=useMemo(()=>filterTracker(p.items,section,f,{trade:true,status:true,budget:true}),[p.items,section,f]);
  const rows=useMemo(()=>filterTracker(p.items,section,f),[p.items,section,f]);
  const summary=trackerSummary(scope,section),trades=[...new Set([...p.trades,...p.items.map(r=>r.trade)])];
  const change=(patch:Partial<TrackerFilters>)=>onFilters({...f,...patch});
  const clear=()=>onFilters({...defaultTrackerFilters});
  const selectStatus=(status:string)=>change({status:f.status===status?"All statuses":status});
  const hasFilters=Object.keys(defaultTrackerFilters).some(k=>f[k as keyof TrackerFilters]!==defaultTrackerFilters[k as keyof TrackerFilters]);
  const source=p.sources?.[section];
  const activeFilters=([
    ["trade",f.trade,"All trades"],["workStage",f.workStage,"All work stages"],["status",f.status,"All statuses"],
    ...(section==="procurement"?[["budget",f.budget,"All budgets"]]:[]),["search",f.search,""]
  ] as [keyof TrackerFilters,string,string][]).filter(([,value,empty])=>value!==empty);
  let donutOffset=0;
  const maxStage=Math.max(1,...summary.statuses.map(s=>s.count));
  const maxBudget=Math.max(1,summary.budget,summary.commitment);
  return <div className="register-dashboard">
    <div className="register-scope">
      <label className="register-search"><Search size={16}/><input aria-label="Search tracker" value={f.search} placeholder="Search materials, references or remarks" onChange={e=>change({search:e.target.value})}/>{f.search&&<button aria-label="Clear search" onClick={()=>change({search:""})}><X size={13}/></button>}</label>
      <div className="register-scope-options"><label><span>Trade</span><select aria-label="Trade filter" value={f.trade} onChange={e=>change({trade:e.target.value})}><option>All trades</option>{trades.map(t=><option key={t}>{t}</option>)}</select></label><label className="work-stage-select"><span>Work stage</span><select aria-label="Work stage filter" value={f.workStage} onChange={e=>change({workStage:e.target.value})}>{WORK_STAGES.map(s=><option key={s}>{s}</option>)}</select></label><button className={`first-fix-toggle ${f.workStage==="First fix"?"active":""}`} aria-pressed={f.workStage==="First fix"} onClick={()=>change({workStage:f.workStage==="First fix"?"All work stages":"First fix"})}>{f.workStage==="First fix"&&<Check size={13}/>}First fix only</button></div>
    </div>

    <div className="register-charts">
      {section==="tds"?<>
        <section className="chart-card register-approval"><div className="chart-heading"><div><h2>Approval status</h2><p>{summary.total} materials · {f.trade==="All trades"?"all trades":f.trade}</p></div><button className={`chart-filter-reset ${f.status==="All statuses"?"active":""}`} onClick={()=>change({status:"All statuses"})}>All statuses</button></div>
          <div className="approval-layout"><button className="approval-ring ring-filter" aria-label={`Filter all approvals: ${summary.approved} of ${summary.total}`} aria-pressed={f.status==="All approvals"} onClick={()=>selectStatus("All approvals")}><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="70" fill="none" stroke="#f0f3f7" strokeWidth="17"/>{tdsNames.map(name=>{const count=summary.statuses.find(s=>s.name===name)?.count||0,length=summary.total?count/summary.total*100:0,start=donutOffset;donutOffset+=length;return length>0?<circle key={name} cx="90" cy="90" r="70" fill="none" stroke={tdsColors[name]} strokeWidth="17" pathLength="100" strokeDasharray={`${Math.max(0,length-(length===100?0:.8))} 100`} strokeDashoffset={-start} transform="rotate(-90 90 90)"/>:null;})}</svg><span className="ring-label"><strong>{summary.total?`${pct(summary.approved,summary.total)}%`:"—"}</strong><span>approved</span></span></button><div className="approval-legend">{tdsNames.map(name=>{const count=summary.statuses.find(s=>s.name===name)?.count||0;return <button key={name} className={f.status===name?"chart-filter-active":""} aria-pressed={f.status===name} aria-label={`Filter TDS ${name}: ${count}`} onClick={()=>selectStatus(name)}><Dot color={tdsColors[name]}/><span>{name==="Approved with comments"?"With comments":name==="Revise & resubmit"?"Resubmit":name}</span><b>{count}</b><ChevronRight size={12}/></button>})}</div></div>
          <div className="register-chart-foot"><span><b>{summary.approved}</b> approved, including comments</span><span>Select a status to filter rows</span></div>
        </section>
        <section className="chart-card register-trades"><div className="chart-heading"><div><h2>Submissions by trade</h2><p>Across all trades · select a status segment</p></div><span className="trade-total-label">Approved / total</span></div><div className="submission-trades">{trades.map(trade=>{const items=acrossTrades.filter(r=>r.trade===trade);return <div key={trade} className={`submission-trade ${f.trade===trade?"selected":f.trade!=="All trades"?"dimmed":""}`}><button className="submission-trade-name" aria-pressed={f.trade===trade} onClick={()=>change({trade:f.trade===trade?"All trades":trade})}>{trade}</button><div className="submission-stack">{tdsNames.map(status=>{const count=items.filter(r=>r.tds===status).length;return count?<button key={status} title={`${trade} · ${status}: ${count}`} style={{width:`${count/items.length*100}%`,background:tdsColors[status]}} aria-label={`${trade}, ${status}: ${count} materials`} onClick={()=>change({trade,status})}/>:null;})}</div><span>{items.filter(approved).length}<em>/{items.length}</em></span></div>})}</div><div className="register-chart-foot"><span>Trade bars follow work stage and search</span><button onClick={()=>change({trade:"All trades",status:"All statuses"})}>All trades<ChevronRight size={12}/></button></div></section>
      </>:<>
        <section className="chart-card register-pipeline"><div className="chart-heading"><div><h2>Procurement stages</h2><p>{summary.ordered} of {summary.total} ordered · includes LOI, PO and delivered</p></div><button className={`chart-filter-reset ${f.status==="All statuses"?"active":""}`} onClick={()=>change({status:"All statuses"})}>All stages</button></div><div className="stage-chart">{summary.statuses.map((s,i)=><button key={s.name} className={`stage-chart-row ${f.status===s.name?"chart-filter-active":""}`} aria-pressed={f.status===s.name} aria-label={`Filter procurement ${s.name}: ${s.count}`} onClick={()=>selectStatus(s.name)}><span>{s.name}</span><div className="stage-track"><i style={{width:`${s.count/maxStage*100}%`,background:stageColors[i]}}/></div><b>{s.count}</b></button>)}</div><div className="register-chart-foot"><span>One current stage per package</span><button aria-pressed={f.status==="Ordered"} onClick={()=>selectStatus("Ordered")}>Ordered only<ChevronRight size={12}/></button></div></section>
        <section className="chart-card register-commercial"><div className="chart-heading"><div><h2>Budget & order value</h2><p>{summary.comparable} ordered packages with comparable values</p></div></div><div className="commercial-comparison">{[{label:"Budget",value:summary.budget,color:"#bdcbe0"},{label:"Order value",value:summary.commitment,color:colors.purple}].map(b=><div className="commercial-bar" key={b.label}><div><span>{b.label}</span><strong title={money(b.value,true)}>{summary.comparable?money(b.value):"—"}</strong></div><div className="commercial-track"><i style={{background:b.color,width:`${b.value/maxBudget*100}%`}}/></div></div>)}</div><div className="commercial-difference"><strong className={summary.difference<0?"sheet-over":""} title={money(summary.difference,true)}>{summary.comparable?money(Math.abs(summary.difference)):"—"}</strong><span>{summary.comparable?(summary.difference<0?"over budget":summary.difference>0?"within budget":"on budget"):"No comparable orders"}</span></div><div className="commercial-filters">{[{label:"Within budget",count:summary.within,color:colors.teal},{label:"Over budget",count:summary.over,color:colors.coral}].map(b=><button key={b.label} className={f.budget===b.label?"active":""} aria-pressed={f.budget===b.label} onClick={()=>change({budget:f.budget===b.label?"All budgets":b.label,status:"All statuses"})}><Dot color={b.color}/>{b.label}<b>{b.count}</b></button>)}</div><div className="register-chart-foot"><span>{summary.missing?`${summary.missing} ordered packages excluded: missing values`:"Budget less commitment · excluding GST"}</span><button onClick={()=>change({budget:"All budgets"})}>All budgets<ChevronRight size={12}/></button></div></section>
      </>}
    </div>

    <section className="surface complete-tracker">
      <div className="tracker-title"><div><h2>{section==="tds"?"TDS":"Procurement"} tracker</h2><p aria-live="polite">{rows.length} of {p.items.length} materials{hasFilters?" · filtered":""}</p></div><div className="tracker-actions"><span className="tracker-mode"><FileSpreadsheet size={14}/>Complete tracker</span>{canEdit&&<button className="button" onClick={onAdd}><Plus size={14}/>Add row</button>}</div></div>
      <div className="tracker-filters"><SlidersHorizontal size={15}/><label><span>{section==="tds"?"Approval status":"Stage"}</span><select aria-label="Status filter" value={f.status} onChange={e=>change({status:e.target.value})}><option>All statuses</option>{(section==="tds"?[...TDS,"All approvals"]:[...STAGES,"Ordered"]).map(s=><option key={s}>{s}</option>)}</select></label>{section==="procurement"&&<label><span>Budget</span><select aria-label="Budget filter" value={f.budget} onChange={e=>change({budget:e.target.value})}>{BUDGET_FILTERS.map(s=><option key={s}>{s}</option>)}</select></label>}<span className="tracker-filter-hint">Charts show all statuses in the selected scope</span>{hasFilters&&<button className="reset-tracker" onClick={clear}>Clear all</button>}</div>
      {activeFilters.length>0&&<div className="tracker-active-filters">{activeFilters.map(([key,value,empty])=><button key={key} onClick={()=>change({[key]:empty})} aria-label={`Remove ${key} filter: ${value}`}>{key==="search"?`Search: ${value}`:value}<X size={11}/></button>)}</div>}
      <TrackerTable rows={rows} section={section} onDetail={onDetail} onEdit={onEdit} onReset={clear}/>
    </section>
  </div>;
}
