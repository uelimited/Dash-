import updates from "@/data/register-updates.json";
import projectUpdates from "@/data/project-updates.json";
import { Workspace, Project, Row } from "./project";
import { equalValue, OWNED_FIELDS, RegisterSection, sectionLabel } from "./register-schema";
export { SHARED_FIELDS, OWNED_FIELDS } from "./register-schema";

export type SourceUpdate = {
  id: string;
  section: RegisterSection;
  file: string;
  sheet: string;
  asOf: string;
  importedAt: string;
  note?: string;
  rows: { id: string; isNew?: boolean; values: Record<string, unknown>; reviewedManual?: Record<string,string> }[];
};
export function applyBatches(project: Project, batches: SourceUpdate[]): Project {
  const p = structuredClone(project);
  p.appliedUpdates ||= [];
  p.sources ||= {};
  for (const batch of batches) {
    if (p.appliedUpdates.includes(batch.id)) continue;
    const ids = new Set<string>();
    const records=batch.section==="design"?p.design:p.items;
    let preservedManualFields=0;
    for (const change of batch.rows) {
      if (ids.has(change.id)) throw new Error(`Duplicate material ID: ${change.id}`);
      ids.add(change.id);
      if (Object.keys(change.values).some(key => !OWNED_FIELDS[batch.section].includes(key))) throw new Error("Update includes fields owned by another register.");
      const existing = records.find(r => r.id === change.id);
      if (!existing && !change.isNew) throw new Error(`Unknown material ID: ${change.id}`);
      if (existing && change.isNew) throw new Error(`Material already exists: ${change.id}`);
      const item: Row = existing || (batch.section==="design"?{id:change.id,name:"",trade:"HVAC",kind:"Shop drawing",revision:"R0",status:"Not started",clashes:0}:{id:change.id,name:"",trade:"HVAC",group:"Unclassified",tds:"Not recorded",stage:"Not recorded",revision:"R0",qty:null,delivered:null,budget:null,commitment:null,quote:null,revisions:[]});
      const accepted:Record<string,unknown>={},changes:{field:string;before:unknown;after:unknown}[]=[],preserved:{field:string;kept:unknown;incoming:unknown}[]=[];
      item.manualFields={...(item.manualFields||{})};
      for(const [key,value] of Object.entries(change.values)){
        const manualToken=item.manualFields[key];
        if(manualToken&&!equalValue(value,item[key])&&change.reviewedManual?.[key]!==manualToken){
          preserved.push({field:key,kept:item[key]??null,incoming:value});preservedManualFields++;continue;
        }
        if(!equalValue(value,item[key]))changes.push({field:key,before:item[key]??null,after:value});
        accepted[key]=value;delete item.manualFields[key];
      }
      const tdsChanged=batch.section==="tds"&&changes.some(c=>["revision","tds","submitted","reply"].includes(c.field));
      Object.assign(item,accepted);
      if(changes.length||preserved.length)item.changeHistory=[...(item.changeHistory||[]),{id:batch.id+":"+item.id,date:batch.importedAt,section:batch.section,source:batch.file,action:existing?"Excel update":"Added from Excel",changes:existing?changes:[],initialBatch:existing?undefined:batch.id,preserved}];
      if(tdsChanged)item.revisions=[...(item.revisions||[]),{id:batch.id+":"+item.id,revision:item.revision,status:item.tds,submitted:item.submitted||"",reply:item.reply||"",source:batch.file}];
      if(!existing)records.push(item);
    }
    p.sources[batch.section] = { file:batch.file,sheet:batch.sheet,asOf:batch.asOf,updatedAt:batch.importedAt,rows:batch.rows.length,preservedManualFields,note:batch.note };
    p.appliedUpdates.push(batch.id);
    p.history = [{id:batch.id,name:`${sectionLabel(batch.section)} updated from ${batch.file}`,date:batch.importedAt},...p.history].slice(0,1000);
  }
  return p;
}

export type ProjectUpdate = SourceUpdate & {projectId:string};
export function applyProjectUpdates(workspace:Workspace, batches:ProjectUpdate[]):Workspace {
  return {projects:workspace.projects.map(p=>{const scoped=batches.filter(batch=>batch.projectId===p.id);return scoped.length?applyBatches(p,scoped):p;})};
}
export function applyRegisterUpdates(workspace:Workspace):Workspace {
  const legacy={projects:workspace.projects.map(p => p.id === updates.projectId ? applyBatches(p,updates.batches as SourceUpdate[]) : p)};
  return applyProjectUpdates(legacy,projectUpdates as ProjectUpdate[]);
}
