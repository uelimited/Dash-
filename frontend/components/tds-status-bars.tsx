import type {Project} from '@/lib/project';

const statuses=[
  {name:'Approved',color:'#299d8a'},
  {name:'Approved with comments',color:'#3979ed'},
  {name:'Rejected',color:'#d36868'},
  {name:'Not started',color:'#a2aab8'},
  {name:'Under review',color:'#9272ce'},
  {name:'Revise & resubmit',color:'#d99a4d'},
  {name:'In preparation',color:'#6d9db4'},
  {name:'Not recorded',color:'#c3cad3'},
];
export default function TdsStatusBars({project}:{project:Project}){
  const total=project.items.length;
  return <div className="project-tds-bars" aria-label={`${project.name} TDS status`}>
    <div className="tds-bars-heading"><strong>TDS status</strong><span>{total} records</span></div>
    {statuses.map((status,index)=>{
      const count=project.items.filter(row=>row.tds===status.name).length;
      if(index>3&&!count)return null;
      return <a key={status.name} className="tds-horizontal-row" href={`/tds?project=${encodeURIComponent(project.id)}&status=${encodeURIComponent(status.name)}`} aria-label={`${status.name}: ${count} of ${total}`}>
        <span>{status.name}</span><span className="tds-horizontal-track"><i style={{width:`${total?count/total*100:0}%`,background:status.color}}/></span><b>{count}</b>
      </a>;
    })}
    {!total&&<small>No TDS records yet.</small>}
  </div>;
}
