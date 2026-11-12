import {readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from 'dotenv';
export function authDirectory(){
 const cwd=process.cwd();const root=['frontend','backend'].includes(path.basename(cwd))?path.dirname(cwd):cwd;
 return path.join(root,'backend','auth');
}
export function authSettings(){
 let v={};try{v=parse(readFileSync(path.join(authDirectory(),'.env')));}catch{}
 v={...v,...process.env};
 const origin=v.AUTH_ORIGIN||'http://localhost:3001';
 const allowedOrigins=[origin];
 const u=new URL(origin);
 if(['localhost','127.0.0.1'].includes(u.hostname)){u.hostname=u.hostname==='localhost'?'127.0.0.1':'localhost';allowedOrigins.push(u.origin);}
 return {adminEmail:String(v.ADMIN_EMAIL||'').trim().toLowerCase(),viewerEmails:String(v.VIEWER_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean),requireLogin:process.env.NODE_ENV==='production'||v.REQUIRE_LOGIN==='true',secret:v.AUTH_SECRET||'',origin,allowedOrigins,emailjsServiceId:v.EMAILJS_SERVICE_ID||'',emailjsTemplateId:v.EMAILJS_TEMPLATE_ID||'',emailjsPublicKey:v.EMAILJS_PUBLIC_KEY||'',emailjsPrivateKey:v.EMAILJS_PRIVATE_KEY||''};
}
export function mailReady(s=authSettings()){return !!(s.emailjsServiceId&&s.emailjsTemplateId&&s.emailjsPublicKey);}

export function isInvited(settings,email){const normalized=String(email||'').toLowerCase();return normalized===settings.adminEmail||(settings.viewerEmails||[]).includes(normalized);}
