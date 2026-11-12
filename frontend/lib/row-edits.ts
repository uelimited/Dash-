import { fields, validate } from "./fields";
import { Row, Workspace } from "./project";
import { equalValue, OWNED_FIELDS, RegisterSection, sectionLabel } from "./register-schema";
export type RowEdit = {projectId:string;section:RegisterSection;id:string;isNew?:boolean;values:Record<string,unknown>;expected:Record<string,unknown>};
export class RowEditError extends Error { constructor(message:string,public status=400){super(message);} }
export function emptyRegisterRow(section:RegisterSection,id:string):Row {
  return section === "design" ? {id,name:"",trade:"HVAC",kind:"Shop drawing",revision:"R0",status:"Not started",clashes:0} : {id,name:"",trade:"HVAC",group:"First fix",tds:"Not started",stage:"Not started",revision:"R0",qty:null,delivered:0,budget:null,quote:null,commitment:null,revisions:[]};
}
export function applyRowEdit(workspace:Workspace,edit:RowEdit,now:string,eventId:string):Workspace {
  const next=structuredClone(workspace),p=next.projects.find(p=>p.id===edit.projectId);
  if(!p)throw new RowEditError("Project not found.",404);
  const rows=edit.section==="design"?p.design:p.items,existing=rows.find(r=>r.id===edit.id);
  if(edit.isNew&&existing)throw new RowEditError("This row already exists. Reload the register before adding it again.",409);
  if(!edit.isNew&&!existing)throw new RowEditError("This row no longer exists. Your changes have not been saved.",409);
  if(edit.isNew&&rows.length>=10000)throw new RowEditError("This register has reached its row limit.");
  const fs=fields(edit.section,p),allowed=OWNED_FIELDS[edit.section];
  for(const [key,value] of Object.entries(edit.values)){
    if(!allowed.includes(key))throw new RowEditError("This edit includes a field from another register.");
    const field=fs.find(f=>f.key===key);
    if(!field)throw new RowEditError("Unsupported field.");
    if(value!==null && (field.type==="number" ? typeof value!=="number"||!Number.isFinite(value) : typeof value!=="string"))throw new RowEditError(`${field.label} has an invalid value.`);
    if(typeof value==="string"&&value.length>10000)throw new RowEditError(`${field.label} is too long.`);
    if(existing&&(!Object.hasOwn(edit.expected,key)||!equalValue(existing[key],edit.expected[key])))throw new RowEditError(`${field.label} changed since you opened this row. Your draft is still here. Reload the latest row before saving.`,409);
  }
  const record={...(existing||emptyRegisterRow(edit.section,edit.id)),...edit.values};
  const validation=validate(record,fs,edit.section==="design"?"design":"items");
  if(validation)throw new RowEditError(validation);
  const refKey=edit.section==="design"?"drawingNo":"tdsNo";
  if((edit.isNew||Object.hasOwn(edit.values,refKey)||Object.hasOwn(edit.values,"trade"))&&record[refKey]&&rows.some(r=>r.id!==record.id&&r.trade===record.trade&&String(r[refKey]||"").trim().toLowerCase()===String(record[refKey]).trim().toLowerCase()))throw new RowEditError(`This ${edit.section==="design"?"drawing":"submittal"} number already exists in ${record.trade}. Edit the existing row instead.`);
  const changes=Object.entries(edit.values).filter(([key,value])=>!equalValue(existing?.[key],value)).map(([field,after])=>({field,before:existing?.[field]??null,after}));
  if(!changes.length&&!edit.isNew)return next;
  record.manualFields={...(record.manualFields||{})};
  for(const change of changes)record.manualFields[change.field]=eventId;
  record.changeHistory=[...(record.changeHistory||[]),{id:eventId,date:now,section:edit.section,source:"Manual edit",action:edit.isNew?"Added row":"Updated row",changes}];
  if(edit.section==="tds"&&changes.some(c=>["revision","tds","submitted","reply"].includes(c.field)))record.revisions=[...(record.revisions||[]),{id:eventId,revision:record.revision,status:record.tds,submitted:record.submitted||"",reply:record.reply||"",source:"Manual edit"}];
  if(existing)rows[rows.indexOf(existing)]=record;else rows.push(record);
  p.history=[{id:eventId,name:`${sectionLabel(edit.section)} · ${record.name} ${edit.isNew?"added":"updated"}`,date:now},...p.history].slice(0,1000);
  return next;
}
