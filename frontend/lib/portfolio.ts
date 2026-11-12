import {Project,Workspace,approved,ordered,hasOrderValue,sum} from "./project";
import {comparableOrder} from "./overview";
export function projectSummary(project:Project){
  const items=project.items,orders=items.filter(ordered),priced=orders.filter(comparableOrder);
  const latest=[...project.history.map(h=>h.date),...Object.values(project.sources||{}).map(s=>s.updatedAt)].filter(Boolean).sort().at(-1)||"";
  return {project,total:items.length,hasTdsStatus:items.some(r=>r.tds!=="Not recorded"),hasOrderStatus:items.some(r=>r.stage!=="Not recorded"),hasDeliveryStatus:items.some(r=>r.delivered!=null||r.stage==="Delivered"),approved:items.filter(approved).length,ordered:orders.length,
    delivered:items.filter(r=>r.stage==="Delivered").length,
    orderValue:sum(orders.filter(hasOrderValue),"commitment"),pricedOrders:orders.filter(hasOrderValue).length,
    missingOrderValues:orders.filter(r=>!hasOrderValue(r)).length,
    comparable:priced.length,missingComparison:orders.length-priced.length,
    difference:sum(priced,"budget")-sum(priced,"commitment"),
    firstFix:{hasDeliveryStatus:items.some(r=>r.group==="First fix"&&(r.delivered!=null||r.stage==="Delivered")),total:items.filter(r=>r.group==="First fix").length,delivered:items.filter(r=>r.group==="First fix"&&r.stage==="Delivered").length},
    latest,hasRecords:!!(items.length||project.design.length||project.expenses.length||project.bills.length||project.fronts.length||project.milestones.length||project.recurring.length)};
}
export function portfolioSummary(workspace:Workspace){
  const projects=workspace.projects.filter(p=>!p.demo).map(projectSummary);
  return {projects,total:projects.reduce((n,p)=>n+p.total,0),approved:projects.reduce((n,p)=>n+p.approved,0),
    ordered:projects.reduce((n,p)=>n+p.ordered,0),orderValue:projects.reduce((n,p)=>n+p.orderValue,0),
    pricedOrders:projects.reduce((n,p)=>n+p.pricedOrders,0),missingOrderValues:projects.reduce((n,p)=>n+p.missingOrderValues,0),
    withRecords:projects.filter(p=>p.hasRecords).length};
}
export const projectHref=(id:string)=>`/?project=${encodeURIComponent(id)}`;
export function updatedLabel(value:string){return value?new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Kolkata"}):"No updates yet";}
