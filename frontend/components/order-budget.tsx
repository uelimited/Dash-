"use client";
import React from "react";
import {ArrowUpRight,ChevronRight} from "lucide-react";
import {money} from "@/lib/project";
import {overviewData} from "@/lib/overview";
import {colors} from "@/lib/chart-palette";

type Data=ReturnType<typeof overviewData>;
const compared="With budget & order value";
export default function OrderBudget({data:a,onOpen}:{data:Data;onOpen:(trade:string,budget:string)=>void}){
  const scale=Math.max(1,a.budget,a.orderValue),rows=a.byTrade.filter(t=>t.comparable>0),difference=a.budget-a.orderValue;
  return <section className="chart-card order-budget-card">
    <div className="chart-heading"><div><h2>Procurement budget</h2><p>Budget and order value for the same items</p></div><button className="chart-open" aria-label="View items in budget comparison" onClick={()=>onOpen("All trades",compared)}><ArrowUpRight size={17}/></button></div>
    {a.comparable>0?<>
      <div className="order-budget-summary">
        {[{label:"Budget for these items",value:a.budget,color:"#b9c6d9"},{label:"LOI / PO value",value:a.orderValue,color:colors.blue}].map(row=><div className="order-budget-total" key={row.label}><div><span>{row.label}</span><strong>{money(row.value,true)}</strong></div><div className="order-budget-track" aria-hidden="true"><i style={{width:`${row.value/scale*100}%`,background:row.color}}/></div></div>)}
        <div className={`order-budget-result ${difference<0?"above":difference===0?"equal":"below"}`}><span>Overall</span><strong>{difference===0?"Exactly on budget":`${money(Math.abs(difference),true)} ${difference<0?"above":"below"} budget`}</strong></div>
      </div>
      <div className="order-budget-table-wrap"><table className="order-budget-table" aria-label="Budget and orders by trade"><thead><tr><th>Trade</th><th>Budget</th><th>LOI / PO</th><th>Difference</th></tr></thead><tbody>{rows.map(t=>{const net=t.budget-t.orderValue;return <tr key={t.name}><td><button onClick={()=>onOpen(t.name,compared)} aria-label={`View ${t.name} items in budget comparison`}>{t.name}<ChevronRight size={11}/></button></td><td>{money(t.budget,true)}</td><td>{money(t.orderValue,true)}</td><td className={net<0?"budget-above":net>0?"budget-below":"budget-equal"}>{net===0?"On budget":<>{money(Math.abs(net),true)}<small>{net<0?"above":"below"}</small></>}</td></tr>})}</tbody></table></div>
      {a.over>0&&<button className="order-budget-over-link" onClick={()=>onOpen("All trades","Over budget")}>{a.over} {a.over===1?"item is":"items are"} above budget<ChevronRight size={12}/></button>}
    </>:<div className="chart-empty">Enter a budget and LOI / PO value for an ordered item to compare them here.</div>}
    <div className="order-budget-note"><p>{a.comparable} of {a.ordered} ordered items compared{a.missingComparison?` · ${a.missingComparison} excluded: budget or order value missing`:""}.</p><p>Unordered items are excluded. LOI / PO values are commitments; actual payments are shown in Costs.</p></div>
  </section>;
}
