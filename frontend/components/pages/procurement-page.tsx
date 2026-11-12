"use client";
import RegisterDashboard from "../register-dashboard";
import type {PageProps} from "./types";
export default function ProcurementPage({p,registerFilters,setRegisterFilters,setDetail,openRow,go}:PageProps){
  return <RegisterDashboard section="procurement" project={p} filters={registerFilters} onFilters={setRegisterFilters} onDetail={setDetail} onEdit={row=>openRow("procurement",row)} onAdd={()=>openRow("procurement")} onSources={()=>go("sources")}/>;
}
