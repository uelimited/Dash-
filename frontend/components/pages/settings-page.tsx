"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import React from "react";
import {Plus} from "lucide-react";
import {money,dateLabel} from "@/lib/project";
import {Status,SectionTitle,Go,Empty} from "../shared/page-ui";
import type {PageProps} from "./types";

export default function ProjectDetailsPage({p,openRow,edit}:PageProps){
  const {canEdit}=useAuth();
  return (<section className="surface narrow-surface"><SectionTitle action={canEdit&&<Go onClick={()=>edit("project",p)}>Edit</Go>}>Project details</SectionTitle><dl className="detail-list">{[["Project",p.name],["Code",p.code],["Client",p.client],["Location",p.location],["Start",dateLabel(p.start)],["Expected completion",dateLabel(p.end)],["Reporting date",dateLabel(p.asOf)],["Trades",p.trades.join(", ")],["Contract value",money(p.contract,true)],["Cost budget",p.budget==null?"—":money(p.budget,true)],["Retention",p.retention==null?"—":p.retention+"%"],["Payment terms",p.paymentDays==null?"—":p.paymentDays+" days"],["Advance",p.advance==null?"—":money(p.advance,true)],["Contract notes",p.notes]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||"—"}</dd></div>)}</dl></section>);
}
