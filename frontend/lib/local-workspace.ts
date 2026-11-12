import type {Workspace} from './project';

// Retained only to recover the pre-MySQL browser records. New saves use the API.
export const storageKey='unique-engineers-project-control-v1';
export const workspaceEvent='project-workspace-updated';
export type SavedWorkspace={workspace:Workspace;version:number;initialized:boolean;storage:'mysql'};

export async function workspaceRequest(options:RequestInit={}){
  const method=options.method||'GET';
  const headers=new Headers(options.headers);
  if(method!=='GET'){headers.set('Content-Type','application/json');headers.set('X-Dash-Request','1');}
  const response=await fetch('/api/workspace',{...options,method,headers,cache:'no-store',credentials:'same-origin'});
  if(response.ok&&method!=='GET'){
    const saved=await response.clone().json() as SavedWorkspace;
    window.dispatchEvent(new CustomEvent(workspaceEvent,{detail:saved}));
  }
  return response;
}
