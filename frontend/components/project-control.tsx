"use client";
import {workspaceRequest,workspaceEvent,SavedWorkspace} from '@/lib/local-workspace';
import React,{useEffect,useRef,useState} from 'react';
import {Workspace} from '@/lib/project';
import Dashboard from './dashboard-shell';
import Portfolio from './portfolio';
import DatabaseStart from './database-start';
import type {View} from './pages/types';

export default function ProjectControl({view='overview'}:{view?:View}){
  const [workspace,setWorkspace]=useState<Workspace>({projects:[]});
  const [selected,setSelected]=useState<string|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[needsImport,setNeedsImport]=useState(false);
  const version=useRef(-1);
  useEffect(()=>{
    let active=true,pending=false;
    setSelected(new URLSearchParams(window.location.search).get('project'));
    function receive(data:SavedWorkspace){
      if(!active||data.version<version.current)return;
      if(data.version!==version.current){version.current=data.version;setWorkspace(data.workspace);}
      setNeedsImport(!data.initialized);setReady(true);setError('');
    }
    async function refresh(){
      if(pending||document.hidden)return;
      pending=true;
      try{const response=await workspaceRequest();const data=await response.json();if(!response.ok)throw new Error(data.error);receive(data);}
      catch(e){if(active)setError(e instanceof Error?e.message:'Unable to connect to MySQL.');}
      finally{pending=false;}
    }
    const changed=(event:Event)=>receive((event as CustomEvent<SavedWorkspace>).detail);
    const focused=()=>void refresh();
    window.addEventListener(workspaceEvent,changed);window.addEventListener('focus',focused);document.addEventListener('visibilitychange',focused);
    void refresh();const interval=window.setInterval(refresh,5000);
    return()=>{active=false;clearInterval(interval);window.removeEventListener(workspaceEvent,changed);window.removeEventListener('focus',focused);document.removeEventListener('visibilitychange',focused);};
  },[]);
  if(!ready)return <div className="portfolio-loading"><div className="brand"><span className="brand-mark">u</span>Project Control</div>{error?<div role="alert"><h1>Projects could not be loaded</h1><p>{error}</p><a className="btn" href="">Try again</a></div>:<p role="status">Loading your projects from MySQL…</p>}</div>;
  if(needsImport)return <DatabaseStart/>;
  if(selected&&!workspace.projects.some(p=>p.id===selected))return <div className="portfolio-loading"><h1>Project not found</h1><p>This project may have been deleted.</p><a className="btn primary" href="/">All projects</a></div>;
  return <>{error&&<div className="database-offline" role="alert">MySQL connection interrupted. Showing the last loaded records. {error}</div>}{selected?<Dashboard view={view} key={selected} projectId={selected} workspace={workspace} setWorkspace={setWorkspace} version={version}/>:<Portfolio workspace={workspace} version={version.current}/>}</>;
}
