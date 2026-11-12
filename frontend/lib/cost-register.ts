import {Project,Row,monthly,sum} from "./project";
import {recurringRows} from "./costs";
export type CostRegister="expenses"|"recurring"|"bills";
export type CostFilters={search:string;category:string;period:string;billingDate:"date"|"receivedDate"};
export const defaultCostFilters:CostFilters={search:"",category:"All categories",period:"To date",billingDate:"date"};
export function costDashboardData(p:Project){
  const paid=p.expenses.filter(r=>r.date&&r.date<=p.asOf);
  const receipts=p.bills.filter(r=>r.receivedDate&&r.receivedDate<=p.asOf);
  const categories=[...new Set(paid.map(r=>r.category||"Other"))].map(name=>({name,value:sum(paid.filter(r=>(r.category||"Other")===name),"amount")})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
  return {paid:sum(paid,"amount"),procurement:sum(paid.filter(r=>r.category==="Procurement"),"amount"),other:sum(paid.filter(r=>r.category!=="Procurement"),"amount"),received:sum(receipts,"received"),categories,months:monthly(p).filter(r=>r.month<=p.asOf.slice(0,7)).slice(-6)};
}
export function costRows(p:Project,register:CostRegister,f:CostFilters):Row[]{
  const rows=register==="recurring"?recurringRows(p):p[register];
  const query=f.search.trim().toLowerCase();
  const dateKey=register==="bills"?f.billingDate:"date";
  return rows.filter(r=>{
    if(query&&!Object.values(r).some(value=>(typeof value==="string"||typeof value==="number")&&String(value).toLowerCase().includes(query)))return false;
    if(register!=="bills"&&f.category!=="All categories"&&(f.category==="Other costs"?r.category==="Procurement":(r.category||"Other")!==f.category))return false;
    if(register==="recurring"){
      const state=r.start>p.asOf.slice(0,7)?"Upcoming":r.end<p.asOf.slice(0,7)?"Ended":"Active";
      return f.period==="To date"||f.period==="All records"||f.period===state;
    }
    if(f.period==="All records")return true;
    if(!r[dateKey]||r[dateKey]>p.asOf)return false;
    return f.period==="To date"||r[dateKey].slice(0,7)===f.period;
  });
}
export function costMonths(p:Project,register:CostRegister,billingDate:CostFilters["billingDate"]){
  if(register==="recurring")return [];
  const dateKey=register==="bills"?billingDate:"date";
  return [...new Set(p[register].filter(r=>r[dateKey]&&r[dateKey]<=p.asOf).map(r=>String(r[dateKey]).slice(0,7)))].sort().reverse();
}
export function receivedThrough(row:Row,asOf:string){return row.receivedDate&&row.receivedDate<=asOf?Number(row.received)||0:0;}
