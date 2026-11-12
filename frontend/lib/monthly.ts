export type Proof={name:string;url:string};
export type WorkEvent={id:string;date:string;actor:string;kind:string;note:string;proof:Proof[]};
export type MonthlyTask={id:string;name:string;month:string;manager:string;location:string;trade:string;target:number;unit:string;done:number;start:string;originalDue:string;due:string;status:string;events:WorkEvent[];delay?:{due:string;reason:string;help:string;proposed:string;decision:string};createdAt:string;updatedAt:string};
export const indiaToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export const overdue=(t:MonthlyTask,today=indiaToday())=>t.status!=='Completed'&&t.due<today;
export const delayRequired=(t:MonthlyTask,today=indiaToday())=>overdue(t,today)&&(!t.delay||t.delay.due!==t.due||t.delay.decision==='Rejected');
export function visibleInMonth(t:MonthlyTask,month:string){const completed=t.events.find(e=>e.kind==='Completion approved');const completedMonth=completed?new Date(completed.date).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}).slice(0,7):'';return t.month===month||(t.month<month&&(t.status!=='Completed'||completedMonth>=month));}
