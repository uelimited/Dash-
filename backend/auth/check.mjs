import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import mysql from 'mysql2';
import {betterAuth} from 'better-auth';
import {readConfig} from '../mysql/config.mjs';
import {authOptions,consumeThrottle,getAdmin} from './auth.mjs';
import {authSettings} from './config.mjs';
import {makeAuthHandler} from './handler.mjs';

const suffix=randomUUID(),email=`dash-test-${suffix}@example.invalid`,userId=randomUUID(),prefix='check-'+suffix.slice(0,12);
const pool=mysql.createPool({...readConfig(),connectionLimit:4});const db=pool.promise();
const settings={...authSettings(),adminEmail:email};let code,failDelivery=false;
const options=authOptions(pool,settings,async(_email,otp)=>{if(failDelivery)throw new Error('EMAILJS_SERVER_DISABLED');code=otp;});
options.rateLimit.enabled=false; // The production database throttle is exercised separately below.
const auth=betterAuth(options);
const handle=makeAuthHandler({getAuth:()=>auth,authSettings:()=>settings,mailReady:()=>true,consumeThrottle:(key,sec,max)=>consumeThrottle(prefix+'-'+key,sec,max),getAdmin:async headers=>{
  const session=await auth.api.getSession({headers});return session?.user.email===email&&session.user.emailVerified?session:null;
}});
const origin=settings.origin;
function request(action,body={},cookie='',method='POST'){
  return new Request(`${origin}/api/auth/${action}`,{method,headers:{Origin:origin,'Content-Type':'application/json','X-Dash-Request':'1',Cookie:cookie,'User-Agent':'Dash isolated auth check'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
}
const cookies=response=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function send(){
  await db.execute('DELETE FROM dash_auth_throttle WHERE bucket=?',[prefix+'-otp-send']);
  const response=await handle(request('email-otp/send-verification-otp',{email}));
  assert.equal(response.status,200,JSON.stringify(await response.json()));assert.match(code,/^\d{6}$/);return code;
}
async function verify(otp,rememberMe=false){return handle(request('sign-in/email-otp',{email,otp,rememberMe}));}
try{
  await db.execute('INSERT INTO dash_auth_user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,FALSE,NOW(),NOW())',[userId,'Isolated auth check',email]);
  await send();
  const [stored]=await db.execute('SELECT value FROM dash_auth_verification WHERE identifier LIKE ?',['%'+email]);
  assert.equal(stored.length,1);assert.ok(!stored[0].value.includes(code),'OTP must not be stored in plain text');
  assert.equal((await handle(request('email-otp/send-verification-otp',{email}))).status,429);
  const login=await verify(code,true);assert.equal(login.status,200,JSON.stringify(await login.clone().json()));
  assert.ok(login.headers.getSetCookie().some(c=>c.includes('session_token')&&/Max-Age=2592000/i.test(c)&&/HttpOnly/i.test(c)));
  let cookie=cookies(login);
  assert.equal((await handle(request('access',{},cookie,'GET')).then(r=>r.json())).canEdit,true);
  const session=await auth.api.getSession({headers:new Headers({Cookie:cookie})});
  assert.ok(session.session.expiresAt.getTime()-Date.now()>29*86400000,'Remembered session must last 30 days');
  assert.equal(await getAdmin(new Headers({Cookie:cookie})),null,'A valid session for another email must not grant admin access');
  assert.equal((await verify(code,true)).status,401,'OTP replay must fail');
  const baseline=await fetch(origin+'/api/workspace').then(r=>r.json());
  assert.equal(baseline.storage,'mysql');
  for(const method of ['POST','PUT','PATCH','DELETE']){
    const response=await fetch(origin+'/api/workspace',{method,headers:{Origin:origin,'Content-Type':'application/json','X-Dash-Request':'1'},body:'{}'});
    assert.equal(response.status,401,'Anonymous '+method+' must be blocked');
  }
  const forbidden=await fetch(origin+'/api/workspace',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Dash-Request':'1',Cookie:cookie},body:JSON.stringify({name:'Must not exist',code:'DENIED'})});
  assert.equal(forbidden.status,401,'Other verified accounts cannot write');
  assert.equal((await handle(request('sign-up/email',{email,password:'not-used'}))).status,404);
  const cross=request('sign-out',{},cookie);cross.headers.set('Origin','https://unrelated.example');assert.equal((await handle(cross)).status,403);
  assert.equal((await handle(request('sign-out',{},cookie))).status,200);
  assert.equal((await handle(request('access',{},cookie,'GET')).then(r=>r.json())).canEdit,false,'Logout must revoke server session');
  await send();const temporary=await verify(code,false);assert.equal(temporary.status,200);
  assert.ok(temporary.headers.getSetCookie().filter(c=>c.includes('session_token')).every(c=>!/Max-Age|Expires=/i.test(c)));
  const short=await auth.api.getSession({headers:new Headers({Cookie:cookies(temporary)})});
  assert.ok(short.session.expiresAt.getTime()-Date.now()<=8*3600000+1000,'Non-remembered sessions must expire within 8 hours');
  await send();await db.execute('UPDATE dash_auth_verification SET expiresAt=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE identifier LIKE ?',['%'+email]);
  assert.equal((await verify(code)).status,401,'Expired OTP must fail');
  await send();const valid=code,wrong=valid==='000000'?'999999':'000000';
  for(let i=0;i<3;i++)assert.equal((await verify(wrong)).status,401);
  assert.equal((await verify(valid)).status,401,'Code must be invalid after three wrong attempts');
  await db.execute('DELETE FROM dash_auth_throttle WHERE bucket=?',[prefix+'-otp-verify']);
  await send();const concurrent=await Promise.all([verify(code),verify(code)]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,401],'Only one concurrent redemption may succeed');
  failDelivery=true;
  await db.execute('DELETE FROM dash_auth_throttle WHERE bucket=?',[prefix+'-otp-send']);
  const deliveryFailed=await handle(request('email-otp/send-verification-otp',{email}));
  assert.equal(deliveryFailed.status,503,'Failed email delivery must not report success');
  assert.match((await deliveryFailed.json()).error,/non-browser/);
  const after=await fetch(origin+'/api/workspace').then(r=>r.json());assert.deepEqual(after,baseline,'Authentication checks must not change project records');
  console.log('PASS: hashed single-use OTP, expiry, retry/resend limits, concurrent redemption, 30-day/session-only cookies, logout, no signup, cross-origin rejection, and anonymous/non-admin write protection.');
  console.log('No real email was sent: OTP delivery was simulated in memory for the temporary test account.');
}finally{
  await db.execute('DELETE FROM dash_auth_session WHERE userId=?',[userId]);
  await db.execute('DELETE FROM dash_auth_account WHERE userId=?',[userId]);
  await db.execute('DELETE FROM dash_auth_user WHERE id=?',[userId]);
  await db.execute('DELETE FROM dash_auth_verification WHERE identifier LIKE ?',['%'+email]);
  await db.execute('DELETE FROM dash_auth_throttle WHERE bucket IN (?,?)',[prefix+'-otp-send',prefix+'-otp-verify']);
  await pool.promise().end();await globalThis.dashAdminPool?.promise().end();
}
