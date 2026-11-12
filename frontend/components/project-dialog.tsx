"use client";
import {useEffect,useRef,useState} from 'react';
import {workspaceRequest} from '@/lib/local-workspace';

export default function ProjectDialog({onClose}:{onClose:()=>void}){
  const [name,setName]=useState(''),[code,setCode]=useState(''),[location,setLocation]=useState('');
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function save(){
    setSaving(true);setError('');
    try{
      const response=await workspaceRequest({method:'POST',body:JSON.stringify({name,code,location})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      onClose();
    }catch(e){setError(e instanceof Error?e.message:'Project could not be added.');}finally{setSaving(false);}
  }
  return <dialog ref={dialog} className="project-dialog" onCancel={e=>{e.preventDefault();if(!saving)onClose();}} aria-labelledby="project-dialog-title">
    <form onSubmit={e=>{e.preventDefault();void save();}}><h2 id="project-dialog-title">Add project</h2>
      <label>Project name<input required maxLength={250} autoFocus value={name} onChange={e=>setName(e.target.value)} disabled={saving}/></label>
      <label>Project code<input required maxLength={100} value={code} onChange={e=>setCode(e.target.value)} disabled={saving}/></label>
      <label>Location<input value={location} onChange={e=>setLocation(e.target.value)} disabled={saving}/></label>
      {error&&<p role="alert" className="form-error">{error}</p>}
      <div className="project-dialog-actions"><button type="button" className="btn" disabled={saving} onClick={onClose}>Cancel</button><button className="btn primary" disabled={saving}>{saving?'Adding…':'Add project'}</button></div>
    </form>
  </dialog>;
}
