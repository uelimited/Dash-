"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import React from "react";
import {Plus} from "lucide-react";
import {money,dateLabel} from "@/lib/project";
import {Status,SectionTitle,Go,Empty} from "../shared/page-ui";
import type {PageProps} from "./types";

export default function DesignPage({p,openRow,edit}:PageProps){
  const {canEdit}=useAuth();
  return (<section className="surface"><SectionTitle action={canEdit&&<button className="button" onClick={()=>openRow("design")}><Plus size={14}/>Add drawing</button>}>Drawings & BIM</SectionTitle><div className="table-scroll"><table><thead><tr><th>Document</th><th>Document number</th><th>Trade</th><th>Type</th><th>Revision</th><th>Status</th><th>Target date</th></tr></thead><tbody>{p.design.map(r=><tr key={r.id}><td><button className="row-title" onClick={()=>openRow("design",r)} disabled={!canEdit} title={canEdit?"Edit drawing":"View only"}>{r.name}</button></td><td>{r.drawingNo||"—"}</td><td>{r.trade}</td><td>{r.kind}</td><td>{r.revision}</td><td><Status value={r.status}/></td><td>{dateLabel(r.due)}</td></tr>)}</tbody></table>{!p.design.length&&<Empty/>}</div></section>);
}
