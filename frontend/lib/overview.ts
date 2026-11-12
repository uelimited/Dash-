import { Project, Row, TDS, STAGES, approved, ordered, hasBudget, variance, sum, monthly, hasOrderValue } from "./project";

export const comparableOrder = (r:Row) => ordered(r) && hasBudget(r) && hasOrderValue(r);

// All charts derive from the current registers. No separate summary data is saved.
export function overviewData(p:Project, group="All materials") {
  const items=p.items.filter(r=>group==="All materials"||r.group===group);
  const trades=[...new Set([...p.trades,...items.map(r=>r.trade)])].filter(Boolean);
  const orders=items.filter(ordered), comparable=orders.filter(comparableOrder);
  const tds=TDS.map(name=>({name,value:items.filter(r=>r.tds===name).length}));
  const stages=STAGES.map(name=>({name,value:items.filter(r=>r.stage===name).length}));
  const byTrade=trades.map(name=>{
    const rows=items.filter(r=>r.trade===name), first=rows.filter(r=>r.group==="First fix");
    const priced=rows.filter(comparableOrder);
    return {name,total:rows.length,approved:rows.filter(approved).length,ordered:rows.filter(ordered).length,
      first:{total:first.length,approved:first.filter(approved).length,ordered:first.filter(ordered).length,delivered:first.filter(r=>r.stage==="Delivered").length},
      within:priced.reduce((n,r)=>n+Math.max(0,variance(r)),0),over:priced.reduce((n,r)=>n+Math.max(0,-variance(r)),0),budget:sum(priced,"budget"),orderValue:sum(priced,"commitment"),comparable:priced.length};
  });
  return {items,tds,stages,byTrade,approved:items.filter(approved).length,ordered:orders.length,delivered:items.filter(r=>r.stage==="Delivered").length,
    committed:sum(orders.filter(hasOrderValue),"commitment"),unpriced:orders.filter(r=>!hasOrderValue(r)).length,
    budget:sum(comparable,"budget"),orderValue:sum(comparable,"commitment"),comparable:comparable.length,missingComparison:orders.length-comparable.length,
    within:comparable.filter(r=>variance(r)>=0).length,over:comparable.filter(r=>variance(r)<0).length,
    difference:comparable.reduce((n,r)=>n+variance(r),0),
    months:monthly(p).filter(r=>r.month<=p.asOf.slice(0,7)).slice(-6)};
}
