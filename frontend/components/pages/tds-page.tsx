"use client";
import RegisterDashboard from "../register-dashboard";
import type {PageProps} from "./types";
export default function TdsPage({p,registerFilters,setRegisterFilters,setDetail,openRow,go}:PageProps){
  return <RegisterDashboard section="tds" project={p} filters={registerFilters} onFilters={setRegisterFilters} onDetail={setDetail} onEdit={row=>openRow("tds",row)} onAdd={()=>openRow("tds")} onSources={()=>go("sources")}/>;
}
