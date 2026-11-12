import React from "react";
import {ChevronRight} from "lucide-react";
export function Status({value}:{value:string}) {
  const style=/^Approved|^Delivered|^Complete|^Available/.test(value)?"approved":/^Under review|^In negotiation|^Partial/.test(value)?"review":"neutral";
  return <span className={`status ${style}`}>{value||"—"}</span>;
}

export function SectionTitle({children,action}:{children:React.ReactNode,action?:React.ReactNode}){return <div className="section-title"><h2>{children}</h2>{action}</div>}
export function Go({children,onClick}:{children:React.ReactNode,onClick:()=>void}){return <button className="text-link" onClick={onClick}>{children}<ChevronRight size={14}/></button>}
export function Empty(){return <div className="empty">No records to show.</div>}

