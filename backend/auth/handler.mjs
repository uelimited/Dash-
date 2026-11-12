import {requireDelivery,deliveryMessage} from './delivery.mjs';
import {getAuth,getAdmin,getViewer,consumeThrottle} from './auth.mjs';
import {authSettings,mailReady,isInvited} from './config.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

// Dependencies are injectable only by local tests, never through HTTP or environment switches.
export function makeAuthHandler({getAuth:getAuthInstance=getAuth,getAdmin:getAdminSession=getAdmin,getViewer:getViewerSession=getViewer,consumeThrottle:throttle=consumeThrottle,authSettings:settingsProvider=authSettings,mailReady:isMailReady=mailReady}={}){
return async function handleAuth(request){
  const settings=settingsProvider(),url=new URL(request.url);
  const action=url.pathname.replace('/api/auth/','');
  const origin=request.headers.get('origin');
  const allowedOrigins=settings.allowedOrigins||[settings.origin];
  if(!allowedOrigins.includes(url.origin))return json({error:'Request origin is not allowed.'},403);
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&!allowedOrigins.includes(origin)))return json({error:'Request origin is not allowed.'},403);
  if(request.method==='GET'&&action==='access'){
    try{const session=await getViewerSession(request.headers),admin=await getAdminSession(request.headers);return json({canView:!settings.requireLogin||!!session,canEdit:!!admin,email:session?.user.email||admin?.user.email||null,mailReady:isMailReady(settings),requireLogin:!!settings.requireLogin});}
    catch{return json({canView:!settings.requireLogin,canEdit:false,email:null,mailReady:isMailReady(settings),requireLogin:!!settings.requireLogin});}
  }
  const allowed=['email-otp/send-verification-otp','sign-in/email-otp','sign-out'];
  if(request.method!=='POST'||!allowed.includes(action))return json({error:'Not found.'},404);
  if(!allowedOrigins.includes(origin)||request.headers.get('x-dash-request')!=='1'||!request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid request.'},403);
  try{
    const reader=request.body?.getReader();let size=0;const chunks=[];
    if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return json({error:'Request is too large.'},413);}chunks.push(value);}}
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
    const email=String(body.email||'').trim().toLowerCase();
    if(action!=='sign-out'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Enter a valid email address.'},400);
    if(action==='email-otp/send-verification-otp'){
      if(!isMailReady(settings))return json({error:'OTP email delivery is not connected yet. Ask the administrator to complete EmailJS setup.'},503);
      if(!await throttle('otp-send',60,1))return json({error:'Please wait 60 seconds before requesting another code.'},429);
      if(!isInvited(settings,email))return json({ok:true});
    }
    if(action==='sign-in/email-otp'){
      if(!await throttle('otp-verify',300,10))return json({error:'Too many attempts. Wait 5 minutes and request a new code.'},429);
      if(!isInvited(settings,email)||!/^\d{6}$/.test(String(body.otp||'')))return json({error:'The code is invalid or expired.'},401);
    }
    const headers=new Headers(request.headers);headers.set('x-dash-remember',body.rememberMe===true?'1':'0');
    // Strip fields that could otherwise change identity, roles, or auth settings.
    const data=action==='sign-out'?{}:action==='sign-in/email-otp'?{email,otp:body.otp}:{email,type:'sign-in'};
    const dispatch=()=>getAuthInstance().handler(new Request(`${settings.origin}/api/auth/${action}`,{method:'POST',headers,body:JSON.stringify(data)}));
    const response=await (action==='email-otp/send-verification-otp'?requireDelivery(dispatch):dispatch());
    if(!response.ok)return json({error:response.status===429?'Too many attempts. Please try again shortly.':action==='sign-in/email-otp'?'The code is invalid or expired. Request a new code if needed.':'The email could not be sent. Ask the administrator to check the EmailJS connection and template.'},response.status===429?429:action==='sign-in/email-otp'?401:503);
    const output=json({ok:true});
    for(let cookie of response.headers.getSetCookie()){
      if(action==='sign-in/email-otp'&&body.rememberMe!==true)cookie=cookie.replace(/;\s*Max-Age=[^;]*/gi,'').replace(/;\s*Expires=[^;]*/gi,'');
      output.headers.append('Set-Cookie',cookie);
    }
    return output;
  }catch(error){const deliveryError=deliveryMessage(error);if(deliveryError)return json({error:deliveryError},503);return json({error:error instanceof SyntaxError?'Invalid request.':'Sign-in is unavailable. Please try again or ask the administrator to check the email connection.'},error instanceof SyntaxError?400:503);}
}
}
export const handleAuth=makeAuthHandler();
