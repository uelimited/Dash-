"use client";
import CostDashboard from "../cost-dashboard";
import type {PageProps} from "./types";
export default function CostsPage({p,edit,add,go}:PageProps){
  return <CostDashboard project={p} onEdit={edit} onAdd={add} onContract={()=>go("settings")}/>;
}
