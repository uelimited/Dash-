"use client";

import React, {useId, useState} from "react";
import { ArrowUpRight, ChevronRight, FileCheck2, PackageCheck, ShoppingBag, Wallet } from "lucide-react";
import { Project, money, pct, monthLabel } from "@/lib/project";
import { overviewData } from "@/lib/overview";

import { colors,tdsColors,stageColors,tdsNames,tradeColor } from "@/lib/chart-palette";

type Open=(view:"tds"|"procurement"|"costs",trade?:string,status?:string,group?:string,budget?:string)=>void;


function Card({title,subtitle,action,children,className=""}:{title:string,subtitle:string,action?:()=>void,children:React.ReactNode,className?:string}){
  return <section className={`chart-card ${className}`}><div className="chart-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action&&<button className="chart-open" aria-label={`Open ${title} details`} onClick={action}><ArrowUpRight size={17}/></button>}</div>{children}</section>;
}
function Dot({color}:{color:string}){return <i className="chart-dot" style={{background:color}}/>}
function MiniRing({value,color}:{value:number,color:string}){return <svg className="mini-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="none" stroke="#eef1f6" strokeWidth="5"/><circle cx="22" cy="22" r="17" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 22 22)"/></svg>}

export default function Overview({project:p,onOpen}:{project:Project,onOpen:Open}){
  const [group,setGroup]=useState("All materials");
  const a=overviewData(p,group), total=a.items.length;
  const tdsKnown=a.items.some(r=>r.tds!=="Not recorded"),ordersKnown=a.items.some(r=>r.stage!=="Not recorded"),deliveryKnown=a.items.some(r=>r.delivered!=null||r.stage==="Delivered");
  const open=(view:"tds"|"procurement",trade="All trades",status="All statuses",workStage=group==="All materials"?"All work stages":group,budget="All budgets")=>onOpen(view,trade,status,workStage,budget);
  const maxStage=Math.max(1,...a.stages.map(s=>s.value));
  const firstTotal=a.byTrade.reduce((n,t)=>n+t.first.total,0),firstDelivered=a.byTrade.reduce((n,t)=>n+t.first.delivered,0);
  let offset=0;
  return <div className="visual-overview">
    <div className="overview-controls"><span><b>{total}</b> material packages<span className="control-dot">·</span>{p.trades.length} trades</span><div className="scope-switch" aria-label="Material scope">{["All materials","First fix"].map(s=><button key={s} aria-pressed={group===s} className={group===s?"active":""} onClick={()=>setGroup(s)}>{s}</button>)}</div></div>

    <div className="metric-grid">
      <button className="metric-card" onClick={()=>open("tds","All trades","All approvals")}><span className="metric-label"><FileCheck2 size={15}/>TDS approved<ArrowUpRight size={14}/></span><div className="metric-value"><strong>{tdsKnown?a.approved:"—"}{tdsKnown&&<em> / {total}</em>}</strong><MiniRing value={pct(a.approved,total)} color={colors.blue}/></div><span className="metric-caption"><b>{tdsKnown?`${pct(a.approved,total)}%`:"—"}</b> approved <span>including comments</span></span></button>
      <button className="metric-card" onClick={()=>open("procurement","All trades","Ordered")}><span className="metric-label"><ShoppingBag size={15}/>Orders placed<ArrowUpRight size={14}/></span><div className="metric-value"><strong>{ordersKnown?a.ordered:"—"}{ordersKnown&&<em> / {total}</em>}</strong><MiniRing value={pct(a.ordered,total)} color={colors.purple}/></div><span className="metric-caption"><b>{ordersKnown?`${pct(a.ordered,total)}%`:"—"}</b> ordered <span>LOI / PO or delivered</span></span></button>
      <button className="metric-card" onClick={()=>open("procurement","All trades","Delivered")}><span className="metric-label"><PackageCheck size={15}/>Delivered<ArrowUpRight size={14}/></span><div className="metric-value"><strong>{deliveryKnown?a.delivered:"—"}{deliveryKnown&&<em> / {total}</em>}</strong><MiniRing value={pct(a.delivered,total)} color={colors.teal}/></div><span className="metric-caption"><b>{deliveryKnown?`${pct(a.delivered,total)}%`:"—"}</b> recorded <span>{deliveryKnown?"delivery stage":"No delivery status recorded"}</span></span></button>
    </div>

    <div className="overview-chart-grid">
      <Card title="TDS status" subtitle="Current approval position" action={()=>open("tds")} className="tds-card">
        <div className="approval-layout"><div className="approval-ring"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="70" fill="none" stroke="#f0f3f7" strokeWidth="17"/>{tdsNames.map(name=>{const value=a.tds.find(s=>s.name===name)?.value||0,length=total?value/total*100:0,start=offset;offset+=length;return length>0?<circle key={name} cx="90" cy="90" r="70" fill="none" stroke={tdsColors[name]} strokeWidth="17" pathLength="100" strokeDasharray={`${Math.max(0,length-(length===100?0:0.8))} 100`} strokeDashoffset={-start} transform="rotate(-90 90 90)"><title>{`${name}: ${value} of ${total}`}</title></circle>:null;})}</svg><div><strong>{tdsKnown?`${pct(a.approved,total)}%`:"—"}</strong><span>approved</span></div></div><div className="approval-legend">{tdsNames.map(name=>{const value=a.tds.find(s=>s.name===name)?.value||0;return <button key={name} onClick={()=>open("tds","All trades",name)}><Dot color={tdsColors[name]}/><span>{name==="Approved with comments"?"With comments":name==="Revise & resubmit"?"Resubmit":name}</span><b>{value}</b><ChevronRight size={12}/></button>})}</div></div>
        <div className="chart-footer"><span>{total-a.approved} without recorded approval</span><button onClick={()=>open("tds")}>View submissions<ChevronRight size={13}/></button></div>
      </Card>

      <Card title="Procurement stages" subtitle="Where each material package stands" action={()=>open("procurement")} className="procurement-card">
        <div className="stage-chart">{a.stages.map((s,i)=><button className="stage-chart-row" key={s.name} onClick={()=>open("procurement","All trades",s.name)} aria-label={`${s.name}: ${s.value} packages`}><span>{s.name}</span><div className="stage-track"><i style={{width:`${s.value/maxStage*100}%`,background:stageColors[i]}}/></div><b>{s.value}</b></button>)}</div>
        <div className="chart-footer"><span>Each package appears in one stage</span><button onClick={()=>open("procurement")}>View procurement<ChevronRight size={13}/></button></div>
      </Card>

      <Card title="Progress by trade" subtitle="Approved submissions and orders placed" action={()=>open("tds")} className="trade-chart-card">
        <div className="chart-legend trade-key"><span><i className="trade-key-solid"/>TDS approved</span><span><i className="trade-key-soft"/>Orders placed</span><span>Colour identifies the trade</span></div>
        <div className="trade-chart colourful-trades"><div className="trade-scale"><span>0%</span><span>50%</span><span>100%</span></div>{a.byTrade.filter(t=>t.total>0).map(t=><div className="trade-chart-row" key={t.name} style={{"--trade-color":tradeColor(t.name)} as React.CSSProperties}><button className="trade-name" onClick={()=>open("tds",t.name)}><Dot color={tradeColor(t.name)}/>{t.name}</button><div className="trade-pair">{[{n:t.approved,label:"TDS approved",short:"TDS",view:"tds" as const,status:"All approvals"},{n:t.ordered,label:"Ordered",short:"Orders",view:"procurement" as const,status:"Ordered"}].map((s,i)=><button key={s.label} className={`trade-bar ${i?"orders":"approvals"}`} aria-label={`${t.name}: ${s.n} of ${t.total} ${s.label}`} onClick={()=>open(s.view,t.name,s.status)}><span className="trade-bar-label">{s.short}</span><span className="trade-track"><i style={{width:`${pct(s.n,t.total)}%`,background:tradeColor(t.name),opacity:i?.48:1}}/></span><span className="trade-ratio">{s.n}<em>/{t.total}</em></span></button>)}</div></div>)}</div>
        <p className="chart-note">Approval includes comments. Orders include LOI, PO and delivered packages.</p>
      </Card>

      <Card title="First-fix materials" subtitle={deliveryKnown?`${firstDelivered} of ${firstTotal} packages delivered`:"Delivery status not recorded"} action={()=>open("procurement","All trades","All statuses","First fix")} className="first-fix-card">
        <div className="readiness-matrix first-fix-progress"><div className="matrix-head"><span>Trade</span><span>TDS approved</span><span>Orders placed</span><span>Delivered</span></div>{a.byTrade.filter(t=>t.total>0).map(t=><div className="matrix-row" key={t.name}><span>{t.name}</span>{[{key:"approved" as const,color:colors.blue,view:"tds" as const,status:"All approvals"},{key:"ordered" as const,color:colors.purple,view:"procurement" as const,status:"Ordered"},{key:"delivered" as const,color:colors.teal,view:"procurement" as const,status:"Delivered"}].map(s=>{const value=t.first[s.key],ratio=t.first.total?value/t.first.total:0;return <button key={s.key} disabled={!t.first.total} onClick={()=>open(s.view,t.name,s.status,"First fix")} aria-label={`${t.name} first fix: ${value} of ${t.first.total} ${s.key}`}><span>{t.first.total&&(s.key!=="delivered"||deliveryKnown)?<><b>{value}</b><em>of {t.first.total}</em></>:"—"}</span><span className="first-fix-track" aria-hidden="true"><i style={{width:`${ratio*100}%`,background:s.color}}/></span></button>})}</div>)}</div>
        <p className="chart-note">Completed packages out of required packages. Select a bar to see the materials.</p>
      </Card>


    </div>
  </div>;
}