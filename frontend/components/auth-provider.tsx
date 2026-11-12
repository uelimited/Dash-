"use client";
import {createContext,useContext,useEffect,useState,useRef,useId} from 'react';
import {usePathname} from 'next/navigation';
import {UserRound,LogOut,ChevronDown} from 'lucide-react';
type Access={canView:boolean;requireLogin:boolean;canEdit:boolean;email:string|null;mailReady:boolean;loading:boolean};
const initial:Access={canView:false,requireLogin:true,canEdit:false,email:null,mailReady:false,loading:true};
const Context=createContext<Access>(initial);
export function useAuth(){return useContext(Context);}
export default function AuthProvider({children}:{children:React.ReactNode}){
  const [access,setAccess]=useState(initial);
  const pathname=usePathname();
  useEffect(()=>{if(!access.loading&&!access.canView&&pathname!=='/login')window.location.replace('/login');},[access.loading,access.canView,pathname]);
  useEffect(()=>{
    let active=true,pending=false;
    const refresh=async()=>{
      if(pending)return;pending=true;
      try{const response=await fetch('/api/auth/access',{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error();const data=await response.json();if(active)setAccess({...data,canEdit:data.canEdit===true,loading:false});}
      catch{if(active)setAccess({...initial,loading:false});}finally{pending=false;}
    };
    const focused=()=>{if(!document.hidden)void refresh();};
    void refresh();const timer=setInterval(focused,15000);
    window.addEventListener('focus',focused);window.addEventListener('dash-auth-changed',focused);document.addEventListener('visibilitychange',focused);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focused);window.removeEventListener('dash-auth-changed',focused);document.removeEventListener('visibilitychange',focused);};
  },[]);
  return <Context.Provider value={access}>{pathname==='/login'||access.canView?children:<main className="portfolio-loading"><p>Checking access…</p><a href="/login">Sign in</a></main>}</Context.Provider>;
}
export function AuthControls(){
  const {canEdit,loading,email}=useAuth();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false);
  const profile=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),logoutButton=useRef<HTMLButtonElement>(null),panelId=useId();
  useEffect(()=>{
    if(!open)return;
    logoutButton.current?.focus();
    function outside(event:PointerEvent){if(!profile.current?.contains(event.target as Node))setOpen(false);}
    function escape(event:KeyboardEvent){if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  useEffect(()=>{if(!email)setOpen(false);},[email]);
  async function logout(){
    setBusy(true);setError('');
    try{const response=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json','X-Dash-Request':'1'},body:'{}'});if(!response.ok)throw new Error();window.location.assign('/');}
    catch{setError('Logout failed. Please retry.');setBusy(false);}
  }
  return <div className="auth-controls"><span className={`access-badge ${canEdit?'is-admin':''}`}>{canEdit?'Admin':'View only'}</span>{email?<div className="profile-menu" ref={profile} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
    <button ref={trigger} type="button" className="profile-trigger" aria-label="Open profile options" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(value=>!value)}><UserRound size={19}/><ChevronDown size={12} aria-hidden="true"/></button>
    {open&&<div className="profile-dropdown" id={panelId} role="region" aria-label="Profile options"><div className="profile-identity"><strong>{canEdit?'Administrator':'Teammate'}</strong><span>{email}</span></div><button ref={logoutButton} type="button" className="profile-logout" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/>{busy?'Logging out…':'Logout'}</button>{error&&<p role="alert" className="profile-error">{error}</p>}</div>}
  </div>:<a href="/login">{loading?'Checking access…':'Sign in'}</a>}</div>;
}
