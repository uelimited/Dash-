import catalog from "../../frontend/data/projects.json";
import profiles from "../../frontend/data/project-details.json";
import {blankProject,makeDemo,Workspace} from "../../frontend/lib/project";
// Add missing projects by stable ID. Never rename, clear or move existing records.
// Running this on reads and writes also protects existing saved accounts and old tabs.
export function ensurePortfolio(workspace:Workspace):Workspace {
  const projects=[...workspace.projects];
  for(const entry of catalog){
    if(projects.some(p=>p.id===entry.id))continue;
    projects.push({...blankProject(entry.name,"Other"),...entry,start:"",end:"",asOf:"2026-11-03",retention:0,paymentDays:0,notes:""});
  }
  if(!projects.some(p=>p.id==="demo-tower"))projects.push(makeDemo());
  return {...workspace,projects:projects.map(project=>{
    const profile=profiles.find(entry=>entry.projectId===project.id);
    if(!profile||project.appliedUpdates?.includes(profile.id))return project;
    const p=structuredClone(project), baseline={...blankProject(),type:"Other",start:"",end:"",retention:0,paymentDays:0,notes:""};
    for(const [key,value] of Object.entries(profile.values)){
      const current=(p as any)[key],expected=(baseline as any)[key];
      if(current===""||current==null||JSON.stringify(current)===JSON.stringify(expected))(p as any)[key]=value;
    }
    p.appliedUpdates=[...(p.appliedUpdates||[]),profile.id];
    p.sources={...p.sources,project:{...profile.source,rows:1}};
    p.history=[{id:profile.id,name:"Project details added from project documents",date:profile.source.updatedAt},...p.history];
    return p;
  })};
}
