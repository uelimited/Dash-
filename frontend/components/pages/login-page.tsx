"use client";
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Mail,ShieldCheck} from 'lucide-react';
import {useAuth} from '../auth-provider';
export default function LoginPage(){
  const {email:signedInEmail,requireLogin,mailReady,loading}=useAuth();
  const [email,setEmail]=useState(''),[otp,setOtp]=useState(''),[remember,setRemember]=useState(false),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cooldown,setCooldown]=useState(0);
  const [sending,setSending]=useState(false);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  async function call(path:string,body:unknown){
    const response=await fetch('/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Dash-Request':'1'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Sign-in could not be completed.'),{status:response.status});
  }
  function enterCode(){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Enter the email address that received your code.');return;}
    setEmail(email.trim());setSent(true);setError('');
  }
  async function send(){
    if(busy)return;
    setSent(true);setSending(true);setBusy(true);setOtp('');setError('');
    try{await call('email-otp/send-verification-otp',{email});setCooldown(60);}
    catch(e){if((e as Error&{status?:number}).status===429){setCooldown(60);setError('Enter the code you already received. Please wait before requesting another code.');}else setError((e as Error).message);}
    finally{setSending(false);setBusy(false);}
  }
  async function verify(){setBusy(true);setError('');try{await call('sign-in/email-otp',{email,otp,rememberMe:remember});window.location.assign('/');}catch(e){setError((e as Error).message);setBusy(false);}}
  return <main className="login-screen"><a href="/" className="login-back"><ArrowLeft size={16}/>Back to projects</a><section className="login-card"><div className="login-brand"><span className="brand-mark">u</span><span>Unique Engineers<small>Project Control</small></span></div><div className="login-symbol"><ShieldCheck size={28}/></div><p className="eyebrow">Team access</p><h1>{signedInEmail?'You’re signed in':sent?'Check your email':'Sign in to Dash'}</h1><p className="login-description">{signedInEmail?'Your session is active on this browser.':sent?'If this email is invited to Dash, you’ll receive a six-digit code. It expires in five minutes.':requireLogin?'Only invited teammates can view the dashboard. Only the administrator can add, edit or delete records.':'Sign in to make changes. Only the administrator can edit records.'}</p>
    {signedInEmail?<a className="btn primary" href="/">Open dashboard<ArrowRight size={16}/></a>:<>
    {!loading&&!mailReady&&<div className="login-notice" role="status">Email sign-in isn’t available yet. The administrator needs to finish EmailJS setup.</div>}
    <form onSubmit={e=>{e.preventDefault();if(!busy)void(sent?verify():send());}}>
      <label>Email address<div className="login-email"><Mail size={17}/><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={sent||busy} placeholder="you@company.com"/></div></label>
      {sent&&<label>Verification code<input className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} required autoFocus disabled={busy&&!sending} placeholder="000000"/></label>}
      {sending&&<p role="status" className="login-description">Sending code…</p>}
      <label className="remember-login"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} disabled={busy}/><span>Remember me for 30 days<small>Use this on your own computer.</small></span></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="btn primary login-submit" disabled={busy||loading||(!sent&&!mailReady)}>{busy&&!sending?'Verifying…':sent?'Verify & sign in':'Email me a code'}<ArrowRight size={16}/></button>
      {!sent&&<div className="login-secondary"><button type="button" disabled={busy||loading} onClick={enterCode}>I already have a code</button></div>}
      {sent&&<div className="login-secondary"><button type="button" onClick={()=>void send()} disabled={busy||cooldown>0}>{cooldown?`Resend in ${cooldown}s`:'Resend code'}</button><button type="button" disabled={busy} onClick={()=>{setSent(false);setError('');setOtp('');}}>Use another email</button></div>}
    </form></>}
    <p className="login-footnote">Password-free sign-in · No public registration</p></section></main>;
}
