import { Row, TDS, STAGES, approved, ordered, hasBudget, hasOrderValue, variance, sum } from "./project";
import { comparableOrder } from "./overview";

export type TrackerSection="tds"|"procurement";
export type TrackerFilters={trade:string;status:string;workStage:string;budget:string;search:string};
export const defaultTrackerFilters:TrackerFilters={trade:"All trades",status:"All statuses",workStage:"All work stages",budget:"All budgets",search:""};
export const WORK_STAGES=["All work stages","First fix","Equipment","Second fix","Final fix","Testing","Unclassified"];
export const BUDGET_FILTERS=["All budgets","With budget & order value","Over budget","Within budget","Budget missing","Order value missing"];

export function filterTracker(rows:Row[],section:TrackerSection,f:TrackerFilters,ignore:{trade?:boolean;status?:boolean;budget?:boolean}={}) {
  const query=f.search.trim().toLowerCase();
  return rows.filter(r=>
    (ignore.trade||f.trade==="All trades"||r.trade===f.trade)&&
    (f.workStage==="All work stages"||r.group===f.workStage)&&
    (!query||Object.values(r).filter(v=>["string","number"].includes(typeof v)).join(" ").toLowerCase().includes(query))&&
    (ignore.status||f.status==="All statuses"||(f.status==="All approvals"?approved(r):f.status==="Ordered"?ordered(r):r[section==="tds"?"tds":"stage"]===f.status))&&
    (section==="tds"||ignore.budget||f.budget==="All budgets"||(f.budget==="Budget missing"?!hasBudget(r):f.budget==="Order value missing"?ordered(r)&&!hasOrderValue(r):comparableOrder(r)&&(f.budget==="With budget & order value"?true:f.budget==="Over budget"?variance(r)<0:variance(r)>=0)))
  );
}

export function trackerSummary(rows:Row[],section:TrackerSection){
  const comparable=rows.filter(comparableOrder),orders=rows.filter(ordered);
  return {total:rows.length,approved:rows.filter(approved).length,ordered:orders.length,
    statuses:(section==="tds"?TDS:STAGES).map(name=>({name,count:rows.filter(r=>r[section==="tds"?"tds":"stage"]===name).length})),
    budget:sum(comparable,"budget"),commitment:sum(comparable,"commitment"),difference:comparable.reduce((n,r)=>n+variance(r),0),
    comparable:comparable.length,over:comparable.filter(r=>variance(r)<0).length,within:comparable.filter(r=>variance(r)>=0).length,
    missing:orders.length-comparable.length,budgetMissing:rows.filter(r=>!hasBudget(r)).length,
    orderValueMissing:orders.filter(r=>!hasOrderValue(r)).length};
}

export type TrackerColumn={key:string;label:string;group:string;width:number;kind?:"status"|"date"|"month"|"number"|"money"|"notes"|"link"};
const col=(key:string,label:string,group:string,width=130,kind?:TrackerColumn["kind"]):TrackerColumn=>({key,label,group,width,kind});
export const TRACKER_COLUMNS:Record<TrackerSection,TrackerColumn[]>={
  tds:[
    col("trade","Trade","Status",110),col("tds","Approval status","Status",185,"status"),col("group","Work stage","Status",120),
    col("tdsNo","Submittal no.","Submittal",165),col("revision","Revision","Submittal",90),col("workflow","Workflow no.","Submittal",140),
    col("submitted","Submitted","Dates",130,"date"),col("submissionDue","Target submission","Dates",150,"date"),col("due","Target approval","Dates",140,"date"),col("reply","Reply received","Dates",140,"date"),
    col("front","Front / area","Material",140),col("boq","BOQ ref.","Material",110),col("qty","Quantity","Material",100,"number"),col("unit","Unit","Material",75),
    col("make","Selected make","Material",170),col("vendor","Vendor","Material",190),col("owner","Owner","Material",145),col("stage","Procurement stage","Material",170,"status"),
    col("tdsNotes","Technical remarks","Remarks",340,"notes"),col("notes","General remarks","Remarks",300,"notes"),col("url","Document","Remarks",110,"link"),col("id","Material ID","Remarks",150)
  ],
  procurement:[
    col("trade","Trade","Status",110),col("stage","Procurement stage","Status",175,"status"),col("group","Work stage","Status",120),
    col("budget","Budget (₹)","Commercial",150,"money"),col("quote","Latest quote (₹)","Commercial",155,"money"),col("commitment","LOI / PO value (₹)","Commercial",160,"money"),col("variance","Difference (₹)","Commercial",150,"money"),
    col("make","Selected make","Orders",170),col("vendor","Vendor","Orders",190),col("loi","LOI no.","Orders",140),col("po","PO no.","Orders",140),col("orderDate","Order date","Orders",130,"date"),
    col("front","Front / area","Delivery",140),col("qty","Required qty.","Delivery",110,"number"),col("unit","Unit","Delivery",75),col("delivered","Delivered qty.","Delivery",120,"number"),col("balance","Balance qty.","Delivery",115,"number"),col("required","Required at site","Delivery",145,"date"),col("delivery","Expected delivery","Delivery",150,"date"),col("leadWeeks","Lead time (weeks)","Delivery",145,"number"),
    col("boq","BOQ ref.","References",110),col("tdsNo","Submittal no.","References",165),col("tds","TDS approval","References",185,"status"),col("owner","Owner","References",145),
    col("cashMonth","Payment month","Payment plan",140,"month"),col("cashPlan","Planned payment (₹)","Payment plan",175,"money"),
    col("procurementNotes","Procurement remarks","Remarks",340,"notes"),col("notes","General remarks","Remarks",300,"notes"),col("url","Document","Remarks",110,"link"),col("id","Material ID","Remarks",150)
  ]
};

export function trackerValue(row:Row,key:string):unknown {
  if(key==="variance")return comparableOrder(row)?variance(row):null;
  if(key==="commitment")return ordered(row)&&hasOrderValue(row)?Number(row.commitment):null;
  if(key==="budget")return hasBudget(row)?Number(row.budget):null;
  if(key==="balance")return [row.qty,row.delivered].every(v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v)))?Math.max(0,Number(row.qty)-Number(row.delivered)):null;
  return row[key]??null;
}

export function sortTracker(rows:Row[],key:string,ascending:boolean,section:TrackerSection){
  const numeric=["money","number"].includes(TRACKER_COLUMNS[section].find(c=>c.key===key)?.kind||"");
  return [...rows].sort((a,b)=>{
    const x=trackerValue(a,key),y=trackerValue(b,key),empty=(v:unknown)=>v===null||v===undefined||v==="";
    if(empty(x)||empty(y))return empty(x)===empty(y)?0:empty(x)?1:-1;
    return (numeric?Number(x)-Number(y):String(x).localeCompare(String(y),undefined,{numeric:true}))*(ascending?1:-1);
  });
}
