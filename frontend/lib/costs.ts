import { Project, Row, monthsBetween, sum } from "./project";

export function recurringTotals(row: Row, asOf: string) {
  const months = monthsBetween(row.start, row.end);
  const elapsed = months.filter(m => m <= asOf.slice(0,7)).length;
  const amount = Number(row.amount) || 0;
  return {soFar:elapsed*amount,remaining:(months.length-elapsed)*amount,total:months.length*amount,elapsed,months:months.length};
}

export function recurringRows(p:Project):Row[] {
  const rows: Row[] = p.recurring.map(r=>({...r,description:r.description||r.category||""}));
  if (p.monthlyAllowance) rows.push({id:"project-allowance",name:"Monthly allowance",description:"Project allowance",category:"Allowance",amount:p.monthlyAllowance,start:p.start.slice(0,7),end:p.end.slice(0,7)});
  return rows.map(r=>({...r,...recurringTotals(r,p.asOf)}));
}

export function costSummary(p:Project){
  const recurring=recurringRows(p);
  const actual=p.expenses.filter(r=>r.date<=p.asOf);
  return {recurring,monthly:sum(recurring,"amount"),soFar:sum(recurring,"soFar"),remaining:sum(recurring,"remaining"),total:sum(recurring,"total"),actual:sum(actual,"amount"),procurement:sum(actual.filter(r=>r.category==="Procurement"),"amount"),other:sum(actual.filter(r=>r.category!=="Procurement"),"amount")};
}
