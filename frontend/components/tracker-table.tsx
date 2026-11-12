"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import React,{useEffect,useRef,useState} from "react";
import {Pencil,ArrowDown,ArrowUp,ArrowUpDown,ChevronLeft,ChevronRight,ExternalLink} from "lucide-react";
import {Row,dateLabel,monthLabel,money} from "@/lib/project";
import {TrackerColumn,TrackerSection,TRACKER_COLUMNS,trackerValue,sortTracker} from "@/lib/tracker";

export default function TrackerTable({rows,section,onDetail,onEdit,onReset}:{rows:Row[];section:TrackerSection;onDetail:(row:Row)=>void;onEdit:(row:Row)=>void;onReset:()=>void}){
  const {canEdit}=useAuth();
  const columns=TRACKER_COLUMNS[section],groups=[...new Set(columns.map(c=>c.group))];
  const [sort,setSort]=useState({key:"name",ascending:true}),[selected,setSelected]=useState("");
  const scroll=useRef<HTMLDivElement>(null);
  const sorted=sortTracker(rows,sort.key,sort.ascending,section);
  useEffect(()=>{if(scroll.current)scroll.current.scrollTop=0;},[rows,sort]);
  function jump(group:string){
    const table=scroll.current;if(!table)return;
    const target=table.querySelector<HTMLElement>(`[data-group="${group}"]`),pin=table.querySelector<HTMLElement>(".sheet-material");
    if(target&&pin)table.scrollTo({left:Math.max(0,target.offsetLeft-pin.offsetWidth-(table.querySelector<HTMLElement>(".sheet-index")?.offsetWidth||44)),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }
  function sortButton(key:string,label:string){return <button className="sheet-sort" onClick={()=>setSort({key,ascending:sort.key===key?!sort.ascending:true})}>{label}{sort.key===key?(sort.ascending?<ArrowUp size={12}/>:<ArrowDown size={12}/>):<ArrowUpDown size={11}/>}</button>}
  function cell(row:Row,c:TrackerColumn){
    const value=trackerValue(row,c.key);if(value===null||value===undefined||value==="")return <span className="cell-missing">—</span>;
    if(c.kind==="date")return dateLabel(String(value));
    if(c.kind==="month")return monthLabel(String(value));
    if(c.kind==="money")return money(Number(value),true);
    if(c.kind==="number")return Number(value).toLocaleString("en-IN",{maximumFractionDigits:3});
    if(c.kind==="status")return <span className={`sheet-status ${/Approved|Delivered/.test(String(value))?"done":/review|negotiation|RFQ/.test(String(value))?"pending":/resubmit/.test(String(value))?"resubmit":""}`}>{String(value)}</span>;
    if(c.kind==="link")return /^https?:\/\//i.test(String(value))?<a href={String(value)} target="_blank" rel="noopener noreferrer" className="sheet-document">Open<ExternalLink size={12}/></a>:<span className="cell-missing">—</span>;
    return String(value);
  }
  return <>
    <div className="sheet-navigation"><span>Columns</span><div className="sheet-jumps">{groups.map(g=><button key={g} onClick={()=>jump(g)} aria-label={`Show ${g.toLowerCase()} columns`}>{g}</button>)}</div><div className="sheet-scroll-buttons"><button aria-label="Scroll tracker left" onClick={()=>scroll.current?.scrollBy({left:-450,behavior:"smooth"})}><ChevronLeft size={15}/></button><button aria-label="Scroll tracker right" onClick={()=>scroll.current?.scrollBy({left:450,behavior:"smooth"})}><ChevronRight size={15}/></button></div></div>
    <div className="sheet-viewport" ref={scroll} tabIndex={0} role="region" aria-label={`${section==="tds"?"TDS":"Procurement"} complete tracker, scroll for all columns`}>
      <table className="tracker-sheet" style={{width:`calc(var(--sheet-index-width,44px) + var(--sheet-name-width,236px) + ${columns.reduce((n,c)=>n+c.width,0)}px)`}} aria-label={`${section==="tds"?"TDS":"Procurement"} tracker`}>
        <colgroup><col style={{width:"var(--sheet-index-width,44px)"}}/><col style={{width:"var(--sheet-name-width,236px)"}}/>{columns.map(c=><col key={c.key} style={{width:c.width}}/>)}</colgroup>
        <thead><tr className="sheet-groups"><th rowSpan={2} scope="col" className="sheet-index">#</th><th rowSpan={2} scope="col" className="sheet-material" aria-sort={sort.key==="name"?(sort.ascending?"ascending":"descending"):"none"}>{sortButton("name","Material / package")}</th>{groups.map(g=><th key={g} data-group={g} scope="colgroup" colSpan={columns.filter(c=>c.group===g).length}>{g}</th>)}</tr><tr className="sheet-labels">{columns.map(c=><th key={c.key} scope="col" className={c.kind==="money"||c.kind==="number"?"sheet-numeric":""} aria-sort={sort.key===c.key?(sort.ascending?"ascending":"descending"):"none"}>{sortButton(c.key,c.label)}</th>)}</tr></thead>
        <tbody>{sorted.map((r,index)=><tr key={r.id} className={selected===r.id?"sheet-selected":""}><td className="sheet-index">{index+1}</td><td className="sheet-material"><div className="sheet-material-actions"><button onClick={()=>{setSelected(r.id);onDetail(r);}}>{r.name}<ChevronRight size={12}/></button>{canEdit&&<button className="sheet-edit" aria-label={`Edit ${r.name}`} title="Edit row" onClick={()=>onEdit(r)}><Pencil size={12}/></button>}</div></td>{columns.map(c=><td key={c.key} className={`${c.kind==="money"||c.kind==="number"?"sheet-numeric":""} ${c.kind==="notes"?"sheet-notes":""} ${c.key==="variance"&&Number(trackerValue(r,c.key))<0?"sheet-over":""}`} title={String(trackerValue(r,c.key)??"")}>{cell(r,c)}</td>)}</tr>)}</tbody>
      </table>
      {!rows.length&&<div className="sheet-empty"><strong>No matching materials</strong><p>Try a different trade, status or search.</p><button onClick={onReset}>Clear filters</button></div>}
    </div>
    <div className="sheet-bottom"><span>{rows.length} {rows.length===1?"material":"materials"} · {columns.length+1} columns</span><span>Material names and headers stay visible as you scroll</span></div>
  </>;
}
