import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import mysql from 'mysql2';
import {betterAuth} from 'better-auth';
import {readConfig} from '../mysql/config.mjs';
import {authSettings} from './config.mjs';
import {authOptions} from './auth.mjs';
const root=process.cwd(),origin='http://localhost:3317',id=randomUUID(),email=`viewer-${id}@example.invalid`;
const settings={...authSettings(),origin,allowedOrigins:[origin],viewerEmails:[email],requireLogin:true};
const pool=mysql.createPool({...readConfig(),connectionLimit:2}),db=pool.promise();
let code,server;
try{
 await db.execute('INSERT INTO dash_auth_user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,FALSE,NOW(),NOW())',[id,'Private hosting test',email]);
 const auth=betterAuth(authOptions(pool,settings,async(_email,otp)=>{code=otp;}));
 await auth.api.sendVerificationOTP({body:{email,type:'sign-in'}});
 const login=await auth.handler(new Request(origin+'/api/auth/sign-in/email-otp',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,otp:code})}));
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3317'],{cwd:path.join(root,'frontend'),env:{...process.env,NODE_ENV:'production',AUTH_ORIGIN:origin,VIEWER_EMAILS:email},stdio:'ignore',windowsHide:true});
 let ready=false;
 for(let i=0;i<60;i++){try{if((await fetch(origin+'/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Isolated production server must start');
 assert.equal((await fetch(origin+'/api/workspace')).status,401,'Anonymous reads must be denied');
 assert.equal((await fetch(origin+'/api/auth/access').then(r=>r.json())).canView,false);
 const access=await fetch(origin+'/api/auth/access',{headers:{Cookie:cookie}}).then(r=>r.json());
 assert.equal(access.canView,true);assert.equal(access.canEdit,false);
 const records=await fetch(origin+'/api/workspace',{headers:{Cookie:cookie}});
 assert.equal(records.status,200);assert.equal((await records.json()).storage,'mysql');
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await fetch(origin+'/api/workspace',{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-Dash-Request':'1'},body:'{}'})).status,401,'Viewers must not write');
 assert.equal((await fetch(origin+'/api/workspace',{headers:{Cookie:cookie,Origin:'https://unrelated.example'}})).status,403);
 const logout=await fetch(origin+'/api/auth/sign-out',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-Dash-Request':'1'},body:'{}'});
 assert.equal(logout.status,200);
 assert.equal((await fetch(origin+'/api/workspace',{headers:{Cookie:cookie}})).status,401);
 console.log('PASS: production blocks anonymous reads, invited viewer can read MySQL, all viewer writes denied, cross-origin rejection and logout revocation. No real email sent or project records changed.');
}finally{
 if(server){server.kill();await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});}
 await db.execute('DELETE FROM dash_auth_session WHERE userId=?',[id]);
 await db.execute('DELETE FROM dash_auth_account WHERE userId=?',[id]);
 await db.execute('DELETE FROM dash_auth_user WHERE id=?',[id]);
 await db.execute('DELETE FROM dash_auth_verification WHERE identifier LIKE ?',['%'+email]);
 await pool.promise().end();
}
