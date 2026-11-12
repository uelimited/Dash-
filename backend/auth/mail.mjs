import {mailReady,isInvited} from './config.mjs';
export async function sendAdminOTP(settings,email,otp,send=fetch){
 if(!isInvited(settings,email))throw new Error('ADMIN_ONLY');
 if(!mailReady(settings))throw new Error('MAIL_NOT_CONFIGURED');
 const time=new Date(Date.now()+5*60*1000).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'medium'})+' IST';
 const response=await send('https://api.emailjs.com/api/v1.0/email/send',{
  method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},
  body:JSON.stringify({service_id:settings.emailjsServiceId,template_id:settings.emailjsTemplateId,user_id:settings.emailjsPublicKey,
   ...(settings.emailjsPrivateKey?{accessToken:settings.emailjsPrivateKey}:{}),
   template_params:{to_email:email,email:email,to_name:email===settings.adminEmail?'Dash administrator':'Dash teammate',otp_code:otp,passcode:otp,time,expiry_minutes:5,app_name:'Dash'}})
 });
 // Provider responses may contain account details. Never return them to the browser or log an OTP.
 if(!response.ok){
  const detail=(await response.text()).toLowerCase();
  if(detail.includes('non-browser')&&detail.includes('disabled'))throw new Error('EMAILJS_SERVER_DISABLED');
  if(detail.includes('private key')||detail.includes('accesstoken'))throw new Error('EMAILJS_PRIVATE_KEY_REQUIRED');
  if(response.status===429||detail.includes('quota'))throw new Error('EMAILJS_QUOTA');
  if(response.status===400||response.status===422)throw new Error('EMAILJS_CONFIGURATION');
  throw new Error('MAIL_DELIVERY_FAILED');
 }
}
