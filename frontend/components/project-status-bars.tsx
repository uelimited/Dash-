import {Files, ShoppingBag, ArrowUpRight} from 'lucide-react';
import {Project, STAGES, approved, ordered, pct} from '@/lib/project';
import {tdsColors, stageColors} from '@/lib/chart-palette';

const tdsStatuses=['Approved','Approved with comments','Rejected','Not started','Under review','Revise & resubmit','In preparation','Not recorded'];

export default function ProjectStatusBars({project,section}:{project:Project;section:'tds'|'procurement'}){
  const isTds=section==='tds', total=project.items.length;
  const statuses=isTds?tdsStatuses:STAGES;
  const field=isTds?'tds':'stage';
  const completed=project.items.filter(isTds?approved:ordered).length;
  const Icon=isTds?Files:ShoppingBag;
  const href=`/${section}?project=${encodeURIComponent(project.id)}`;
  return <section className={`project-status-panel ${section}`} aria-label={`${project.name} ${isTds?'TDS status':'Procurement status'}`}>
    <div className="project-status-heading"><h3><Icon size={15}/>{isTds?'TDS':'Procurement'}</h3><a href={href} aria-label={`Open ${project.name} ${isTds?'TDS':'procurement'} register`}><ArrowUpRight size={15}/></a></div>
    <div className="project-status-summary"><strong>{total?`${pct(completed,total)}%`:'—'}</strong><span>{isTds?'approved':'ordered'}<small>{completed} of {total} records</small></span></div>
    <div className="project-status-list">{statuses.map((status,index)=>{
      const count=project.items.filter(row=>row[field]===status).length;
      const color=isTds?tdsColors[status]:stageColors[index];
      return <a key={status} className="project-status-row" href={`${href}&status=${encodeURIComponent(status)}`} aria-label={`${isTds?'TDS':'Procurement'} ${status}: ${count} of ${total}`}>
        <span className="project-status-label"><i style={{background:color}}/>{status}</span><b>{count}</b>
        <span className="project-status-track" aria-hidden="true"><i style={{width:`${total?count/total*100:0}%`,background:color}}/></span>
      </a>;
    })}</div>
    <small className="project-status-note">{!total?'No records yet':isTds?'Includes approvals with comments':'Ordered includes LOI, PO & delivered'}</small>
  </section>;
}
