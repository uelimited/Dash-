"use client";
import {useAuth,AuthControls} from "@/components/auth-provider";
import React from "react";
import {Plus} from "lucide-react";
import {money,dateLabel} from "@/lib/project";
import {Status,SectionTitle,Go,Empty} from "../shared/page-ui";
import type {PageProps} from "./types";
import Overview from "../overview";
export default function OverviewPage({p,openRow,go}:PageProps){
  const {canEdit}=useAuth();
  return (<>{canEdit&&!p.items.length&&!p.demo&&<div className="project-start"><div><h2>Add the first project records</h2><p>Share the latest TDS or procurement Excel in chat, or add a material here.</p></div><button className="btn primary" onClick={()=>openRow("tds")}><Plus size={14}/>Add material</button></div>}<Overview project={p} onOpen={(next,...filters)=>go(next,...filters)}/></>);
}
